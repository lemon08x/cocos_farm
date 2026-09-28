import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {contract,jobsFor,validateSource,composeGround,sourcePath} from '../../../../../tools/tile-art-lib.mjs';

// Interim materials preview: three grass variants with the real seam composition.
// This does not create or update a runtime manifest.
const styleDir=path.resolve(import.meta.dirname,'..'),outputDir=path.join(import.meta.dirname,'previews');
const m=await contract(),jobs=new Map(jobsFor(m).map(j=>[j.id,j]));
const masters=new Map();
for(const id of ['corner.grass','edge.grass.x','edge.grass.y']){
  masters.set(id,await validateSource(jobs.get(id),sourcePath(id,styleDir)));
}
const tiles=[];
for(const id of ['grass.0','grass.1','grass.2']){
  const job=jobs.get(id),raw=await validateSource(job,sourcePath(id,styleDir));
  const composed=composeGround(m,job,raw,masters);
  tiles.push(await sharp(composed,{raw:{width:job.width,height:job.height,channels:4}}).png().toBuffer());
}
await fs.mkdir(outputDir,{recursive:true});
await fs.writeFile(path.join(outputDir,'grass-single-source.png'),tiles[0]);
await sharp(tiles[0]).resize(300,180).png().toFile(path.join(outputDir,'grass-single-display.png'));

const layers=[];
for(let i=0;i<5;i++)for(let j=0;j<5;j++){
  const variant=(i*7+j*11)%3;
  layers.push({input:tiles[variant],left:1500+(i-j)*300-300,top:(i+j)*180});
}
const source=path.join(outputDir,'grass-5x5-source.png');
await sharp({create:{width:3000,height:1800,channels:4,background:'#f5f0e3'}}).composite(layers).png().toFile(source);
await sharp(source).resize(1500,900).png().toFile(path.join(outputDir,'grass-5x5-display.png'));
console.log(`已输出草地素材拼接预览（非游戏截图）：${outputDir}`);
