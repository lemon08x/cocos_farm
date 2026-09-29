import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {contract, jobsFor, validateSource, composeGround, sourcePath} from '../../../../../tools/tile-art-lib.mjs';

// Material contact sheet, not a game screenshot. Uses the shipping seam composition.
const ids = process.argv.slice(2);
if (!ids.length) throw new Error('指定至少一个素材 ID');
const styleDir = path.resolve(import.meta.dirname, '..');
const jobs = new Map(jobsFor(await contract()).map(job => [job.id, job]));
const m = await contract();
const masters = new Map();
for (const masterId of ['corner.grass','edge.grass.x','edge.grass.y','edge.road.x','edge.road.y','edge.river.x','edge.river.y']) {
  masters.set(masterId, await validateSource(jobs.get(masterId), sourcePath(masterId,styleDir)));
}
const columns = 3, cellW = 300, cellH = 210, rows = Math.ceil(ids.length / columns);
const layers = [];
for (let n = 0; n < ids.length; n++) {
  const id = ids[n], job = jobs.get(id);
  if (!job) throw new Error(`未知 ID ${id}`);
  const source = await validateSource(job, sourcePath(id,styleDir));
  const rendered = job.kind === 'ground' ? composeGround(m,job,source,masters) : source.data;
  const png = await sharp(rendered,{raw:{width:job.width,height:job.height,channels:4}})
    .resize(300,180,{fit:'contain'}).png().toBuffer();
  const x=(n%columns)*cellW,y=Math.floor(n/columns)*cellH;
  layers.push({input:png,left:x,top:y});
  const safe=id.replaceAll('&','&amp;').replaceAll('<','&lt;');
  layers.push({input:Buffer.from(`<svg width="300" height="30"><text x="8" y="21" fill="#29473c" font-size="17" font-family="Arial">${safe}</text></svg>`),left:x,top:y+180});
}
const output=path.join(import.meta.dirname,'previews','contact-'+ids[0].split('.')[0]+'.png');
await fs.mkdir(path.dirname(output),{recursive:true});
await sharp({create:{width:columns*cellW,height:rows*cellH,channels:4,background:'#f5f0e3'}}).composite(layers).png().toFile(output);
console.log(output);
