import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {pixels} from '../../../../../tools/tile-art-lib.mjs';

// Reproducible material color correction of generated interiors. The brush
// shapes, alpha, and topology remain the image-gen originals.
const ids=process.argv.slice(2);
if(!ids.length)throw new Error('指定素材 ID');
const dir=path.join(import.meta.dirname,'processed');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
for(const id of ids){
  const kinds=id.startsWith('bridge.')?['road','water']:id.startsWith('road.')?['road']:id.startsWith('river.')?['water']:[];
  if(!kinds.length)throw new Error(`${id}: 只处理道路、河流、桥`);
  const img=await pixels(path.join(dir,`${id}.png`)),out=Buffer.from(img.data),count=img.width*img.height;
  const weight={
    road:(r,g,b)=>clamp((r-g-8)/18,0,1)*clamp((g-b-12)/20,0,1),
    water:(r,g,b)=>clamp((b-g+30)/30,0,1)*clamp((g-r-10)/25,0,1),
  };
  const targets={road:[197,173,132],water:[108,164,165]};
  const deltas={};
  for(const kind of kinds){
    const sum=[0,0,0];let mass=0;
    for(let n=0;n<count;n++){
      const i=n*4;if(img.data[i+3]<250)continue;
      const w=weight[kind](img.data[i],img.data[i+1],img.data[i+2]);
      if(w<.8)continue;
      for(let c=0;c<3;c++)sum[c]+=img.data[i+c];mass++;
    }
    if(mass<100)throw new Error(`${id}: ${kind} 区域识别过少`);
    const mean=sum.map(v=>v/mass);
    deltas[kind]=targets[kind].map((v,c)=>clamp(v-mean[c],-55,55));
    console.log(`${id} ${kind}: mean ${mean.map(v=>v.toFixed(1)).join(',')} shift ${deltas[kind].map(v=>v.toFixed(1)).join(',')}`);
  }
  for(let n=0;n<count;n++){
    const i=n*4;if(img.data[i+3]<250)continue;
    const rgb=[img.data[i],img.data[i+1],img.data[i+2]];
    for(const kind of kinds){
      const w=weight[kind](...rgb);
      for(let c=0;c<3;c++)out[i+c]=clamp(Math.round(out[i+c]+w*deltas[kind][c]),0,255);
    }
  }
  const file=path.join(dir,`${id}-color-aligned.png`);
  await fs.writeFile(file,await sharp(out,{raw:{width:img.width,height:img.height,channels:4}}).png().toBuffer());
  console.log(file);
}
