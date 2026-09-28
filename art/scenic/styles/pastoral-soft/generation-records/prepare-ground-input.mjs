import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Technical alpha cleanup for AI ground sources. Keeps the painted interior;
// only the narrow diamond perimeter is sampled inward and the contract mask is enforced.
const [id,inputPath,outputPath,cropArg]=process.argv.slice(2);
if(!id||!inputPath||!outputPath)throw new Error('用法：node prepare-ground-input.mjs <ID> <AI原稿> <加工输出> [x,y,width,height]');
const styleDir=path.resolve(import.meta.dirname,'..');
const job=JSON.parse(await fs.readFile(path.join(styleDir,'jobs',id,'job.json'),'utf8'));
if(job.kind!=='ground')throw new Error(`${id}: 仅处理地面源图`);

let image=sharp(path.resolve(inputPath)).rotate();
if(cropArg){
  const [left,top,width,height]=cropArg.split(',').map(Number);
  if([left,top,width,height].some(v=>!Number.isInteger(v))||left<0||top<0||width<=0||height<=0)throw new Error('无效裁剪矩形');
  image=image.extract({left,top,width,height});
}
const {data,info}=await image.resize(job.width,job.height,{fit:'fill',kernel:'lanczos3'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const original=Buffer.from(data),cx=job.width/2,cy=job.height/2;
for(let y=0;y<job.height;y++)for(let x=0;x<job.width;x++){
  const i=(y*job.width+x)*4;
  const distance=Math.abs(x+.5-cx)/cx+Math.abs(y+.5-cy)/cy;
  if(distance>1){data[i+3]=0;continue;}
  if(distance>.98||original[i+3]<250){
    // Sample a couple of final-size pixels inward so the generated neon fringe
    // and low-alpha antialiasing cannot become a visible shared-edge color.
    const factor=Math.min(1,.965/Math.max(distance,.001));
    const sx=Math.max(0,Math.min(job.width-1,Math.round(cx+(x+.5-cx)*factor-.5)));
    const sy=Math.max(0,Math.min(job.height-1,Math.round(cy+(y+.5-cy)*factor-.5)));
    const from=(sy*job.width+sx)*4;
    data[i]=original[from];data[i+1]=original[from+1];data[i+2]=original[from+2];
  }
  data[i+3]=255;
}
await fs.mkdir(path.dirname(path.resolve(outputPath)),{recursive:true});
await sharp(data,{raw:{width:job.width,height:job.height,channels:4}}).png().toFile(path.resolve(outputPath));
console.log(`已按 ${id} 菱形契约处理透明区：${outputPath}`);
