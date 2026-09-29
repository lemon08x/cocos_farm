import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {contract,jobsFor,pixels,validateSource,edgePixel,sourcePath} from '../../../../../tools/tile-art-lib.mjs';

// Smooth the AI painting into the already accepted seam masters before the
// standard composeGround() lock/blend. This changes only an interior border
// band, preserving the image-gen painting throughout the tile center.
const ids=process.argv.slice(2);
if(!ids.length)throw new Error('指定地面素材 ID');
const styleDir=path.resolve(import.meta.dirname,'..'),m=await contract();
const jobs=new Map(jobsFor(m).map(j=>[j.id,j]));
const masters=new Map();
for(const id of ['corner.grass','edge.grass.x','edge.grass.y','edge.road.x','edge.road.y','edge.river.x','edge.river.y'])
  masters.set(id,await validateSource(jobs.get(id),sourcePath(id,styleDir)));
for(const id of ids){
  const job=jobs.get(id);
  if(job?.kind!=='ground')throw new Error(`${id}: 非地面素材`);
  const processedDir=path.join(import.meta.dirname,'processed');
  const aligned=path.join(processedDir,`${id}-color-aligned.png`);
  const input=await fs.access(aligned).then(()=>aligned,()=>path.join(processedDir,`${id}.png`));
  const original=await pixels(input),data=Buffer.from(original.data);
  for(let y=0;y<job.height;y++)for(let x=0;x<job.width;x++){
    const px=x+.5,py=y+.5,index=(y*job.width+x)*4;
    if(Math.abs(px-300)/300+Math.abs(py-180)/180>1)continue;
    let closest=null;
    for(const edge of m.TILE_EDGES){
      const r=m.TILE_EDGE_RULES[edge],dx=r.end[0]-r.start[0],dy=r.end[1]-r.start[1],len=Math.hypot(dx,dy);
      const t=((px-r.start[0])*dx+(py-r.start[1])*dy)/(len*len);
      if(t<0||t>1)continue;
      const depth=Math.abs(dx*(py-r.start[1])-dy*(px-r.start[0]))/len;
      if(depth>=132||closest&&depth>=closest.depth)continue;
      closest={edge,t,depth};
    }
    if(!closest)continue;
    const {edge,t,depth}=closest,r=m.TILE_EDGE_RULES[edge];
    const master=masters.get(`edge.${job.entry.sockets[edge]}.${r.axis}`);
    const sampled=edgePixel(m,master,edge,t,Math.min(depth,16));
    let w=depth<=24?1:(132-depth)/108;
    w=w*w*(3-2*w);
    for(let c=0;c<3;c++)data[index+c]=Math.round(original.data[index+c]*(1-w)+sampled[c]*w);
  }
  const output=path.join(import.meta.dirname,'processed',`${id}-edge-harmonized.png`);
  await fs.writeFile(output,await sharp(data,{raw:{width:job.width,height:job.height,channels:4}}).png().toBuffer());
  console.log(`${id}: ${output}`);
}
