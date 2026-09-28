import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {build} from 'esbuild';
import sharp from 'sharp';

export const root=path.resolve(import.meta.dirname,'..');
export const artDir=path.join(root,'art/scenic/tiles-v1');
export const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
export async function contract(){
  const result=await build({entryPoints:[path.join(root,'core/src/game/scene/tile-art.ts')],bundle:true,write:false,platform:'node',format:'esm'});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
export function jobsFor(m){
  const jobs=m.tileArtCatalog().map(entry=>({id:entry.id,kind:entry.layer,entry,...m.tileCanvas(entry)}));
  for(const socket of ['grass','road','river'])for(const axis of ['x','y'])jobs.push({id:`edge.${socket}.${axis}`,kind:'edge',socket,axis,width:m.TILE_ART_SPEC.edgeStrip.width,height:m.TILE_ART_SPEC.edgeStrip.height});
  jobs.push({id:'corner.grass',kind:'corner',width:m.TILE_ART_SPEC.corner.size,height:m.TILE_ART_SPEC.corner.size});
  return jobs;
}
export function contractDigest(m){return sha(JSON.stringify([m.TILE_ART_SPEC,m.TILE_EDGE_RULES,m.tileArtCatalog()]));}
export async function readJson(file){return JSON.parse(await fs.readFile(file,'utf8'));}
export async function writeJson(file,data){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');}
export async function fileExists(file){try{await fs.access(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
export function sourcePath(id,dir=artDir){if(!/^[a-z0-9][a-z0-9.-]*$/.test(id))throw new Error('素材 ID 不合法');return path.join(dir,'sources',`${id}.png`);}
export function diamondAt(c){return [[c.x,c.y-180],[c.x+300,c.y],[c.x,c.y+180],[c.x-300,c.y]];}
const points=p=>p.map(v=>v.join(',')).join(' ');
const color={grass:'#668756',road:'#bf9e6d',river:'#679cac'};
function baseControl(m,job){
  if(job.kind==='edge'){
    const opening=m.TILE_ART_SPEC.sockets[job.socket].opening,w=job.width*opening;
    return `<rect width="100%" height="100%" fill="${color.grass}"/>${w?`<rect x="${(job.width-w)/2}" width="${w}" height="${job.height}" fill="${color[job.socket]}"/>`:''}`;
  }
  if(job.kind==='corner')return `<rect width="100%" height="100%" fill="${color.grass}"/>`;
  const outlines=job.centers.map(c=>`<polygon points="${points(diamondAt(c))}" fill="${job.kind==='ground'?color.grass:'#879e76'}"/>`).join('');
  if(job.kind==='object')return outlines;
  if(job.kind==='crop')return `<polygon points="${points(diamondAt(job.centers[0]))}" fill="none" stroke="#7eab6b" stroke-width="2"/>`;
  const entry=job.entry;
  let content='';
  if(entry.family.startsWith('field'))content=`<polygon points="300,38 528,180 300,322 72,180" fill="${entry.family==='field.wet'?'#6d6047':'#a68a5e'}"/>`;
  if(entry.family==='courtyard')content='<polygon points="300,52 506,180 300,308 94,180" fill="#ad9d82"/>';
  // Constant edge-fraction ports: river mouths wider than roads; each terminates at an edge midpoint.
  for(const socket of ['river','road']){
    const edges=m.TILE_EDGES.filter(e=>entry.sockets[e]===socket);
    const opening=m.TILE_ART_SPEC.sockets[socket].opening;
    for(const e of edges){const r=m.TILE_EDGE_RULES[e],dx=r.end[0]-r.start[0],dy=r.end[1]-r.start[1],mx=(r.start[0]+r.end[0])/2,my=(r.start[1]+r.end[1])/2;
      const ax=mx-dx*opening/2,ay=my-dy*opening/2,bx=mx+dx*opening/2,by=my+dy*opening/2;
      content+=`<polygon points="${ax},${ay} ${bx},${by} ${bx+300-mx},${by+180-my} ${ax+300-mx},${ay+180-my}" fill="${color[socket]}"/>`;
    }
  }
  if(entry.family==='bridge')content+='<circle cx="300" cy="180" r="28" fill="#896e46"/>';
  return outlines+content;
}
export function templateSvg(m,job,guide=false){
  let content=baseControl(m,job);
  if(guide){
    if(job.entry){
      content+=job.centers.map(c=>`<polygon points="${points(diamondAt(c))}" fill="none" stroke="#e76559" stroke-width="3"/>`).join('');
      if(job.kind==='ground')for(const e of m.TILE_EDGES){const r=m.TILE_EDGE_RULES[e],x=(r.start[0]+r.end[0])/2,y=(r.start[1]+r.end[1])/2;content+=`<circle cx="${x}" cy="${y}" r="6" fill="#c74040"/><text x="${x}" y="${y+20}" font-size="15" text-anchor="middle" fill="#151515">${e}: ${job.entry.sockets[e]}</text>`;}
      content+=`<circle cx="${job.origin.x}" cy="${job.origin.y}" r="7" fill="#c74040"/>`;
    }else content+=`<path d="M0 ${job.height/2}H${job.width}" stroke="#c74040" stroke-width="1" stroke-dasharray="4 3"/>`;
  }
  const clip=job.kind==='ground'?`<defs><clipPath id="tile"><polygon points="300,0 600,180 300,360 0,180"/></clipPath></defs>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${job.width}" height="${job.height}" viewBox="0 0 ${job.width} ${job.height}">${clip}<g${job.kind==='ground'?' clip-path="url(#tile)"':''}>${content}</g></svg>`;
}
export function promptFor(m,job,style){
  const ports=job.entry?.sockets?m.TILE_EDGES.map(e=>`${e}=${job.entry.sockets[e]}`).join(', '):'不适用';
  return `素材 ID：${job.id}
这是一张游戏图块素材，不是完整场景、立体悬浮岛或带边框的卡片。
内容：${job.entry?.description??(job.kind==='corner'?'所有图块顶点共用的连续草地接缝小图，无主体、无边框':`${job.socket} 接口母版，${job.axis} 方向；中线代表两个图块接缝，图像两半分别属于两侧图块`)}。
输入参考：${style?style.generation.references.join('、'):'art/expansion-previews/02-district-browse.png'}（美术风格）；当前任务的 control.png（构图与比例）和 guide.png（几何说明）。
先生成草地顶点与接口母版，再生成单元。已有 sources/edge.* 和 sources/corner.grass.png 时，同时提供对应母版作为材质参考，内部材质向母版靠拢。
画布：${job.width}×${job.height}；保持参考构图比例和落点，禁止自行裁边、旋转、改变透视或添加底座。
${job.kind==='ground'?'整个菱形内部必须画满，包括道路和河流两侧草地；菱形外透明。地面没有悬空厚侧壁。':job.kind==='edge'||job.kind==='corner'?'整个矩形必须不透明；这是接缝母版，不能画可辨识的大物体或阴影。':'只画所需的作物/建筑主体，背景透明，不带草地或土壤底板。'}
四边接口：${ports}。ul 左上边、ur 右上边、lr 右下边、ll 左下边。
道路接口占边长 24%；水口占边长 40%；接口居中，接口外均为草地。道路宽度、河岸和水面必须在模板指定位置接出，不能靠近顶点。
${job.kind==='edge'?'母版中央横线不是要画的线。必须让纹理自然连续地穿过它；中央道路/河水纵向贯穿整幅图，左右区域为草地。两端不画石头、花或强阴影。':''}
风格要求：${style?style.generation.description:'统一左上光照、右下短影；柔和手绘田园风格，材质和物体比例与风格参考一致。'}
额外排除：${style?.generation.negative||'无'}。只使用本风格的 AI 接缝母版，不能混入其他风格边缘。
不得把 guide 的红线、文字、点、control 的扁平示意色块或棋盘格画入成品。不要文字、标签、UI、黑白描边或边缘暗角。
${job.kind==='ground'?'外围接缝带会由相同的 AI 接口母版统一合成，主体与装饰集中于内部；边缘不要放独特石块、花丛或深阴影。':''}
${job.kind==='crop'?'作物行间透明，各生长阶段保持相同种植区域和排列。':''}
${job.kind==='object'?`落地点在 (${job.origin.x},${job.origin.y})；建筑占地由模板中的 ${job.entry.footprint.length} 个单元限定，上方预留区用于屋顶/树冠。生成一个完整主体。`:''}
保留生成原图。输出后使用 tiles:normalize 登记，图块合成和接口替换由工具完成。机器检查只验证技术规格，美术效果由用户查看。
`;
}
export async function pixels(file){const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data,width:info.width,height:info.height};}
function sample(image,x,y){
  x=Math.max(0,Math.min(image.width-1,x));y=Math.max(0,Math.min(image.height-1,y));
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(x0+1,image.width-1),y1=Math.min(y0+1,image.height-1),fx=x-x0,fy=y-y0;
  return [0,1,2,3].map(c=>(image.data[(y0*image.width+x0)*4+c]*(1-fx)+image.data[(y0*image.width+x1)*4+c]*fx)*(1-fy)+(image.data[(y1*image.width+x0)*4+c]*(1-fx)+image.data[(y1*image.width+x1)*4+c]*fx)*fy);
}
/** Seam half-strips are sampled in a shared orientation. Opposite edges take opposite halves. */
export function edgePixel(m,strip,edge,t,depth){const rule=m.TILE_EDGE_RULES[edge];return sample(strip,t*(strip.width-1),(strip.height-1)/2+rule.side*depth);}
export function composeGround(m,job,input,masters){
  const result=Buffer.from(input.data),vertices=[[300,0],[600,180],[300,360],[0,180]];
  const {lockDepth,blendDepth}=m.TILE_ART_SPEC.edgeStrip,{lockRadius,blendRadius}=m.TILE_ART_SPEC.corner;
  for(let y=0;y<input.height;y++)for(let x=0;x<input.width;x++){
    const px=x+.5,py=y+.5,index=(y*input.width+x)*4;
    const inside=Math.abs(px-300)/300+Math.abs(py-180)/180<=1;
    if(!inside){result[index+3]=0;continue;}
    let mixed=[...result.subarray(index,index+4)];
    const candidates=[];
    for(const edge of m.TILE_EDGES){
      const r=m.TILE_EDGE_RULES[edge],dx=r.end[0]-r.start[0],dy=r.end[1]-r.start[1],len=Math.hypot(dx,dy);
      const t=((px-r.start[0])*dx+(py-r.start[1])*dy)/(len*len),depth=Math.abs(dx*(py-r.start[1])-dy*(px-r.start[0]))/len;
      if(t<0||t>1||depth>=lockDepth+blendDepth)continue;
      const weight=Math.min(1,(lockDepth+blendDepth-depth)/blendDepth),strip=masters.get(`edge.${job.entry.sockets[edge]}.${r.axis}`);
      candidates.push({weight,depth,pixel:edgePixel(m,strip,edge,t,depth)});
    }
    // Nearest edge wins: averaging intersecting strips would contaminate the shared seam near vertices.
    if(candidates.length){candidates.sort((a,b)=>a.depth-b.depth);const nearest=candidates[0];mixed=mixed.map((v,c)=>v*(1-nearest.weight)+nearest.pixel[c]*nearest.weight);}
    for(const [vx,vy] of vertices){const distance=Math.hypot(px-vx,py-vy);if(distance>=lockRadius+blendRadius)continue;
      const corner=masters.get('corner.grass'),rgb=sample(corner,px-vx+(corner.width-1)/2,py-vy+(corner.height-1)/2),w=Math.min(1,(lockRadius+blendRadius-distance)/blendRadius);
      mixed=mixed.map((v,c)=>v*(1-w)+rgb[c]*w);
    }
    for(let c=0;c<4;c++)result[index+c]=Math.round(mixed[c]);result[index+3]=255;
  }
  return result;
}
export async function validateSource(job,file){
  const meta=await sharp(file).metadata();
  if(meta.format!=='png'||meta.width!==job.width||meta.height!==job.height)throw new Error(`${job.id}: 需要 ${job.width}×${job.height} PNG；请先 normalize，不能静默裁剪或拉伸`);
  const image=await pixels(file);let painted=0,transparent=0;
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
    const a=image.data[(y*image.width+x)*4+3];if(a>16)painted++;if(a<8)transparent++;
    if((job.kind==='edge'||job.kind==='corner')&&a<250)throw new Error(`${job.id}: 接口母版必须完整不透明`);
    if(job.kind==='ground'&&Math.abs(x+.5-300)/300+Math.abs(y+.5-180)/180<.98&&a<250)throw new Error(`${job.id}: 完整地面内部存在透明缺口`);
    if(job.kind==='ground'&&Math.abs(x+.5-300)/300+Math.abs(y+.5-180)/180>1.03&&a>8)throw new Error(`${job.id}: 四边形外有绘制内容，不能把悬浮侧壁裁掉冒充合格素材`);
  }
  if(painted===0)throw new Error(`${job.id}: 图片为空`);
  if((job.kind==='crop'||job.kind==='object')&&(!meta.hasAlpha||transparent<image.width*image.height*.05))throw new Error(`${job.id}: 上层素材需要实际透明背景，不能只有 alpha 通道`);
  return image;
}
