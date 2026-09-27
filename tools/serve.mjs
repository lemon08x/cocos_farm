import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../build/web-mobile');
const artRoot=path.resolve(import.meta.dirname,'../assets/resources/art-packs');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.bin':'application/octet-stream','.ttf':'font/ttf','.woff':'font/woff'};
const port=Number(process.env.PORT||4328);
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');let p=decodeURIComponent(url.pathname);
    const isArt=p.startsWith('/art-packs/');const base=isArt?artRoot:root;
    if(isArt)p=p.slice('/art-packs'.length);
    if(p.endsWith('/'))p+='index.html';
    const file=path.resolve(base,'.'+p);
    if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
    const data=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found. Build with Cocos Creator first.');}
}).listen(port,'127.0.0.1',()=>console.log(`Shanju Farm: http://127.0.0.1:${port}`));
