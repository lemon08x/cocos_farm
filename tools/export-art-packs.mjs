import fs from 'node:fs/promises';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'../assets/resources/art-packs');
const dest=path.resolve(import.meta.dirname,'../build/web-mobile/art-packs');
await fs.cp(source,dest,{recursive:true,filter:file=>!file.endsWith('.meta')});
const study=path.resolve(import.meta.dirname,'../art/grok-qinghe');
try { await fs.access(path.join(study,'case-study.html')); await fs.cp(study,path.resolve(import.meta.dirname,'../build/web-mobile/art-study'),{recursive:true}); }
catch(error){if(error.code!=='ENOENT')throw error;}
console.log('Editable art packs copied into Web Mobile export.');
