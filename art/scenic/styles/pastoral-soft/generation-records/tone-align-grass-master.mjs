import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Gentle technical seam calibration of newly generated grass masters.
const [id,inputPath,outputPath]=process.argv.slice(2);
if(!id||!inputPath||!outputPath)throw new Error('用法：node tone-align-grass-master.mjs <ID> <AI母版PNG> <输出PNG>');
if(!['corner.grass','edge.grass.x','edge.grass.y'].includes(id))throw new Error('仅处理草地公共母版');
const styleDir=path.resolve(import.meta.dirname,'..');
const job=JSON.parse(await fs.readFile(path.join(styleDir,'jobs',id,'job.json'),'utf8'));
const {data,info}=await sharp(path.resolve(inputPath)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(info.width!==job.width||info.height!==job.height)throw new Error('尺寸不符合技术任务');
const target=[122,141,84],contrast=.3,mean=[0,0,0],n=info.width*info.height;
for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)mean[c]+=data[i+c];
for(let c=0;c<3;c++)mean[c]/=n;
for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++){
  data[i+c]=Math.max(0,Math.min(255,Math.round(target[c]+(data[i+c]-mean[c])*contrast)));
}
await fs.mkdir(path.dirname(path.resolve(outputPath)),{recursive:true});
await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(path.resolve(outputPath));
console.log(`${id}: 草地接缝色调 ${mean.map(v=>v.toFixed(1)).join(',')} → ${target.join(',')}，局部对比系数 ${contrast}`);
