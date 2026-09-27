/** Cut the reviewed ImageGen sheets into state-specific, transparent board sprites. */
import path from 'node:path';
import sharp from 'sharp';

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'art/fieldbook/sources');
const output=path.join(root,'assets/resources/art-packs/fieldbook');
const sheets=[
  {file:'farm-tiles-a.png',names:['fieldDry','wild','fieldWet','wheatGrowing']},
  {file:'farm-tiles-b.png',names:['wheatMature','tree','rock','water']},
  {file:'farm-utility-tiles.png',names:['yard','garden','compost','shed']}
];
for(const sheet of sheets){
  const input=path.join(source,sheet.file),meta=await sharp(input).metadata();
  const leftWidth=Math.floor(meta.width/2),topHeight=Math.floor(meta.height/2);
  for(let i=0;i<4;i++){
    const left=i%2?leftWidth:0,top=i>=2?topHeight:0;
    const width=i%2?meta.width-leftWidth:leftWidth,height=i>=2?meta.height-topHeight:topHeight;
    const quadrant=await sharp(input).extract({left,top,width,height}).toBuffer();
    await sharp(quadrant).trim({threshold:8})
      .resize(512,384,{fit:'fill'}).png().toFile(path.join(output,`board-${sheet.names[i]}.png`));
  }
}
await sharp(path.join(source,'farm-surround.png')).resize(1024,768,{fit:'cover'}).png()
  .toFile(path.join(output,'board-environment.png'));
await sharp(path.join(source,'farm-ground.png')).resize(1024,1024,{fit:'fill'}).png()
  .toFile(path.join(output,'board-ground.png'));
await sharp(path.join(source,'canal-h-source.png')).resize(672,110,{fit:'fill'}).png()
  .toFile(path.join(output,'board-canal-h.png'));
await sharp(path.join(source,'canal-v-source.png')).resize(120,576,{fit:'fill'}).png()
  .toFile(path.join(output,'board-canal-v.png'));
await sharp(path.join(source,'farm-home.png')).resize(512,384,{fit:'fill'}).png()
  .toFile(path.join(output,'board-home.png'));
console.log('Reviewed fieldbook art processed into 13 state sprites and connected ground.');
