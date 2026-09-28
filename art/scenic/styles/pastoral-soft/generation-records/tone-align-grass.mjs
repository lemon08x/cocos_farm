import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Narrow technical palette alignment for the three new AI grass paintings.
// This is a per-channel tonal transform, not a blur or a new texture generator.
const [inputPath,outputPath]=process.argv.slice(2);
if(!inputPath||!outputPath)throw new Error('用法：node tone-align-grass.mjs <透明地面 PNG> <输出 PNG>');
const {data,info}=await sharp(path.resolve(inputPath)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(info.width!==600||info.height!==360||info.channels!==4)throw new Error('仅接受 600×360 RGBA 地面图');
const target=[122,141,84],contrast=.75,mean=[0,0,0];let count=0;
for(let i=0;i<data.length;i+=4)if(data[i+3]>=250){for(let c=0;c<3;c++)mean[c]+=data[i+c];count++;}
if(!count)throw new Error('图片没有不透明草地');
for(let c=0;c<3;c++)mean[c]/=count;
for(let i=0;i<data.length;i+=4)if(data[i+3]>0)for(let c=0;c<3;c++){
  data[i+c]=Math.max(0,Math.min(255,Math.round(target[c]+(data[i+c]-mean[c])*contrast)));
}
await fs.mkdir(path.dirname(path.resolve(outputPath)),{recursive:true});
await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(path.resolve(outputPath));
console.log(`草地色调校准：原均值 ${mean.map(v=>v.toFixed(1)).join(',')} → 目标 ${target.join(',')}，局部对比系数 ${contrast}`);
