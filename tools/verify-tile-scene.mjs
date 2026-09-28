// One isolated browser smoke check. No screenshots, player saves or visual grading.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),root=path.resolve(import.meta.dirname,'..');
const packDir=path.join(root,'assets/resources/art-packs/scenic-tiles');
const manifest=JSON.parse(await fs.readFile(path.join(packDir,'manifest.json'),'utf8'));
const compiled=await build({entryPoints:[path.join(root,'assets/scripts/view/world/scenic/ScenicStyleContract.ts')],bundle:true,write:false,platform:'node',format:'esm'});
const contract=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
contract.validateScenicManifest(manifest,'pastoral');
for(const mutate of [m=>delete m.images['grass.0'],m=>m.images['grass.0'].anchor=[0,0],m=>m.styleId='wrong',m=>m.tileVersion=999]){
  const bad=structuredClone(manifest);mutate(bad);assert.throws(()=>contract.validateScenicManifest(bad,'pastoral'));
}
assert.throws(()=>contract.validateStyleCatalog({version:1,styles:[{id:'same',name:'A',revision:'1'},{id:'same',name:'B',revision:'2'}]}));
let server,chrome,ws;
try{
  const url=await new Promise((resolve,reject)=>{
    server=spawn(process.execPath,['tools/serve.mjs'],{cwd:root,env:{...process.env,PORT:'0'},windowsHide:true});
    server.once('error',reject);server.once('exit',code=>reject(new Error('Test server exited '+code)));
    server.stdout.on('data',data=>{const found=data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(found)resolve(found[0]);});
  });
  let executable;
  for(const p of ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']){try{await fs.access(p);executable=p;break;}catch{}}
  if(!executable)throw new Error('No local Chromium browser for smoke check');
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'farm-tiles-smoke-'));
  chrome=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=720,1280','--enable-unsafe-swiftshader','about:blank'],{windowsHide:true,stdio:'ignore'});
  let port;
  for(let i=0;i<60&&!port;i++){try{port=(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{await sleep(250);}}
  if(!port)throw new Error('Browser debug endpoint unavailable');
  const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let serial=0;const pending=new Map(),errors=[];
  ws.onmessage=message=>{const data=JSON.parse(message.data);if(data.id){const task=pending.get(data.id);if(task){pending.delete(data.id);data.error?task.reject(new Error(data.error.message)):task.resolve(data.result);}}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description??data.params.exceptionDetails.text);else if(data.method==='Fetch.requestPaused')void intercept(data.params).catch(e=>errors.push(String(e)));};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  // Fixtures exist only in this isolated browser, never as selectable production art.
  const intercept=async({requestId,request})=>{
    const pathname=new URL(request.url).pathname;let body,contentType='application/json',responseCode=200;
    if(pathname.endsWith('/scenic-styles/index.json'))body=Buffer.from(JSON.stringify({version:1,styles:[{id:'pastoral',name:manifest.name,revision:manifest.revision},{id:'smoke-alt',name:'Test only',revision:'test'}]}));
    else if(pathname.endsWith('/manifest.json')){
      const m=structuredClone(manifest);m.styleId=pathname.includes('/smoke-bad/')?'smoke-bad':'smoke-alt';m.name='Test only';m.palette.green='#123456';m.palette.fog='#654321';m.palette['map.water']='#456789';m.textureFilter='nearest';
      if(m.styleId==='smoke-bad')m.images['grass.0'].file='missing.png';
      body=Buffer.from(JSON.stringify(m));
    }else{contentType='image/png';try{body=await fs.readFile(path.join(packDir,path.basename(pathname)));}catch{responseCode=404;body=Buffer.from('missing');}}
    await send('Fetch.fulfillRequest',{requestId,responseCode,responseHeaders:[{name:'Content-Type',value:contentType}],body:body.toString('base64')});
  };
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result.value;};
  await send('Runtime.enable');await send('Page.enable');
  await send('Fetch.enable',{patterns:[{urlPattern:'*/art-packs/scenic-styles/smoke-*/*'},{urlPattern:'*/art-packs/scenic-styles/index.json*'}]});
  await send('Page.navigate',{url});
  let ready=false;for(let i=0;i<120;i++){if(await evaluate('!!globalThis.__farmDemo')){ready=true;break;}if(errors.length)throw new Error(errors.join('\n'));await sleep(500);}
  if(!ready)throw new Error('Game did not start within 60 seconds');
  const result=await evaluate(`(async()=>{
    const d=globalThis.__farmDemo,v=d.scenicView,s=d.obs.game.economy.farm.scene;
    const check=(ok,msg)=>{if(!ok)throw new Error(msg);};
    check(d.worldVersion==='scenic'&&v,'Game fell back from the new main scene');
    check(v.images.manifest.id==='scenic-tiles'&&s.tileVersion===1,'Wrong art pack or scene cells');
    check(v.cells.size>0,'No ground cells rendered');
    const save=d.core.save(),home=s.regions.find(r=>r.plotId==='p2q2'),road=s.regions.find(r=>r.type==='path');
    check(v.hitTest(home.center)==='p2q2','Home picking mismatch');check(v.hitTest(road.center)===null,'Road must not select a plot');
    const focus=v.focusPlot('p3q2');check(!!focus,'Missing plot focus');v.setCamera(focus);check(v.cells.size>0,'Viewport culling lost visible cells');
    const plots=d.obs.game.economy.farm.plots.map(p=>p.id==='p2q2'?{...p,kind:'field',field:{crop:'wheat'},maturity:{days:0}}:p);
    v.render({plots,scene:s,selected:'p2q2'});
    check(v.cells.get(home.regionId).standing.some(n=>n.name==='crop.wheat.mature'),'Crop state did not refresh');
    v.render({plots:plots.map(p=>p.id==='p2q2'?{...p,purpose:'other',improvement:'shed'}:p),scene:s,selected:'p2q2'});
    check(v.cells.get(home.regionId).standing.some(n=>n.name.startsWith('Plot state')),'Facility state did not refresh');
    d.renderPlots();check(d.core.save()===save,'Rendering mutated the game save');
    const selected=d.selected,input=d.input,camera=JSON.stringify(v.getCamera()),old=v.images;
    await d.openScenicStyles();await d.switchScenicStyle('smoke-alt');
    check(v.images!==old&&v.images.manifest.styleId==='smoke-alt','Style switch failed');
    check(d.art.palette.green==='#123456','HUD palette was not switched');
    check(d.art.palette['map.water']==='#456789'&&v.images.palette.fog==='#654321','Map palette was not switched');
    check(d.input===input&&d.selected===selected&&JSON.stringify(v.getCamera())===camera,'Switch lost selection, camera or input');
    check(v.cells.size>0&&v.hitTest(home.center)==='p2q2','Replacement scene unusable');
    check(d.core.save()===save,'Style switch mutated game progress');
    check(localStorage.getItem('shanju.cocos.scenic-style.v1')==='smoke-alt','Style preference not saved');
    const active=v.images;await d.switchScenicStyle('smoke-bad');
    check(v.images===active&&localStorage.getItem('shanju.cocos.scenic-style.v1')==='smoke-alt','Failed switch replaced style or preference');
    check(d.core.save()===save&&JSON.stringify(v.getCamera())===camera,'Failed switch mutated state');
    d.persist();sessionStorage.setItem('smoke-save',save);
    return {pack:v.images.manifest.id,frames:v.images.frames.size,visibleCells:v.cells.size,sceneRegions:s.regions.length,picking:true,stateRefresh:true,saveUnchanged:true,styleSwitch:true,failedSwitchPreserved:true};
  })()`);
  await send('Page.reload');
  let restored=false;for(let i=0;i<120;i++){if(await evaluate("!!globalThis.__farmDemo&&globalThis.__farmDemo.scenicView?.images.manifest.styleId==='smoke-alt'")){restored=true;break;}if(errors.length)throw new Error(errors.join('\n'));await sleep(500);}
  assert.ok(restored,'Preferred style was not restored after restart');
  assert.ok(await evaluate("globalThis.__farmDemo.core.save()===sessionStorage.getItem('smoke-save')"),'Restart lost game progress');
  result.restartPreserved=true;
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify(result));
}finally{ws?.close();chrome?.kill();server?.kill();}
