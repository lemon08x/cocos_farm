// One-time sample generation. Existing packs are never overwritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../assets/resources/art-packs');
const palette={ink:'#354a3e',muted:'#77806b',paper:'#f6f0db',cream:'#fff9e8',green:'#526e50',gold:'#c6a367',line:'#dbd4b7',status:'#eff0d9',caption:'#5b7466',disabled:'#eae7d5',warning:'#9a694b',shade:'#203a30',base:'#a4bd90'};
const night={ink:'#eee5ca',muted:'#b1bfc3',paper:'#30444f',cream:'#3c5660',green:'#d8bd7d',gold:'#e3ba66',line:'#667b80',status:'#344d58',caption:'#f1e2bb',disabled:'#39464f',warning:'#f4b689',shade:'#101c30',base:'#536d7b'};
const paths={calendar:'M7 10h34v31H7z M7 20h34 M15 5v10 M33 5v10 M14 28h4 M29 28h4 M14 35h4 M29 35h4',book:'M24 39L5 33V6l19 7 19-7v27z M24 13v26',basket:'M4 20h40l-6 22H10z M12 20Q24-5 36 20 M17 25v10 M24 25v10 M31 25v10',leaf:'M24 43C-7 22 12-2 24 12C40-4 58 24 24 43z M24 43V18',rest:'M24 12v12l10 6',home:'M3 23L24 4l21 19 M9 19v24h30V19 M19 43V28h10v15',more:'M9 24h1 M24 24h1 M39 24h1'};
await fs.mkdir(root,{recursive:true});
for(const [id,name,dark] of [['paper','田园 · 浅纸',false],['dusk','暮色 · 配色示意',true],['custom','自定义 · 替换这里',false]]){
  const dir=path.join(root,id);
  try{await fs.access(dir);console.log(`Preserved existing pack: ${id}`);continue;}catch{}
  await fs.mkdir(dir);const images={};const colors=dark?night:palette;
  async function svg(slot,w,h,body,extra={}){const file=slot.replaceAll('.','-')+'.png';await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)).png().toFile(path.join(dir,file));images[slot]={file,width:w,height:h,...extra};}
  for(const [slot,w,h] of [['landscape',720,1280],['cottage',310,272]]){let im=sharp(path.join(root,'../art',slot+'.png'));if(dark)im=im.modulate({brightness:.68,saturation:.62}).tint('#899db7');await im.png().toFile(path.join(dir,slot+'.png'));images[slot]={file:slot+'.png',width:w,height:h};}
  await svg('cloud',180,70,'<g fill="#f8f5df" opacity=".42"><ellipse cx="90" cy="43" rx="78" ry="13"/><ellipse cx="70" cy="29" rx="42" ry="20"/><ellipse cx="110" cy="33" rx="36" ry="18"/></g>');
  for(const kind of ['wild','unknown','fieldDry','fieldWet','water','story','rock','tree']){
    const field=kind.startsWith('field');const fill=dark?(field?'#897457':kind==='water'?'#668a9b':'#758777'):(field?(kind==='fieldWet'?'#a98757':'#b99a69'):kind==='water'?'#85b9b2':kind==='unknown'?'#a3b795':'#b8c992');
    let detail='';
    if(field)for(let i=-2;i<=2;i++)detail+=`<path d="M${26+i*5} ${44-i*5}l45 -23" stroke="#876d4b" stroke-width="2" opacity=".7"/>`;
    else if(kind==='water')detail='<path d="M34 36q24 -12 48 0 M44 45h30" fill="none" stroke="#d7eadc" stroke-width="2"/>';
    else if(kind==='unknown')detail='<g fill="#eff1d5"><circle cx="42" cy="34" r="2"/><circle cx="58" cy="34" r="2"/><circle cx="74" cy="34" r="2"/></g>';
    else if(kind==='rock')detail='<path d="M36 38l8-23 23-5 14 27-22 9z" fill="#92998a" stroke="#727f75" stroke-width="2"/>';
    else if(kind==='tree')detail='<path d="M58 39V16" stroke="#7a6045" stroke-width="5"/><ellipse cx="58" cy="16" rx="19" ry="14" fill="#647d52"/>';
    else {for(let i=0;i<4;i++)detail+=`<path d="M${34+i*15} 41l-3-10 M${34+i*15} 41l4-7" stroke="#7c985b" stroke-width="2"/>`;if(kind==='story')detail+='<circle cx="58" cy="19" r="7" fill="#ecd8a0"/>';}
    await svg('terrain.'+kind,116,72,`<path d="M58 15L112 43 58 71 4 43z" fill="${field?'#826344':'#7b9465'}"/><path d="M58 8L112 36 58 64 4 36z" fill="${fill}"/>${detail}`);
  }
  await svg('selection',116,64,'<path d="M58 2L115 32 58 62 1 32z" fill="none" stroke="#fff4bb" stroke-width="3"/>');
  for(const stage of ['growing','mature']){const mature=stage==='mature';let body='';for(let i=0;i<7;i++){const x=58+(i%3-1)*18,y=70-(Math.floor(i/3)-1)*10;body+=`<path d="M${x} ${y}v-${mature?30:17}" stroke="${mature?'#bc9847':'#5b7b4e'}" stroke-width="3"/><g fill="${mature?'#efd38a':'#82a25a'}"><ellipse cx="${x-5}" cy="${y-12}" rx="6" ry="3"/><ellipse cx="${x+5}" cy="${y-17}" rx="6" ry="3"/>${mature?`<ellipse cx="${x}" cy="${y-27}" rx="4" ry="9"/>`:''}</g>`;}await svg('crop.default.'+stage,116,100,body,{y:20});}
  await svg('icon.background',76,76,`<circle cx="38" cy="41" r="36" fill="#344c39" opacity=".15"/><circle cx="38" cy="37" r="35" fill="${colors.paper}" stroke="${colors.line}" stroke-width="2"/>`);
  for(const [key,d]of Object.entries(paths))await svg('icon.'+key,48,48,`<g fill="none" stroke="${colors.green}" stroke-width="${key==='more'?5:3}" stroke-linecap="round" stroke-linejoin="round">${key==='rest'?'<circle cx="24" cy="24" r="18"/>':''}<path d="${d}"/></g>`);
  for(const [slot,fill]of [['panel',colors.paper],['card',colors.cream],['primary',colors.green],['disabled',colors.disabled],['status',colors.status]])await svg('ui.'+slot,64,64,`<rect x="1" y="1" width="62" height="62" rx="15" fill="${fill}" stroke="${slot==='primary'?fill:colors.line}" stroke-width="2"/>`,{borders:[16,16,16,16]});
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({version:1,id,name,palette:colors,images,scene:[{slot:'landscape',x:0,y:0,width:720,height:1280},{slot:'cottage',x:117,y:55,width:310,height:272}],clouds:true},null,2)+'\n');
}
try{await fs.writeFile(path.join(root,'index.json'),JSON.stringify({packs:[{id:'paper',name:'田园 · 浅纸'},{id:'dusk',name:'暮色 · 配色示意'},{id:'custom',name:'自定义 · 替换这里'}]},null,2)+'\n',{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
console.log('Sample art packs ready.');
