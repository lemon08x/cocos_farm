import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
async function moduleAt(entry){const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',target:'node24'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const {FarmCore,isValidPlotCell}=await moduleAt('core/bridge.ts');
const {taskView,playerText,actionSummary,plotName}=await moduleAt('assets/scripts/view/FarmPresentation.ts');
const {PanelStack}=await moduleAt('assets/scripts/view/PanelStack.ts');
const {districtOf,districtOrigin,localPlotOf,plotAtDistrict,plotPosition,cameraForDistrict,districtAtCamera,HOME_PLOT_ID}=await moduleAt('assets/scripts/view/FarmDistrict.ts');
const {farmUnitOf,farmUnitStart,farmLocalOf}=await moduleAt('core/src/game/model/farm-coordinates.ts');
const {buildHudViewModel,nextTaskText,plotTitle:viewTitle,scenicThumbnail}=await moduleAt('assets/scripts/presentation/FarmViewModel.ts');
const {WorldViewPreferences,WORLD_VIEW_PREFERENCES_KEY}=await moduleAt('assets/scripts/view/world/WorldViewPreferences.ts');
const {WorldViewRegistry,WORLD_VIEW_VERSIONS}=await moduleAt('assets/scripts/view/world/WorldViewRegistry.ts');
const {MAP_LAYOUT,boardTileSlot}=await moduleAt('assets/scripts/view/world/current/CurrentMapLayout.ts');
const scenicProj=await moduleAt('assets/scripts/view/world/scenic/ScenicProjection.ts');
const scenicLayout=await moduleAt('assets/scripts/view/world/scenic/ScenicLayout.ts');
const {hitTestPlot}=await moduleAt('assets/scripts/view/world/scenic/ScenicHitTest.ts');
const scenicMinimap=await moduleAt('assets/scripts/view/world/scenic/ScenicMinimap.ts');
assert.equal(HOME_PLOT_ID,'p2q2');
assert.equal(plotName('p1q1'),'田地 1·1');
assert.equal(plotName('p0q2'),'田地 0·2');
assert.equal(plotName('p-1q2'),'田地 -1·2');
assert.deepEqual(plotPosition(2,2),{x:0,y:0},'farmhouse and home field must anchor the world origin');
for(const value of [-7,-2,-1,0,1,2,3,4,8]){
  const district=districtOf(value,2);
  assert.equal(district.x,farmUnitOf(value));
  assert.equal(districtOrigin(district).x,farmUnitStart(value));
  assert.equal(localPlotOf(value,2).x,farmLocalOf(value));
  assert.deepEqual(plotAtDistrict(district,localPlotOf(value,2)),{x:value,y:2});
}
const fieldbook=JSON.parse(await readFile('assets/resources/art-packs/fieldbook/manifest.json','utf8'));
assert.equal(fieldbook.images['board.home']?.file,'board-home.png');
for(const name of ['field','calendar','basket','more','back','close','next','leaf','coin','food','pressure'])
  assert.ok(fieldbook.images['icon.'+name]?.file.endsWith('.png'),'missing image icon '+name);
assert.deepEqual(districtOf(1,3),{x:0,y:0});
assert.deepEqual(districtOf(3,3),{x:0,y:0});
assert.deepEqual(districtOf(4,3),{x:1,y:0});
assert.deepEqual(districtOf(0,2),{x:-1,y:0});
assert.ok(plotPosition(4,2).x-plotPosition(3,2).x>plotPosition(3,2).x-plotPosition(2,2).x,'adjacent districts keep a connected path corridor');
assert.deepEqual(districtAtCamera(...Object.values(cameraForDistrict({x:-2,y:3},.82)),.82),{x:-2,y:3});
const stack=new PanelStack();let selected='a';
const node=()=>({active:true,destroy(){this.destroyed=true;}});
const first=stack.push('calendar',node,()=>{selected='a';});
stack.push('confirm',node);stack.push('calendar',node);stack.push('confirm',node);
assert.equal(stack.depth,4,'opening a repeated route must preserve its immediate parent');
stack.back();assert.equal(stack.depth,3);
const old=stack.current;stack.push('calendar',node);
assert.equal(stack.depth,3,'pagination replaces only the top view');assert.equal(old.destroyed,true);
stack.back();selected='b';stack.back();
assert.equal(stack.current,first);assert.equal(selected,'a','back must restore selected field context');
stack.clear();assert.equal(stack.depth,0);assert.equal(first.destroyed,true);
const core=new FarmCore();let obs=await core.start();
const unitCounts=new Map();for(const p of obs.game.economy.farm.plots){const d=districtOf(p.x,p.y),key=d.x+','+d.y;unitCounts.set(key,(unitCounts.get(key)??0)+1);}
for(const [key,count] of unitCounts){const [dx,dy]=key.split(',').map(Number);let valid=0;for(let x=dx*3+1;x<=dx*3+3;x++)for(let y=dy*3+1;y<=dy*3+3;y++)if(isValidPlotCell(x,y))valid++;assert.equal(count,valid,'districts contain only valid game regions');}
assert.ok(obs.game.economy.farm.plots.some(p=>p.id==='p0q2'&&p.reachable),'farm frontier must extend west across a district edge');
assert.ok(obs.game.actions.some(a=>a.id==='economy:farmexplore:p0q2'),'the west frontier must remain actionable');
const frontierCore=new FarmCore();let frontier=await frontierCore.start();
const west=frontier.game.actions.find(a=>a.id==='economy:farmexplore:p0q2');
assert.ok(west?.enabled,'westward exploration must be available in a new game');
frontier=await frontierCore.act(west.id);
assert.ok(frontier.game.economy.farm.plots.some(p=>p.id==='p-1q2'&&p.reachable),'exploring a boundary plot must create the next district frontier');
assert.equal(frontier.game.economy.farm.plots.filter(p=>districtOf(p.x,p.y).x===-1&&districtOf(p.x,p.y).y===0).length,[-2,-1,0].flatMap(x=>[1,2,3].map(y=>({x,y}))).filter(p=>isValidPlotCell(p.x,p.y)).length,'expanded districts omit environmental regions');
assert.ok((await new FarmCore().start(frontierCore.save())).game.economy.farm.plots.some(p=>p.id==='p-1q2'),'signed-coordinate districts must survive save loading');
const before=obs.game.life.calendar.absoluteDay;
const plan=obs.game.actions.find(a=>a.id.startsWith('economy:plotplan:p2q2-add-')&&a.enabled);
assert.ok(plan,'new game must expose a plan');
obs=await core.act(plan.id);
assert.equal(obs.game.life.calendar.absoluteDay,before,'planning must not advance date');
const tasks=obs.game.economy.farm.schedule.tasks;
assert.ok(tasks.length>=2,'plan should expose sowing and harvest tasks');
assert.ok(tasks.every(t=>!taskView(t,obs).ready),'future tasks must not execute');
assert.ok(!playerText(tasks[0].name).includes('p2q2'),'task name must not expose plot IDs');
const task=tasks.find(t=>t.kind==='harvest');
const fake=structuredClone(obs);const fakeTask={...task,due:true,deadline:before+100,gaps:[]};
fake.game.actions.push({id:'test-action',enabled:true});fakeTask.actionId='test-action';
assert.equal(taskView(fakeTask,fake).ready,false,'harvest task must not trigger sowing on an empty field');
const plot=fake.game.economy.farm.plots.find(p=>p.id===task.plotId);
plot.field={crop:'wheat'};plot.maturity={days:0};
assert.equal(taskView(fakeTask,fake).ready,true,'matching mature harvest can proceed');
fakeTask.deadline=before;
assert.equal(taskView(fakeTask,fake).status,'已过期','deadline is exclusive');
fakeTask.deadline=before+10;fakeTask.gaps=['缺少条件'];
assert.equal(taskView(fakeTask,fake).ready,false,'task blockers must prevent execution');
assert.ok(!actionSummary({id:'economy:farmplot:p2q2-wheat',description:'收获作物。 行动耗费1天（生活页可调整采购）。'}).includes('生活页'));
const warning='此行动将跨过农时截止：p2q2 小麦。';
assert.ok(actionSummary({id:'economy:test:x',description:warning+' 行动耗费1天'}).includes('农时截止'),'deadline warnings must survive cleanup');
const saved=core.save(),restored=new FarmCore();const loaded=await restored.start(saved);
assert.deepEqual(loaded.game.economy.farm.schedule.tasks,obs.game.economy.farm.schedule.tasks,'existing save format must roundtrip');
assert.equal(MAP_LAYOUT.stepX,58,'legacy tile geometry must survive the move to current/');
assert.equal(boardTileSlot({id:HOME_PLOT_ID}),'board.home');
assert.equal(viewTitle(undefined),'田院');
const hudBoard=buildHudViewModel(obs,HOME_PLOT_ID,true);
assert.equal(hudBoard.field,'院前田');
assert.equal(hudBoard.thumbnail,'board.home','the home plot thumbnail must use the homestead slot');
assert.deepEqual(hudBoard.thumbnailScenic,scenicThumbnail(obs.game.economy.farm.plots.find(p=>p.id===HOME_PLOT_ID)),'scenic thumbnail must derive from the real plot state');
assert.ok(hudBoard.thumbnailScenic.every(s=>!s.startsWith('board.')),'scenic thumbnail must never reuse board slots');
assert.ok(hudBoard.thumbnailScenic.length>0&&hudBoard.thumbnailScenic[0]!=='board.home','the homestead image must not replace the field condition thumbnail');
assert.deepEqual(scenicThumbnail({kind:'unknown'}),['field.unknown'],'unexplored plots show the mist diamond');
assert.deepEqual(scenicThumbnail({kind:'field',land:{water:0}}),['field.soil.dry']);
assert.deepEqual(scenicThumbnail({kind:'field',land:{water:3}}),['field.soil.wet']);
assert.deepEqual(scenicThumbnail({kind:'field',land:{water:1},field:{crop:'wheat'},maturity:{days:5}}),['field.soil.dry','crop.wheat.growing']);
assert.deepEqual(scenicThumbnail({kind:'field',land:{water:2},field:{crop:'wheat'},maturity:{days:0}}),['field.soil.wet','crop.wheat.mature']);
assert.deepEqual(scenicThumbnail({kind:'field',land:{water:0},field:{crop:'soy'},maturity:{days:2}}),['field.soil.dry','crop.default.growing'],'unlisted crops fall back to the default stages');
assert.deepEqual(scenicThumbnail({kind:'water'}),[]);
assert.deepEqual(scenicThumbnail({kind:'tree'}),['env.tree.canopy']);
assert.deepEqual(scenicThumbnail({kind:'story',discovery:{id:'woodland'}}),['env.tree.canopy']);
assert.deepEqual(scenicThumbnail({kind:'wild'}),['grass.0']);
assert.equal(hudBoard.next,nextTaskText(true,obs.game.economy.farm.schedule.tasks,obs));
assert.ok(hudBoard.money.startsWith('钱 ')&&hudBoard.date.length>0);
const hudPlain=buildHudViewModel(obs,HOME_PLOT_ID,false);
assert.equal(hudPlain.thumbnail,boardTileSlot(obs.game.economy.farm.plots.find(p=>p.id===HOME_PLOT_ID)));
const hudMissing=buildHudViewModel(obs,'p99q99',true);
assert.equal(hudMissing.field,'地块单元','an unknown selection must fall back to the unit label');
assert.equal(hudMissing.detail,'未探索');
assert.ok(WORLD_VIEW_VERSIONS.some(v=>v.id==='current'),'the registry catalog must list the current map version');
const registry=new WorldViewRegistry();
const stubView={render(){},hitTest:()=>null,focusPlot:()=>null,focusDistrict:()=>({x:0,y:0,zoom:1}),getCamera:()=>({x:0,y:0,zoom:1}),setCamera(){},resize(){},dispose(){}};
registry.register({id:'current',name:'田格手账',create:async()=>stubView});
assert.deepEqual(registry.list(),[{id:'current',name:'田格手账'}]);
assert.equal(await registry.create('current',null),stubView);
await assert.rejects(()=>registry.create('scenic',null),/Unknown world view version/);
const store=new Map(),storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)};
const prefs=new WorldViewPreferences(storage);
assert.equal(prefs.preferredVersion(),'scenic');
store.set(WORLD_VIEW_PREFERENCES_KEY,'{corrupt');
assert.equal(prefs.preferredVersion(),'scenic','corrupt preference JSON must fall back to the main scene');
store.set(WORLD_VIEW_PREFERENCES_KEY,JSON.stringify({version:'current',cameras:{current:{x:12,y:-34,zoom:1.2}}}));
assert.equal(prefs.preferredVersion(),'scenic','existing installs must enter the scenic main scene on upgrade');
assert.deepEqual(prefs.cameraFor('current'),{x:12,y:-34,zoom:1.2},'promotion must preserve camera preferences');
prefs.selectVersion('current');
assert.equal(new WorldViewPreferences(storage).preferredVersion(),'current','an explicit legacy selection after upgrade must survive restart');
prefs.rememberCamera('current',{x:12,y:-34,zoom:1.2});
assert.deepEqual(prefs.cameraFor('current'),{x:12,y:-34,zoom:1.2});
prefs.selectVersion('scenic');
assert.equal(prefs.preferredVersion(),'scenic');
assert.ok([...store.keys()].every(k=>k===WORLD_VIEW_PREFERENCES_KEY),'world preferences must only write their own key');
store.set(WORLD_VIEW_PREFERENCES_KEY,JSON.stringify({version:42,cameras:{current:{x:'bad',y:1,zoom:2},scenic:{x:1,y:2,zoom:3}}}));
assert.equal(prefs.preferredVersion(),'scenic','a non-string version must fall back to the main scene');
assert.equal(prefs.cameraFor('current'),undefined,'non-numeric camera entries must be discarded');
assert.deepEqual(prefs.cameraFor('scenic'),{x:2,y:4,zoom:1.5},'old camera maps once to the expanded ground lattice');
// --- R2: scenic projection (150/90 steps), plot quads, region layout, hit test, default camera ---
for(const p of [{x:2,y:2},{x:1,y:1},{x:3,y:3},{x:-4,y:7},{x:0,y:-3},{x:-9,y:-11},{x:5,y:-2},{x:100,y:-80}]){
  const w=scenicProj.logicalToWorld(p);
  assert.deepEqual(scenicProj.worldToLogical(w),p,'scenic projection roundtrip '+JSON.stringify(p));
  const s=scenicProj.worldToScreen(w,scenicLayout.DEFAULT_CAMERA);
  assert.deepEqual(scenicProj.screenToWorld(s,scenicLayout.DEFAULT_CAMERA),w,'scenic camera transform roundtrip '+JSON.stringify(p));
}
assert.deepEqual(scenicProj.logicalToWorld({x:2,y:2}),{x:0,y:0},'p2q2 must anchor the scenic world origin');
// Revision-2 geometry contract: tilled plot quad 228x142 inside a 300x180 ground cell.
{
  const c=scenicProj.logicalToWorld({x:2,y:2});
  assert.deepEqual(scenicProj.plotQuad(c),[{x:0,y:-71},{x:114,y:0},{x:0,y:71},{x:-114,y:0}],'plot quad half extents are 114x71');
  assert.deepEqual(scenicProj.cellDiamond(c),[{x:0,y:-90},{x:150,y:0},{x:0,y:90},{x:-150,y:0}],'ground cell diamond half extents are 150x90');
  assert.ok(scenicProj.pointInQuad({x:114,y:0},c)&&scenicProj.pointInQuad({x:0,y:-71},c),'quad corners are boundary-inclusive');
  assert.ok(!scenicProj.pointInQuad({x:115,y:0},c),'just past a quad corner is outside');
  assert.ok(scenicProj.pointInQuad({x:57,y:35.5},c),'a point on the quad edge belongs to the quad');
  assert.deepEqual(scenicProj.cellEdgeMidpoint({x:4,y:7},'lr'),{x:-375,y:675},'river ports are shared-edge midpoints, not diamond corners');
  assert.deepEqual(scenicProj.cellEdgeMidpoint({x:5,y:7},'ul'),{x:-375,y:675},'edge-adjacent cells share the same edge midpoint');
}
// Hit test on plot quads: correct plotId incl. boundary, belt and negative cases.
const homePlots=[];for(let x=1;x<=3;x++)for(let y=1;y<=3;y++)homePlots.push({id:`p${x}q${y}`,x,y});
assert.equal(hitTestPlot({x:0,y:0},homePlots),'p2q2');
assert.equal(hitTestPlot({x:0,y:-90},homePlots),'p2q2','the top corner is boundary-inclusive');
assert.equal(hitTestPlot({x:150,y:0},homePlots),'p2q2','the right corner is boundary-inclusive');
assert.equal(hitTestPlot({x:75,y:45},homePlots),'p2q2','a point on the quad edge belongs to the quad');
assert.equal(hitTestPlot({x:300,y:180},homePlots),'p3q2','a neighbouring game plot center hits that plot');
assert.equal(hitTestPlot({x:150,y:90},homePlots),null,'the environmental tile between plots hits no plot');
assert.equal(hitTestPlot({x:0,y:1000},homePlots),null,'empty world space must not hit');
assert.equal(hitTestPlot({x:-5700,y:180},[{id:'p-7q12',x:-7,y:12}]),'p-7q12','negative coordinates must hit');
assert.equal(hitTestPlot({x:0,y:0},[{id:'p2q2',x:2,y:2,interactive:false}]),null,'non-interactive plots must not hit');
prefs.rememberCamera('scenic',{x:-100,y:40,zoom:1.6});
prefs.rememberCamera('current',{x:12,y:-34,zoom:1.2});
assert.deepEqual(prefs.cameraFor('scenic'),{x:-100,y:40,zoom:1.6},'scenic camera must roundtrip');
assert.deepEqual(prefs.cameraFor('current'),{x:12,y:-34,zoom:1.2},'per-version cameras must stay separate');
// Minimap model: real observation data only, mist never leaks terrain, viewport tracks the camera.
{
  assert.equal(scenicMinimap.minimapTone({kind:'unknown',field:{crop:'wheat'}}),'mist','unexplored plots must stay mist even with hidden state');
  assert.equal(scenicMinimap.minimapTone({kind:'water'}),'water');
  assert.equal(scenicMinimap.minimapTone({kind:'story',discovery:{id:'spring'}}),'water');
  assert.equal(scenicMinimap.minimapTone({kind:'field'}),'field');
  const plots=obs.game.economy.farm.plots;
  const cam={x:-220,y:-135,zoom:1.05},viewport={width:720,height:1280};
  const model=scenicMinimap.buildMinimapModel(plots,cam,viewport,138);
  const known=plots.filter(p=>p.kind!=='unknown'||p.reachable);
  assert.equal(model.cells.length,plots.length,'the minimap renders every generated region without revealing unknown terrain');
  assert.ok(model.cells.some(c=>c.tone==='home'),'the minimap marks the homestead');
  assert.ok(model.cells.some(c=>c.tone==='mist'),'the minimap keeps frontier mist');
  assert.ok(Math.abs(model.view.w-viewport.width/cam.zoom*model.scale)<1e-6,'the viewport rect width must track camera and zoom');
  const shifted=scenicMinimap.buildMinimapModel(plots,{...cam,x:cam.x+130},viewport,138);
  assert.ok(Math.abs(shifted.view.x-model.view.x-130*model.scale)<1e-6,'the viewport rect must follow camera pans');
}
// Pinch zoom about the centroid: the world point under the centroid stays fixed.
{
  const cam={x:-220,y:-135,zoom:1.05},viewportPoint={x:120,y:-260},zoom=1.6;
  // Map-space point currently rendered at viewportPoint (mapPos = (-cx*z, cy*z)).
  const mapPoint={x:(viewportPoint.x+cam.x*cam.zoom)/cam.zoom,y:(viewportPoint.y-cam.y*cam.zoom)/cam.zoom};
  const next=scenicLayout.zoomCameraAboutPoint(cam,mapPoint,viewportPoint,zoom);
  const after={x:-next.x*next.zoom+mapPoint.x*next.zoom,y:next.y*next.zoom+mapPoint.y*next.zoom};
  assert.ok(Math.abs(after.x-viewportPoint.x)<1e-9&&Math.abs(after.y-viewportPoint.y)<1e-9,'the centroid point must not move while zooming');
  const centered=scenicLayout.zoomCameraAboutPoint(cam,{x:cam.x,y:-cam.y},{x:0,y:0},zoom);
  assert.ok(Math.abs(centered.x-cam.x)<1e-9&&Math.abs(centered.y-cam.y)<1e-9,'viewport-center zoom is the degenerate case');
}
console.log('UI checks passed: task routing, save roundtrip, scene preferences, geometry, minimap and camera.');
