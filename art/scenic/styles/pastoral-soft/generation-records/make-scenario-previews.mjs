import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {contract, jobsFor, validateSource, composeGround, sourcePath} from '../../../../../tools/tile-art-lib.mjs';

// Offline material assembly only; these files are not screenshots of the game.
const styleDir=path.resolve(import.meta.dirname,'..');
const outputDir=path.join(import.meta.dirname,'previews');
const m=await contract(),jobs=new Map(jobsFor(m).map(j=>[j.id,j]));
const masters=new Map();
for(const id of ['corner.grass','edge.grass.x','edge.grass.y','edge.road.x','edge.road.y','edge.river.x','edge.river.y'])
  masters.set(id,await validateSource(jobs.get(id),sourcePath(id,styleDir)));
const cache=new Map();
async function png(id){
  if(cache.has(id))return cache.get(id);
  const job=jobs.get(id),raw=await validateSource(job,sourcePath(id,styleDir));
  const data=job.kind==='ground'?composeGround(m,job,raw,masters):raw.data;
  const result=await sharp(data,{raw:{width:job.width,height:job.height,channels:4}}).png().toBuffer();
  cache.set(id,result);return result;
}
const ground=(name,overrides)=>{
  const a=Array.from({length:5},(_,i)=>Array.from({length:5},(_,j)=>`grass.${(i*7+j*11)%3}`));
  for(const [i,j,id] of overrides)a[i][j]=id;
  return {name,ground:a,overlays:[]};
};
const farm=ground('farm-material',[
  [1,1,'courtyard.0'],[1,2,'courtyard.0'],[2,1,'courtyard.0'],
  [3,1,'field.dry.0'],[3,2,'field.wet.0'],[2,3,'field.dry.0'],
]);
farm.overlays=[['object.house',1,1],['object.tree',0,3],['object.tree',4,0],['crop.wheat.growing',3,2]];
const road=ground('road-material',[
  [0,2,'road.end.lr'],[1,2,'road.straight.ul-lr'],[2,2,'road.cross.ul-ur-lr-ll'],[3,2,'road.straight.ul-lr'],[4,2,'road.end.ul'],
  [2,0,'road.end.ll'],[2,1,'road.straight.ur-ll'],[2,3,'road.straight.ur-ll'],[2,4,'road.end.ur'],
  [0,4,'road.turn.ul-ur'],[1,4,'road.turn.lr-ll'],
]);
const bridgeA=ground('bridge-ur-ll-material',[
  [0,2,'river.end.lr'],[1,2,'river.straight.ul-lr'],[2,2,'bridge.ur-ll'],[3,2,'river.straight.ul-lr'],[4,2,'river.end.ul'],
  [2,1,'road.straight.ur-ll'],[2,3,'road.straight.ur-ll'],
]);
const bridgeB=ground('bridge-ul-lr-material',[
  [2,0,'river.end.ll'],[2,1,'river.straight.ur-ll'],[2,2,'bridge.ul-lr'],[2,3,'river.straight.ur-ll'],[2,4,'river.end.ur'],
  [1,2,'road.straight.ul-lr'],[3,2,'road.straight.ul-lr'],
]);
await fs.mkdir(outputDir,{recursive:true});
for(const scene of [farm,road,bridgeA,bridgeB]){
  const layers=[];
  for(let i=0;i<5;i++)for(let j=0;j<5;j++){
    const x=1500+(i-j)*300,y=(i+j)*180;
    layers.push({input:await png(scene.ground[i][j]),left:x-300,top:y});
  }
  for(const [id,i,j] of scene.overlays){
    const job=jobs.get(id),cx=1500+(i-j)*300,cy=(i+j)*180+180;
    layers.push({input:await png(id),left:cx-job.origin.x,top:cy-job.origin.y});
  }
  const source=path.join(outputDir,`${scene.name}-source.png`);
  await sharp({create:{width:3000,height:1800,channels:4,background:'#f5f0e3'}}).composite(layers).png().toFile(source);
  await sharp(source).resize(1500,900).png().toFile(path.join(outputDir,`${scene.name}-display.png`));
  console.log(source);
}
