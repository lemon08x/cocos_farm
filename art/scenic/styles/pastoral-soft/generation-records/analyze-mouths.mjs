import path from 'node:path';
import {contract,jobsFor,pixels,sourcePath} from '../../../../../tools/tile-art-lib.mjs';
const styleDir=path.resolve(import.meta.dirname,'..'),m=await contract();
const jobs=new Map(jobsFor(m).map(j=>[j.id,j]));
for(const id of process.argv.slice(2)){
 const job=jobs.get(id),img=await pixels(sourcePath(id,styleDir));console.log(id);
 for(const edge of m.TILE_EDGES){
  const kind=job.entry.sockets[edge];if(kind==='grass')continue;
  const r=m.TILE_EDGE_RULES[edge],dx=r.end[0]-r.start[0],dy=r.end[1]-r.start[1],len=Math.hypot(dx,dy),mid=[(r.start[0]+r.end[0])/2,(r.start[1]+r.end[1])/2];
  let nx=-dy/len,ny=dx/len;if(nx*(300-mid[0])+ny*(180-mid[1])<0){nx=-nx;ny=-ny;}
  const rows=[];
  for(const depth of [4,16,32,64,100]){
   const tt=[];
   for(let n=0;n<=200;n++){
    const t=n/200,x=Math.round(r.start[0]+t*dx+nx*depth),y=Math.round(r.start[1]+t*dy+ny*depth);
    if(x<0||y<0||x>=img.width||y>=img.height)continue;
    const i=(y*img.width+x)*4,R=img.data[i],G=img.data[i+1],B=img.data[i+2];
    const match=kind==='road'?R>G+12&&G>B+15&&R>150:B>G-15&&G>R+20&&B>120;
    if(match)tt.push(t);
   }
   rows.push(`${depth}:${tt.length?[tt[0].toFixed(2),tt.at(-1).toFixed(2)].join('-'):'none'}`);
  }
  console.log(`  ${edge} ${kind} ${rows.join(' ')}`);
 }
}
