// Reproducible image preparation for the 50 tiles-v1 jobs.
// All painted pixels originate in AI images or audited earlier AI artwork.
// Code only crops, pads, places, masks and composites them into contract canvases.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {normalize} from '../../../../tools/tile-art.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..');
const art=path.dirname(here);
const map=JSON.parse(await fs.readFile(path.join(here,'input-map.json'),'utf8'));
const catalog=JSON.parse(await fs.readFile(path.join(art,'catalog.json'),'utf8'));
const originalDir=path.join(here,'originals');
const prepDir=path.join(root,'build','tile-art-prep');
await fs.mkdir(originalDir,{recursive:true});
await fs.mkdir(prepDir,{recursive:true});

const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const model='OpenAI built-in image_gen (model not exposed)';
const exists=async p=>fs.access(p).then(()=>true,()=>false);

function centeredCrop(meta,ratio){
  // Explicit central crop of this model's near-5:3 canvas. Equal scale on both axes.
  const [num,den]=ratio===5/3?[5,3]:[10,9];
  const scale=Math.floor(Math.min(meta.width/num,meta.height/den));
  const width=num*scale,height=den*scale;
  return {left:Math.floor((meta.width-width)/2),top:Math.floor((meta.height-height)/2),width,height};
}

async function rgba(input,width,height,extract){
  let p=sharp(input);
  if(extract)p=p.extract(extract);
  return p.resize(width,height,{fit:'fill'}).ensureAlpha().raw().toBuffer();
}

const grassFallback=await sharp(path.join(art,'sources','edge.grass.x.png'))
  .resize(600,360,{fit:'cover'}).ensureAlpha().raw().toBuffer();

async function processGround(input){
  const meta=await sharp(input).metadata();
  const crop=centeredCrop(meta,5/3);
  const painted=await rgba(input,600,360,crop);
  const output=Buffer.alloc(600*360*4);
  for(let y=0;y<360;y++)for(let x=0;x<600;x++){
    const i=(y*600+x)*4;
    const inside=Math.abs(x+.5-300)/300+Math.abs(y+.5-180)/180<=1;
    if(!inside)continue;
    const a=painted[i+3]/255;
    for(let c=0;c<3;c++)output[i+c]=Math.round(painted[i+c]*a+grassFallback[i+c]*(1-a));
    output[i+3]=255;
  }
  return {bytes:await sharp(output,{raw:{width:600,height:360,channels:4}}).png().toBuffer(),process:`AI image crop ${crop.left},${crop.top},${crop.width},${crop.height}; proportional resize to 600x360; fill tiny transparent perimeter gaps with AI grass seam texture; exact diamond alpha mask`};
}

async function processCrop(input){
  const meta=await sharp(input).metadata();
  const crop=centeredCrop(meta,5/3);
  return {bytes:await sharp(input).extract(crop).resize(600,360).png().toBuffer(),process:`AI image crop ${crop.left},${crop.top},${crop.width},${crop.height}; proportional resize to 600x360; preserve generated plant alpha`};
}

async function processReuse(id,input){
  const old=await sharp(input).metadata();
  const width=id==='object.tree'?600:600,height=id==='object.tree'?720:360;
  const left=Math.floor((width-old.width)/2),top=id==='object.tree'?100:38;
  const bytes=await sharp({create:{width,height,channels:4,background:'#00000000'}})
    .composite([{input,left,top}]).png().toBuffer();
  return {bytes,process:`Preserve earlier AI artwork at original ${old.width}x${old.height}, no scaling; transparent padding to ${width}x${height}, place at (${left},${top})`};
}

async function processHouse(input){
  const meta=await sharp(input).metadata();
  const crop=centeredCrop(meta,10/9);
  const painted=await rgba(input,1200,1080,crop);
  const output=Buffer.alloc(painted.length);
  const shift=200;
  for(let y=0;y<1080-shift;y++)painted.copy(output,y*1200*4,(y+shift)*1200*4,(y+shift+1)*1200*4);
  return {bytes:await sharp(output,{raw:{width:1200,height:1080,channels:4}}).png().toBuffer(),process:`AI edit of old farmhouse; crop ${crop.left},${crop.top},${crop.width},${crop.height}; proportional resize to 1200x1080; shift 200 px upward so house foundation surrounds anchor (600,540); preserve alpha`};
}

function referencesFor(id,generated){
  const job=`art/scenic/tiles-v1/jobs/${id}/control.png`;
  const target='art/expansion-previews/02-district-browse.png';
  if(!generated)return [map.reused[id]];
  if(id==='object.house')return ['art/scenic/revision-2/sources/env-homestead.png',job];
  if(id==='crop.wheat.mature')return [target,'art/scenic/revision-2/sources/crop-wheat-growing.png','art/scenic/revision-2/sources/crop-wheat-mature.png'];
  if(id==='crop.default.mature')return [target,'art/scenic/revision-2/sources/crop-default-growing.png','art/scenic/revision-2/sources/crop-default-mature.png'];
  if(id.startsWith('grass.'))return ['art/scenic/tiles-v1/generation-records/originals/road.straight.ul-lr.png','art/scenic/tiles-v1/generation-records/originals/river.straight.ul-lr.png',job];
  if(id.startsWith('edge.grass.')||id==='corner.grass')return ['art/scenic/tiles-v1/generation-records/originals/grass.0.png','art/scenic/tiles-v1/generation-records/originals/road.straight.ul-lr.png',job];
  if(id.startsWith('field.')||id==='courtyard.0')return [target,job,'art/scenic/tiles-v1/generation-records/references/initial-grass-0.png'];
  if(id.startsWith('road.'))return [target,job,`art/scenic/tiles-v1/sources/edge.road.${['road.straight.ur-ll','road.tee.ul-ur-ll','road.turn.lr-ll','road.tee.ul-lr-ll','road.tee.ur-lr-ll','road.cross.ul-ur-lr-ll'].includes(id)?'y':'x'}.png`];
  if(id.startsWith('river.')||id.startsWith('bridge.'))return [target,job,`art/scenic/tiles-v1/sources/edge.river.${['river.straight.ur-ll','river.tee.ul-ur-ll','river.turn.lr-ll','river.tee.ul-lr-ll','river.tee.ur-lr-ll'].includes(id)?'y':'x'}.png`];
  return [target,job];
}

const requested=new Set(process.argv.slice(2));
for(const job of catalog.jobs){
  const id=job.id;
  if(requested.size&&!requested.has(id))continue;
  const generated=map.generated[id];
  const localOriginal=path.join(originalDir,`${id}.png`);
  const externalOriginal=generated?path.join(map.generatedDirectory,generated):path.join(root,map.reused[id]??'__missing__');
  const originalPath=await exists(externalOriginal)?externalOriginal:localOriginal;
  const original=await fs.readFile(originalPath);
  await fs.writeFile(localOriginal,original);
  let processed;
  if(job.kind==='edge'||job.kind==='corner'){
    // These were normalized from untouched AI originals with explicit crop already.
    const existing=JSON.parse(await fs.readFile(path.join(art,'records',`${id}.json`),'utf8'));
    processed={process:`Original AI seam; tiles:normalize crop ${existing.crop??'none'} to ${job.width}x${job.height}`};
  }else if(job.kind==='ground')processed=await processGround(original);
  else if(id==='object.house')processed=await processHouse(original);
  else if(generated)processed=await processCrop(original);
  else processed=await processReuse(id,original);
  if(processed.bytes){
    const prep=path.join(prepDir,`${id}.png`);
    await fs.writeFile(prep,processed.bytes);
    await normalize(id,prep,{generator:generated?`${model}; ${processed.process}`:`Reuse of revision-2 AI artwork; ${processed.process}`});
  }
  const record={id,method:generated?'new AI generation':'reuse and process earlier AI artwork',original:`generation-records/originals/${id}.png`,originalSha256:hash(original),previousSource:generated?null:map.reused[id],processing:processed.process,source:`sources/${id}.png`,normalizeRecord:`records/${id}.json`,promptSource:generated?'generation-records/generation-calls.json':'earlier revision-2 generation records',references:referencesFor(id,generated),generator:generated?model:'Existing revision-2 AI artwork'};
  await fs.writeFile(path.join(here,`${id}.json`),JSON.stringify(record,null,2)+'\n');
  console.log(`${id}: ${record.method}`);
}
