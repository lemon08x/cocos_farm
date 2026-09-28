import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {importPack} from './tile-art.mjs';
import {root,readJson,writeJson,fileExists,sha} from './tile-art-lib.mjs';
import {listStyles,runtimePath} from './tile-styles.mjs';

const styles=(await listStyles()).filter(s=>s.status==='ready');
if(!styles.some(s=>s.id==='pastoral'))throw new Error('必须保留默认 pastoral 风格');
const sharedDir=path.join(root,'art/scenic/shared-ui'),shared=await readJson(path.join(sharedDir,'manifest.json'));
const template=await readJson(path.join(sharedDir,'image-meta-template.json'));
const catalog=[];
const compiled=[];for(const style of styles)compiled.push({style,dir:await importPack({style:style.id})});
for(const {style,dir} of compiled){
  const manifest=await readJson(path.join(dir,'manifest.json')),packPath=runtimePath(style.id),dest=path.join(root,'assets/resources/art-packs',packPath);
  const images={};await fs.mkdir(dest,{recursive:true});
  const publishImage=async(slot,bytes,spec)=>{
    // Content-addressed files prevent a live reload from mixing old/new image revisions.
    const file=slot+'.'+sha(bytes).slice(0,16)+'.png',target=path.join(dest,file);
    if(!await fileExists(target))await fs.writeFile(target,bytes);
    images[slot]={...spec,file};
    const metaFile=target+'.meta';if(await fileExists(metaFile))return;
    const hex=sha(packPath+'/'+file),uuid=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
    const meta=JSON.parse(JSON.stringify(template).replaceAll(template.uuid,uuid));
    meta.subMetas['6c48a'].displayName=file.slice(0,-4);meta.subMetas['6c48a'].name=file.slice(0,-4);meta.userData.hasAlpha=true;
    await writeJson(metaFile,meta);
  };
  for(const a of manifest.assets)await publishImage(a.id,await fs.readFile(path.join(dir,a.file)),{width:a.width/2,height:a.height/2,anchor:a.anchor});
  for(const [slot,spec] of Object.entries(shared.images)){
    const bytes=await sharp(path.join(sharedDir,spec.file)).tint(style.palette.green).png().toBuffer();
    await publishImage(slot,bytes,{width:spec.width,height:spec.height,anchor:spec.anchor});
  }
  for(const [alias,slot] of Object.entries({'field.soil.dry':'field.dry.0','field.soil.wet':'field.wet.0','env.tree.canopy':'object.tree','env.homestead':'object.house'}))images[alias]=images[slot];
  const data={version:1,id:'scenic-tiles',styleId:style.id,name:style.name,palette:style.palette,textureFilter:style.textureFilter,images,tileVersion:manifest.spec.version,contractDigest:manifest.contractDigest};
  const revision=sha(JSON.stringify(data));
  const file=path.join(dest,'manifest.json'),tmp=path.join(dest,'manifest.next.json');await writeJson(tmp,{...data,revision});await fs.rename(tmp,file);
  catalog.push({id:style.id,name:style.name,revision});
}
const index=path.join(root,'assets/resources/art-packs/scenic-styles/index.json'),temp=index+'.next';
await writeJson(temp,{version:1,defaultStyle:'pastoral',styles:catalog});await fs.rename(temp,index);
console.log(`已发布 ${catalog.length} 个完整地图风格：${catalog.map(s=>s.name).join('、')}。在游戏设置中重新打开美术风格列表即可切换。`);
