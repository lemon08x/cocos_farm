import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../assets/resources/art-packs');
const drawings={
 food:'<path d="M24 42V7 M24 15C10 15 9 5 10 4c9 0 14 6 14 11 M24 23C38 23 39 13 38 12c-9 0-14 6-14 11 M24 32C10 32 9 22 10 21c9 0 14 6 14 11"/>',
 coin:'<circle cx="24" cy="24" r="18"/><rect x="18" y="18" width="12" height="12" rx="1"/>',
 pressure:'<path d="M17 39c-9-5-8-15-3-22 0 7 5 9 6 4 2-9 7-12 9-16-1 10 10 14 10 24 0 8-7 14-15 14-6 0-11-4-11-9"/><path d="M21 38c-3-4 2-8 4-12 0 5 6 7 3 12"/>',
 sun:'<circle cx="24" cy="24" r="9"/><path d="M24 3v6 M24 39v6 M3 24h6 M39 24h6 M9 9l5 5 M34 34l5 5 M9 39l5-5 M34 14l5-5"/>',
 rain:'<path d="M10 28h28c12-2 7-16-2-14C31 0 12 4 13 17 1 15 0 28 10 28 M13 34l-3 8 M25 34l-3 8 M37 34l-3 8"/>',
 cloud:'<path d="M10 34h28c12-2 7-17-2-15C32 3 10 6 12 21-11 18 1 34 10 34z"/>',
 snow:'<path d="M24 4v40 M7 14l34 20 M7 34l34-20 M18 7l6 6 6-6 M18 41l6-6 6 6 M8 21l8-2-2-8 M34 37l-2-8 8-2"/>',
 wind:'<path d="M4 16h29c12 0 10-14 2-10 M4 25h34 M4 34h23c12 0 10 14 2 10"/>',
 hoe:'<path d="M10 42L31 10 M22 8c8-5 16-3 22 2l-4 10c-6-6-12-7-20-3z"/>',
 target:'<circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="4"/><path d="M24 2v8 M24 38v8 M2 24h8 M38 24h8"/>',
 info:'<circle cx="24" cy="24" r="19"/><path d="M24 21v15 M24 12v2"/>',
 list:'<rect x="9" y="7" width="30" height="36" rx="4"/><path d="M18 5h12v7H18z M17 22h14 M17 30h14"/>',
 settings:'<path d="M19 5h10l2 7 6 3 6-1 4 8-5 5-1 7 2 5-8 5-6-4h-7l-6 4-8-5 2-6-1-7-5-4 4-8 7 1 5-3z" transform="translate(0,-2) scale(.96)"/><circle cx="24" cy="24" r="7"/>',
 lotus:'<path d="M24 35C7 30 3 17 4 12c11 0 18 7 20 23z M24 35c17-5 21-18 20-23-11 0-18 7-20 23z M24 35C10 22 16 10 24 3c8 7 14 19 0 32z M8 40q16 7 32 0"/>'
};
for(const dir of await fs.readdir(root,{withFileTypes:true})){
 if(!dir.isDirectory())continue;
 const file=path.join(root,dir.name,'manifest.json');let m;
 try{m=JSON.parse(await fs.readFile(file,'utf8'));}catch{continue;}
 for(const [name,body]of Object.entries(drawings)){
  const png='icon-'+name+'.png';
  await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48"><g fill="none" stroke="'+m.palette.green+'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'+body+'</g></svg>')).png().toFile(path.join(root,dir.name,png));
  m.images['icon.'+name]={file:png,width:48,height:48};
 }
 await fs.writeFile(file,JSON.stringify(m,null,2)+'\n');
}
console.log('Icon-first HUD assets exported.');
