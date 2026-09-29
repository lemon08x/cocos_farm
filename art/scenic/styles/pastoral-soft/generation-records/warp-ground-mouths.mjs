import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {contract,jobsFor,pixels} from '../../../../../tools/tile-art-lib.mjs';

// The AI originals drew some road/water mouths narrower than the tile contract.
// Stretch only the painting along each affected edge's tangent near that mouth,
// easing to the untouched image in the interior. No new geometry is painted.
const ids=process.argv.slice(2);
if(!ids.length)throw new Error('指定地面素材 ID');
const m=await contract(),jobs=new Map(jobsFor(m).map(j=>[j.id,j]));
const dir=path.join(import.meta.dirname,'processed');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function at(img,x,y){
  x=clamp(x,0,img.width-1);y=clamp(y,0,img.height-1);
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(x0+1,img.width-1),y1=Math.min(y0+1,img.height-1),fx=x-x0,fy=y-y0;
  const p=(xx,yy,c)=>img.data[(yy*img.width+xx)*4+c];
  return [0,1,2].map(c=>(p(x0,y0,c)*(1-fx)+p(x1,y0,c)*fx)*(1-fy)+(p(x0,y1,c)*(1-fx)+p(x1,y1,c)*fx)*fy);
}
function material(r,g,b,kind){return kind==='road'?r>g+12&&g>b+15&&r>150:b>g-15&&g>r+20&&b>120;}
for(const id of ids){
  const job=jobs.get(id);
  if(job?.kind!=='ground')throw new Error(`${id}: 非地面素材`);
  const file=path.join(dir,`${id}-color-aligned.png`);
  const img=await pixels(file),out=Buffer.from(img.data),rules=[];
  for(const edge of m.TILE_EDGES){
    const kind=job.entry.sockets[edge];if(kind==='grass')continue;
    const r=m.TILE_EDGE_RULES[edge],dx=r.end[0]-r.start[0],dy=r.end[1]-r.start[1],len=Math.hypot(dx,dy);
    const mid=[(r.start[0]+r.end[0])/2,(r.start[1]+r.end[1])/2];
    let nx=-dy/len,ny=dx/len;
    if(nx*(300-mid[0])+ny*(180-mid[1])<0){nx=-nx;ny=-ny;}
    const found=[];
    for(const depth of [8,16,24,32]){
      const points=[];
      for(let n=0;n<=400;n++){
        const t=n/400,x=r.start[0]+t*dx+nx*depth,y=r.start[1]+t*dy+ny*depth;
        const [red,green,blue]=at(img,x,y);
        if(material(red,green,blue,kind))points.push(t);
      }
      if(points.length>8)found.push([points[0],points.at(-1)]);
    }
    if(!found.length)throw new Error(`${id} ${edge}: 无法识别 ${kind} 接口`);
    const left=found.reduce((s,p)=>s+p[0],0)/found.length,right=found.reduce((s,p)=>s+p[1],0)/found.length;
    const opening=m.TILE_ART_SPEC.sockets[kind].opening;
    rules.push({edge,r,kind,dx,dy,len,nx,ny,left,right,wantL:.5-opening/2,wantR:.5+opening/2});
    console.log(`${id} ${edge}: ${left.toFixed(3)}-${right.toFixed(3)} -> ${(.5-opening/2).toFixed(3)}-${(.5+opening/2).toFixed(3)}`);
  }
  for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){
    const px=x+.5,py=y+.5,index=(y*img.width+x)*4;
    if(Math.abs(px-300)/300+Math.abs(py-180)/180>1)continue;
    let selected=null;
    for(const item of rules){
      const {r,dx,dy,len}=item;
      const t=((px-r.start[0])*dx+(py-r.start[1])*dy)/(len*len);
      if(t<0||t>1)continue;
      const depth=Math.abs(dx*(py-r.start[1])-dy*(px-r.start[0]))/len;
      if(depth>=100||selected&&depth>=selected.depth)continue;
      selected={...item,t,depth};
    }
    if(!selected)continue;
    const s=selected,fade=s.depth<=24?0:(s.depth-24)/76,ease=fade*fade*(3-2*fade);
    const targetL=s.wantL*(1-ease)+s.left*ease,targetR=s.wantR*(1-ease)+s.right*ease;
    const srcT=s.t<targetL?s.t*s.left/targetL:s.t>targetR?s.right+(s.t-targetR)*(1-s.right)/(1-targetR):s.left+(s.t-targetL)*(s.right-s.left)/(targetR-targetL);
    const sourceX=s.r.start[0]+srcT*s.dx+s.nx*s.depth,sourceY=s.r.start[1]+srcT*s.dy+s.ny*s.depth;
    const color=at(img,sourceX-.5,sourceY-.5);
    for(let c=0;c<3;c++)out[index+c]=Math.round(color[c]);
  }
  const output=path.join(dir,`${id}-mouth-warped.png`);
  await fs.writeFile(output,await sharp(out,{raw:{width:img.width,height:img.height,channels:4}}).png().toBuffer());
  console.log(output);
}
