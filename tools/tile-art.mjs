import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {pathToFileURL} from 'node:url';
import {root,artDir,sha,contract,jobsFor,contractDigest,readJson,writeJson,fileExists,sourcePath,templateSvg,promptFor,validateSource,composeGround} from './tile-art-lib.mjs';

export async function prepare(){
  const m=await contract(),jobs=jobsFor(m),digest=contractDigest(m);
  const catalog={spec:m.TILE_ART_SPEC,edgeRules:m.TILE_EDGE_RULES,digest,jobs,technicalTemplatesOnly:true,templateHashes:[]};
  for(const job of jobs){
    const dir=path.join(artDir,'jobs',job.id);await fs.mkdir(dir,{recursive:true});
    const hashes=[];
    for(const guide of [false,true]){
      const name=guide?'guide':'control',svg=templateSvg(m,job,guide),png=await sharp(Buffer.from(svg)).png().toBuffer();
      await fs.writeFile(path.join(dir,`${name}.svg`),svg);await fs.writeFile(path.join(dir,`${name}.png`),png);hashes.push(sha(png));
    }
    await writeJson(path.join(dir,'job.json'),{...job,contractDigest:digest,templateHashes:hashes});
    catalog.templateHashes.push(...hashes);
    await fs.writeFile(path.join(dir,'prompt.txt'),promptFor(m,job));
  }
  await writeJson(path.join(artDir,'catalog.json'),catalog);
  const demo=[];
  for(let x=0;x<3;x++)for(let y=0;y<3;y++){
    const id=x===1&&y===1?'bridge.ul-lr':y===1?'road.straight.ul-lr':x===1?'river.straight.ur-ll':'grass.0';
    demo.push({input:path.join(artDir,'jobs',id,'control.png'),left:600+(x-y)*300,top:(x+y)*180});
  }
  await sharp({create:{width:1800,height:1080,channels:4,background:'#eee9dc'}}).composite(demo).png().toFile(path.join(artDir,'assembly-guide.png'));
  const cards=jobs.map(j=>`<article><img src="jobs/${j.id}/guide.png" alt="${j.id}"><h3>${j.id}</h3><p>${j.width} × ${j.height} · ${j.kind}</p><p>${j.entry?.description??'公共接缝母版'}</p><a href="jobs/${j.id}/prompt.txt">生成说明</a> · <a href="jobs/${j.id}/control.png">无标注模板</a> · <a href="jobs/${j.id}/job.json">规格</a></article>`).join('');
  await fs.writeFile(path.join(artDir,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>四边形图块素材规范 v1</title><style>body{margin:32px;background:#f4f0e6;color:#293629;font:16px/1.6 system-ui}h1{margin-bottom:4px}header{max-width:950px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}article{background:white;padding:18px;border-radius:8px}img{width:100%;height:210px;object-fit:contain;background:repeating-conic-gradient(#e4e5e3 0% 25%,#f7f7f7 0% 50%) 0/20px 20px}h3{overflow-wrap:anywhere;font-size:16px}a{color:#386a58}.note{padding:16px;background:#fff0c9}</style><header><h1>四边形图块素材规范 v1</h1><p class="note">下方全部是几何模板，不是 AI 美术成品。当前游戏尚未切换到此素材包。</p><p>完整地面 600 × 360，显示 300 × 180。四边按 ul 左上、ur 右上、lr 右下、ll 左下命名。草地边相接、路口接路口、水口接水口。道路口占边长 24%，水口占 40%。</p><p>43 张渲染素材 + 7 张共用接缝母版。作物、树木、建筑独立叠加；建筑可跨多个基础单元。<a href="SPEC.md">阅读完整规范</a></p></header><main>${cards}</main></html>`);
  console.log(`已生成 ${jobs.length} 份技术模板与说明：${path.join(artDir,'index.html')}`);
}

export async function normalize(id,input,options={}){
  const m=await contract(),job=jobsFor(m).find(j=>j.id===id);if(!job)throw new Error(`未知素材 ID：${id}`);
  if(!options.generator?.trim())throw new Error('必须用 --generator 记录生成工具/模型；不自动冒充 AI 生成来源');
  const original=await fs.readFile(path.resolve(input)),hash=sha(original),meta=await sharp(original).metadata();
  const dir=path.join(artDir,'jobs',id),jobFile=path.join(dir,'job.json');
  if(!await fileExists(jobFile))throw new Error('请先运行 tiles:prepare');
  const prepared=await readJson(jobFile);
  if(prepared.contractDigest!==contractDigest(m))throw new Error('模板已过期，请重新 prepare');
  const catalog=await readJson(path.join(artDir,'catalog.json'));
  if(catalog.templateHashes.includes(hash))throw new Error('技术模板不能登记为正式 AI 素材');
  if(meta.pages>1)throw new Error('不支持动画或多页图片');
  let pipeline=sharp(original).rotate(),width=meta.autoOrient?.width??meta.width,height=meta.autoOrient?.height??meta.height;
  if(options.crop){
    const box=options.crop.split(',').map(Number);
    if(box.length!==4||box.some(n=>!Number.isInteger(n))||box[0]<0||box[1]<0||box[2]<=0||box[3]<=0||box[0]+box[2]>width||box[1]+box[3]>height)throw new Error('--crop 必须为原图内的 x,y,width,height 整数区域');
    pipeline=pipeline.extract({left:box[0],top:box[1],width:box[2],height:box[3]});width=box[2];height=box[3];
  }
  if(width*job.height!==height*job.width)throw new Error(`比例不符：${width}×${height} → ${job.width}×${job.height}；请提供明确的 --crop，不会自动裁切或拉伸`);
  const png=await pipeline.resize(job.width,job.height,{fit:'fill'}).ensureAlpha().png().toBuffer();
  // The same template in another lossless file container must also be rejected.
  const pixels=await sharp(png).raw().toBuffer();
  for(const name of ['control','guide'])if(pixels.equals(await sharp(path.join(dir,`${name}.png`)).ensureAlpha().raw().toBuffer()))throw new Error('技术模板不能登记为正式 AI 素材');
  await validateSource(job,png);
  const rawRel=`raw/${hash}.${meta.format??'bin'}`,target=sourcePath(id);
  await fs.mkdir(path.join(artDir,'raw'),{recursive:true});await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(path.join(artDir,rawRel),original);await fs.writeFile(target,png);
  await writeJson(path.join(artDir,'records',`${id}.json`),{id,generator:options.generator,original:rawRel,originalHash:hash,sourceHash:sha(png),contractDigest:contractDigest(m),crop:options.crop??null,createdAt:new Date().toISOString()});
  console.log(`已登记 ${id}；原图及处理记录已保存`);
}

export async function importPack(){
  const m=await contract(),jobs=jobsFor(m),digest=contractDigest(m),images=new Map();
  const missing=[];for(const j of jobs)if(!await fileExists(sourcePath(j.id)))missing.push(j.id);
  if(missing.length)throw new Error(`缺少 ${missing.length} 张正式素材，未创建可用素材包：\n${missing.join('\n')}`);
  for(const job of jobs){
    const record=await readJson(path.join(artDir,'records',`${job.id}.json`)),bytes=await fs.readFile(sourcePath(job.id));
    if(record.id!==job.id||!record.generator||record.contractDigest!==digest||record.sourceHash!==sha(bytes))throw new Error(`${job.id}: 来源记录缺失、源图被修改或规格已过期，请重新 normalize`);
    if(record.original!==`raw/${record.originalHash}.${path.extname(record.original).slice(1)}`||sha(await fs.readFile(path.join(artDir,record.original)))!==record.originalHash)throw new Error(`${job.id}: 生成原图不匹配`);
    images.set(job.id,await validateSource(job,bytes));
  }
  const out=path.join(root,'build/tile-art',`${m.TILE_ART_SPEC.id}-${Date.now()}`);await fs.mkdir(out,{recursive:true});
  const assets=[];
  for(const job of jobs.filter(j=>j.entry)){
    const img=images.get(job.id),data=job.kind==='ground'?composeGround(m,job,img,images):img.data;
    await sharp(data,{raw:{width:job.width,height:job.height,channels:4}}).png().toFile(path.join(out,`${job.id}.png`));
    assets.push({...job.entry,width:job.width,height:job.height,anchor:job.anchor,anchorOrigin:'top-left',origin:job.origin,file:`${job.id}.png`});
  }
  await writeJson(path.join(out,'manifest.json'),{spec:m.TILE_ART_SPEC,contractDigest:digest,assets,activation:'staged-only'});
  console.log(`完整素材包已合成：${out}\n尚未切换游戏场景；必须先完成场景单元映射。`);
}

async function main(){
  const [command,id,input,...args]=process.argv.slice(2);
  if(command==='prepare')return prepare();
  if(command==='status'){
    const jobs=jobsFor(await contract()),found=[];for(const job of jobs)if(await fileExists(sourcePath(job.id)))found.push(job.id);
    console.log(`正式源图：${found.length}/${jobs.length}（尚未执行导入校验）\n技术模板不计入正式素材。\n目录：${artDir}`);return;
  }
  if(command==='import')return importPack();
  if(command==='normalize'){
    if(!id||!input)throw new Error('用法：tiles:normalize -- <id> <原图路径> --generator <工具/模型> [--crop x,y,w,h]');
    const options={};for(let i=0;i<args.length;i+=2){if(!['--crop','--generator'].includes(args[i])||!args[i+1])throw new Error(`未知参数或缺少值：${args[i]}`);options[args[i].slice(2)]=args[i+1];}
    return normalize(id,input,options);
  }
  throw new Error('命令：prepare | status | normalize | import');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
