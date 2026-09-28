// Contact sheet and sample assembly of imported art. These are previews only.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..');
const art=path.dirname(here);
const build=path.join(root,'build','tile-art');
const latest=(await fs.readdir(build)).filter(n=>n.startsWith('scenic-tiles-')).sort().at(-1);
if(!latest)throw new Error('Run npm run tiles:import first');
const output=path.join(build,latest);
const manifest=JSON.parse(await fs.readFile(path.join(output,'manifest.json'),'utf8'));
const previewDir=path.join(art,'previews');
await fs.mkdir(previewDir,{recursive:true});

function labelSvg(label,w){
  const safe=label.replaceAll('&','&amp;').replaceAll('<','&lt;');
  return Buffer.from(`<svg width="${w}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f9f5ea"/><text x="10" y="23" fill="#254735" font-family="Arial" font-size="16">${safe}</text></svg>`);
}

const cols=4,cardW=330,cardH=235,rows=Math.ceil(manifest.assets.length/cols);
const sheetComposites=[];
for(const [i,asset] of manifest.assets.entries()){
  const left=(i%cols)*cardW,top=Math.floor(i/cols)*cardH;
  const png=await sharp(path.join(output,asset.file)).resize(300,180,{fit:'contain',background:'#00000000'}).png().toBuffer();
  sheetComposites.push({input:png,left:left+15,top:top+40},{input:labelSvg(asset.id,cardW),left,top});
}
await sharp({create:{width:cols*cardW,height:rows*cardH,channels:4,background:'#eee8d9'}})
  .composite(sheetComposites).png().toFile(path.join(previewDir,'contact-sheet.png'));

const sample=[];
for(let x=0;x<3;x++)for(let y=0;y<3;y++){
  const id=x===1&&y===1?'bridge.ul-lr':y===1?'road.straight.ul-lr':x===1?'river.straight.ur-ll':'grass.0';
  sample.push({input:path.join(output,`${id}.png`),left:600+(x-y)*300,top:(x+y)*180});
}
await sharp({create:{width:1800,height:1080,channels:4,background:'#eee8d9'}})
  .composite(sample).png().toFile(path.join(previewDir,'assembly-preview.png'));
console.log(`Preview source: ${output}`);
console.log(previewDir);
