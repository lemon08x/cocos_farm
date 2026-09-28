import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {contract,jobsFor,artDir,edgePixel,composeGround,validateSource} from './tile-art-lib.mjs';
import {normalize} from './tile-art.mjs';

const m=await contract(),entries=m.tileArtCatalog(),jobs=jobsFor(m);
assert.equal(entries.length,43);assert.equal(jobs.length,50);
assert.equal(new Set(jobs.map(j=>j.id)).size,jobs.length);
const bridge=entries.find(e=>e.id==='bridge.ul-lr'),road=entries.find(e=>e.id==='road.straight.ul-lr');
assert(m.tileSocketsMatch(bridge,'ul',road));
assert(!m.tileSocketsMatch(bridge,'ur',road));
for(const e of m.TILE_EDGES){const r=m.TILE_EDGE_RULES[e],other=m.TILE_EDGE_RULES[r.opposite];assert.equal(other.opposite,e);assert.equal(r.dx+other.dx,0);assert.equal(r.dy+other.dy,0);}
const grass=entries.find(e=>e.id==='grass.0');
assert.deepEqual(m.selectTileArt(entries,'grass',grass.sockets,{x:-30,y:123}),m.selectTileArt(entries.slice().reverse(),'grass',grass.sockets,{x:-30,y:123}));
assert.throws(()=>m.selectTileArt(entries,'grass',bridge.sockets,{x:0,y:0}),/缺少图块/);
assert.deepEqual(m.tileCanvas(entries.find(e=>e.id==='object.tree')).anchor,[.5,.75]);
const house=m.tileCanvas(entries.find(e=>e.id==='object.house'));assert.equal(house.width,1200);assert.equal(house.height,1080);assert.deepEqual(house.origin,{x:600,y:540});

const strip={width:352,height:96,data:Buffer.alloc(352*96*4)};
for(let y=0;y<96;y++)for(let x=0;x<352;x++){const i=(y*352+x)*4;strip.data[i]=x%256;strip.data[i+1]=y;strip.data[i+2]=100;strip.data[i+3]=255;}
for(const e of m.TILE_EDGES){
  const r=m.TILE_EDGE_RULES[e];
  assert.deepEqual(edgePixel(m,strip,e,.3,0),edgePixel(m,strip,r.opposite,.3,0));
  assert.equal(edgePixel(m,strip,e,.3,8)[1],47.5+r.side*8);
}
const masters=new Map(jobs.filter(j=>j.kind==='edge').map(j=>[j.id,strip]));
masters.set('corner.grass',{width:80,height:80,data:Buffer.from(Array(80*80).fill([30,40,50,255]).flat())});
const job=jobs.find(j=>j.id==='grass.0');
const image={width:600,height:360,data:Buffer.alloc(600*360*4,255)},composed=composeGround(m,job,image,masters);
assert.equal(composed[3],0);assert.equal(composed[(180*600+300)*4],255);
const png=await sharp(composed,{raw:{width:600,height:360,channels:4}}).png().toBuffer();await validateSource(job,png);
const changed={...image,data:Buffer.alloc(image.data.length,99)},other=composeGround(m,job,changed,masters);
const edgeIndex=(95*600+155)*4;
assert.deepEqual(composed.subarray(edgeIndex,edgeIndex+4),other.subarray(edgeIndex,edgeIndex+4));
const opaque=await sharp({create:{width:600,height:360,channels:4,background:'#ffffff'}}).png().toBuffer();
await assert.rejects(validateSource(jobs.find(j=>j.kind==='crop'),opaque),/实际透明背景/);
await assert.rejects(validateSource(job,opaque),/四边形外/);
await assert.rejects(normalize('grass.0',path.join(artDir,'jobs/grass.0/control.png'),{generator:'test'}),/技术模板/);
// These failure cases stop before recording any production source image.
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cocos-tile-contract-'));
const wrong=path.join(temp,'wrong-ratio.png');await sharp({create:{width:100,height:100,channels:4,background:'#ffffff'}}).png().toFile(wrong);
await assert.rejects(normalize('grass.0',wrong,{generator:'test'}),/比例不符/);
await assert.rejects(normalize('grass.0',wrong,{generator:'test',crop:'0,0,600,360'}),/原图内/);
// Delete only the explicitly created single file, then its empty temporary directory.
await fs.unlink(wrong);await fs.rmdir(temp);
console.log('图块契约检查通过：接口、选图、锚点、共享接缝、透明区、模板拒绝及裁剪保护。');
