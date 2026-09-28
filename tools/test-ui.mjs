import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
async function moduleAt(entry){const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',target:'node24'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const {FarmCore}=await moduleAt('core/bridge.ts');
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
const scenicRegions=await moduleAt('assets/scripts/view/world/scenic/ScenicRegionLayout.ts');
const scenicValidation=await moduleAt('assets/scripts/view/world/scenic/ScenicLayoutValidation.ts');
const {hitTestPlot}=await moduleAt('assets/scripts/view/world/scenic/ScenicHitTest.ts');
const chunkStore=await moduleAt('assets/scripts/view/world/scenic/ScenicChunkStore.ts');
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
assert.ok([...unitCounts.values()].every(count=>count===9),'each initialized district must contain exactly nine plots');
assert.ok(obs.game.economy.farm.plots.some(p=>p.id==='p0q2'&&p.reachable),'farm frontier must extend west across a district edge');
assert.ok(obs.game.actions.some(a=>a.id==='economy:farmexplore:p0q2'),'the west frontier must remain actionable');
const frontierCore=new FarmCore();let frontier=await frontierCore.start();
const west=frontier.game.actions.find(a=>a.id==='economy:farmexplore:p0q2');
assert.ok(west?.enabled,'westward exploration must be available in a new game');
frontier=await frontierCore.act(west.id);
assert.ok(frontier.game.economy.farm.plots.some(p=>p.id==='p-1q2'&&p.reachable),'exploring a boundary plot must create the next district frontier');
assert.equal(frontier.game.economy.farm.plots.filter(p=>districtOf(p.x,p.y).x===-1&&districtOf(p.x,p.y).y===0).length,9,'an expanded district must contain exactly nine plots');
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
assert.deepEqual(scenicThumbnail({kind:'water'}),['env.river.straight']);
assert.deepEqual(scenicThumbnail({kind:'tree'}),['env.tree.canopy']);
assert.deepEqual(scenicThumbnail({kind:'story',discovery:{id:'woodland'}}),['env.tree.canopy']);
assert.deepEqual(scenicThumbnail({kind:'wild'}),['env.flowers']);
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
assert.equal(prefs.preferredVersion(),'current');
store.set(WORLD_VIEW_PREFERENCES_KEY,'{corrupt');
assert.equal(prefs.preferredVersion(),'current','corrupt preference JSON must fall back to the current version');
prefs.rememberCamera('current',{x:12,y:-34,zoom:1.2});
assert.deepEqual(prefs.cameraFor('current'),{x:12,y:-34,zoom:1.2});
prefs.selectVersion('scenic');
assert.equal(prefs.preferredVersion(),'scenic');
assert.ok([...store.keys()].every(k=>k===WORLD_VIEW_PREFERENCES_KEY),'world preferences must only write their own key');
store.set(WORLD_VIEW_PREFERENCES_KEY,JSON.stringify({version:42,cameras:{current:{x:'bad',y:1,zoom:2},scenic:{x:1,y:2,zoom:3}}}));
assert.equal(prefs.preferredVersion(),'current','a non-string version must fall back');
assert.equal(prefs.cameraFor('current'),undefined,'non-numeric camera entries must be discarded');
assert.deepEqual(prefs.cameraFor('scenic'),{x:1,y:2,zoom:3});
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
assert.equal(hitTestPlot({x:0,y:-71},homePlots),'p2q2','the top corner is boundary-inclusive');
assert.equal(hitTestPlot({x:114,y:0},homePlots),'p2q2','the right corner is boundary-inclusive');
assert.equal(hitTestPlot({x:57,y:35.5},homePlots),'p2q2','a point on the quad edge belongs to the quad');
assert.equal(hitTestPlot({x:150,y:90},homePlots),'p3q2','a neighbouring cell center hits that plot');
assert.equal(hitTestPlot({x:75,y:45},homePlots),null,'the environment belt between quads hits no plot');
assert.equal(hitTestPlot({x:0,y:300},homePlots),null,'empty world space must not hit');
assert.equal(hitTestPlot({x:-150,y:-450},[{id:'p-1q0',x:-1,y:0}]),'p-1q0','negative coordinates must hit');
assert.equal(hitTestPlot({x:0,y:0},[{id:'p2q2',x:2,y:2,interactive:false}]),null,'non-interactive plots must not hit');
// Region model: formula plot regions for ANY coordinates + consistent winding.
{
  const region=scenicRegions.plotRegion(-7,12);
  assert.equal(region.plotId,'p-7q12','every logical plot gets a region by formula, incl. negative and expansion coordinates');
  assert.equal(region.type,'plot');
  assert.equal(region.boundary.length,4);
  const regions=[...scenicRegions.courtyardRegions(),region,scenicRegions.plotRegion(2,2)];
  for(const r of regions){
    assert.ok(r.regionId&&r.boundary.length>=3&&r.ground&&r.layer,'region carries id, boundary, ground material and draw layer');
    assert.ok(['plot','path','river','environment','bridge'].includes(r.type),'region type must be one of the plan §3.2 types');
  }
  const sign=b=>{let a=0;for(let i=0;i<b.length;i++){const p=b[i],q=b[(i+1)%b.length];a+=p.x*q.y-q.x*p.y;}return Math.sign(a);};
  assert.equal(new Set(regions.map(r=>sign(r.boundary))).size,1,'all region boundaries share one consistent winding');
  const river=scenicRegions.riverRegions();
  assert.ok(river.every((r,i)=>i===0||r.connections.some(c=>c.to===river[i-1].regionId&&c.port)),'river regions declare their shared-edge connection ports');
}
// The full layout check: plot quads vs paths/river, quad separation, river chain
// continuity via shared-edge midpoints + single component, bridges on straight-x
// segments, homestead clearance — over courtyard, east/south, negative and expansion ranges.
assert.deepEqual(scenicValidation.validateScenicLayout(),[],'the revision-2 region layout must be geometrically valid');
// The river chain must never sit on an observed plot cell (the initial world
// extends past the known block via extendFarm).
const plotCells=new Set(obs.game.economy.farm.plots.map(p=>p.x+','+p.y));
for(const seg of scenicLayout.RIVER_SEGMENTS)
  assert.ok(!plotCells.has(seg.cell.x+','+seg.cell.y),`river segment ${seg.cell.x},${seg.cell.y} must not share a plot cell`);
// The homestead reserves only distant unknown cells (never known or frontier plots).
for(const key of scenicLayout.HOMESTEAD_RESERVED){
  const [x,y]=key.split(',').map(Number);
  const p=obs.game.economy.farm.plots.find(p=>p.x===x&&p.y===y);
  assert.ok(!p||(p.kind==='unknown'&&p.reachable!==true),`homestead reserved cell ${key} must be a distant unknown plot`);
}
// Consecutive river segments share exactly one edge midpoint (spot check on top of the full validation).
for(let i=1;i<scenicLayout.RIVER_SEGMENTS.length;i++){
  const a=scenicLayout.riverPorts(scenicLayout.RIVER_SEGMENTS[i-1]),b=scenicLayout.riverPorts(scenicLayout.RIVER_SEGMENTS[i]);
  assert.ok(a.some(pa=>b.some(pb=>Math.hypot(pa.x-pb.x,pa.y-pb.y)<1e-6)),`river segments ${i-1} and ${i} must share an edge midpoint`);
}
// Bridges anchor on straight-x river cells so paths crossing the water stay aligned.
for(const b of scenicLayout.BRIDGES){
  const seg=scenicLayout.RIVER_SEGMENTS.find(s=>s.cell.x===b.cell.x&&s.cell.y===b.cell.y);
  assert.ok(seg&&seg.kind==='straight-x','each bridge must anchor on a straight-x river segment');
}
// Foreground tree canopies must not cover any interactive plot quad (180x240, anchor [0.5,0.92]).
const rectEdges=r=>[[{x:r.left,y:r.top},{x:r.right,y:r.top}],[{x:r.right,y:r.top},{x:r.right,y:r.bottom}],[{x:r.right,y:r.bottom},{x:r.left,y:r.bottom}],[{x:r.left,y:r.bottom},{x:r.left,y:r.top}]];
const quadEdges=d=>d.map((p,i)=>[p,d[(i+1)%d.length]]);
const crosses=(a,b,c,d)=>{const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;};
for(const t of scenicLayout.TREES){
  const canopy={left:t.x-90,right:t.x+90,top:t.y-0.92*240,bottom:t.y+0.08*240};
  for(const p of obs.game.economy.farm.plots){
    if(p.kind==='unknown'&&p.reachable!==true)continue;
    const center=scenicProj.logicalToWorld(p),quad=scenicProj.plotQuad(center);
    const cornerInside=quad.some(pt=>pt.x>canopy.left&&pt.x<canopy.right&&pt.y>canopy.top&&pt.y<canopy.bottom);
    const edgeHit=rectEdges(canopy).some(([a,b])=>quadEdges(quad).some(([c,d])=>crosses(a,b,c,d)));
    assert.ok(!cornerInside&&!edgeHit,`tree canopy at ${t.x},${t.y} must not cover plot ${p.id}`);
  }
}
assert.ok(WORLD_VIEW_VERSIONS.some(v=>v.id==='scenic'&&v.name==='田园场景'),'the registry catalog must list the scenic map version');
// Default camera (720x1280): 4-6 central home plots fully visible, homestead
// upper-left, river + one bridge + streets + vegetation in frame (plan §5).
{
  const cam=scenicLayout.DEFAULT_CAMERA,hw=720/2/cam.zoom,hh=1280/2/cam.zoom;
  const vp={left:cam.x-hw,right:cam.x+hw,top:cam.y-hh,bottom:cam.y+hh};
  let shown=0;
  for(let x=1;x<=3;x++)for(let y=1;y<=3;y++){
    const c=scenicProj.logicalToWorld({x,y});
    if(scenicProj.plotQuad(c).every(p=>p.x>=vp.left&&p.x<=vp.right&&p.y>=vp.top&&p.y<=vp.bottom))shown++;
  }
  assert.ok(shown>=4&&shown<=6,`the scenic default camera must show 4-6 home plots fully in 720x1280, got ${shown}`);
  const f=scenicLayout.homesteadFootprint();
  assert.ok(f.left<vp.left+hw&&f.right>vp.left&&f.top<vp.top+hh&&f.bottom>vp.top,'the homestead must compose the upper-left of the first screen');
  const inFrame=p=>p.x>=vp.left&&p.x<=vp.right&&p.y>=vp.top&&p.y<=vp.bottom;
  assert.ok(scenicLayout.RIVER_SEGMENTS.some(s=>inFrame(scenicProj.logicalToWorld(s.cell))),'the river must join the first screen');
  assert.ok(scenicLayout.BRIDGES.some(b=>inFrame(b.world)),'a bridge must join the first screen');
  assert.ok(scenicLayout.PATHS.some(p=>p.points.some(inFrame)),'streets must join the first screen');
  assert.ok(scenicLayout.TREES.some(inFrame),'vegetation must join the first screen');
}
prefs.rememberCamera('scenic',{x:-100,y:40,zoom:1.6});
prefs.rememberCamera('current',{x:12,y:-34,zoom:1.2});
assert.deepEqual(prefs.cameraFor('scenic'),{x:-100,y:40,zoom:1.6},'scenic camera must roundtrip');
assert.deepEqual(prefs.cameraFor('current'),{x:12,y:-34,zoom:1.2},'per-version cameras must stay separate');
// --- R2: river continuity, streets, chunks, minimap, centroid zoom ---
// The river is one connected chain via shared-edge midpoints: every port either
// meets another segment's port, is the spring source, or exits the pannable bounds.
{
  const L=scenicLayout.CAMERA_LIMITS,margin={x:720/2/L.minZoom,y:1280/2/L.minZoom};
  const bounds={minX:L.minX-margin.x,maxX:L.maxX+margin.x,minY:L.minY-margin.y,maxY:L.maxY+margin.y};
  const outside=p=>p.x<bounds.minX||p.x>bounds.maxX||p.y<bounds.minY||p.y>bounds.maxY;
  const keyOf=p=>Math.round(p.x)+','+Math.round(p.y);
  const byVertex=new Map();
  scenicLayout.RIVER_SEGMENTS.forEach((seg,i)=>{
    for(const p of scenicLayout.riverPorts(seg)){
      const k=keyOf(p);if(!byVertex.has(k))byVertex.set(k,[]);byVertex.get(k).push(i);
    }
  });
  scenicLayout.RIVER_SEGMENTS.forEach((seg,i)=>{
    for(const p of scenicLayout.riverPorts(seg)){
      const partners=byVertex.get(keyOf(p))||[];
      const spring=Math.hypot(p.x-scenicLayout.RIVER_SPRING.x,p.y-scenicLayout.RIVER_SPRING.y)<2;
      assert.ok(partners.length>=2||outside(p)||spring,`river port of cell ${seg.cell.x},${seg.cell.y} must connect, exit or be the spring`);
    }
  });
  // Single connected component via shared edge midpoints.
  const parent=scenicLayout.RIVER_SEGMENTS.map((_,i)=>i);
  const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
  for(const list of byVertex.values())for(let i=1;i<list.length;i++)parent[find(list[0])]=find(list[i]);
  assert.equal(new Set(scenicLayout.RIVER_SEGMENTS.map((_,i)=>find(i))).size,1,'the river must be one continuous waterway');
}
// East/south streets continue across district borders and cross the river only at bridges.
{
  const pts=scenicLayout.PATHS.flatMap(p=>p.points);
  assert.ok(pts.some(p=>p.x>650),'a street must continue east across the district border');
  assert.ok(pts.some(p=>p.y>260),'a street must continue south across the district border');
  for(const bridge of scenicLayout.BRIDGES)
    assert.ok(pts.some(p=>Math.hypot(p.x-bridge.world.x,p.y-bridge.world.y)<=130),'a street must cross the river at each bridge');
  for(const d of scenicLayout.SCENIC_DISTRICTS){
    const c=scenicLayout.districtCenter(d.district),L=scenicLayout.CAMERA_LIMITS;
    assert.ok(c.x>=L.minX&&c.x<=L.maxX&&c.y+scenicLayout.CAMERA_LIFT>=L.minY&&c.y+scenicLayout.CAMERA_LIFT<=L.maxY,`${d.name} must stay pannable`);
  }
}
// Chunks: deterministic content, single homestead, neighbor port agreement, visible+ring coverage.
{
  const occupied=new Set(obs.game.economy.farm.plots.map(p=>p.x+','+p.y));
  const a=chunkStore.chunkContent(0,0,occupied),b=chunkStore.chunkContent(0,0,occupied);
  assert.deepEqual(a,b,'chunk content must be deterministic (coordinate hash, never core RNG)');
  const c=chunkStore.chunkContent(-2,1,occupied);
  assert.deepEqual(c,chunkStore.chunkContent(-2,1,occupied),'filler variants must be deterministic');
  let homesteads=0;
  for(let cx=-3;cx<=3;cx++)for(let cy=-3;cy<=3;cy++)if(chunkStore.chunkContent(cx,cy,occupied).homestead)homesteads++;
  assert.equal(homesteads,1,'the homestead must appear exactly once across the whole map');
  const portShape=ports=>ports.map(p=>({kind:p.kind,world:p.world}));
  for(let cx=-2;cx<=1;cx++)for(let cy=-2;cy<=1;cy++){
    assert.deepEqual(portShape(chunkStore.edgePorts(cx,cy,'e')),portShape(chunkStore.edgePorts(cx+1,cy,'w')),`east/west ports must agree at chunk ${cx},${cy}`);
    assert.deepEqual(portShape(chunkStore.edgePorts(cx,cy,'s')),portShape(chunkStore.edgePorts(cx,cy+1,'n')),`south/north ports must agree at chunk ${cx},${cy}`);
  }
  const edgePortKeys=new Set();
  for(let cx=-2;cx<=1;cx++)for(let cy=-2;cy<=1;cy++)
    for(const p of chunkStore.chunkContent(cx,cy,occupied).ports)edgePortKeys.add(p.kind+Math.round(p.world.x)+','+Math.round(p.world.y));
  assert.ok([...edgePortKeys].some(k=>k.startsWith('river')),'river boundary connection points must be declared');
  // Filler decor never lands on observed cells (no mist cover-up, no state leak).
  for(let cx=-2;cx<=1;cx++)for(let cy=-2;cy<=1;cy++){
    const content=chunkStore.chunkContent(cx,cy,occupied);
    for(const cell of content.flowerCells)assert.ok(!occupied.has(cell.x+','+cell.y),'flowers must not sit on an observed cell');
    for(const t of content.trees){
      const approx=scenicProj.worldToLogical(t);
      for(const key of occupied){
        const [px,py]=key.split(',').map(Number);
        if(Math.abs(px-approx.x)>1.6||Math.abs(py-approx.y)>1.6)continue;
        assert.ok(!scenicProj.pointInQuad(t,scenicProj.logicalToWorld({x:px,y:py})),'trees must not cover an observed cell');
      }
    }
    assert.equal(content.groundTiles.length,4,'each chunk owns a 2x2 ground tile set (no blank voids)');
  }
  const viewport={width:720,height:1280};
  for(const cam of [scenicLayout.DEFAULT_CAMERA,{x:390,y:195,zoom:.8},{x:-390,y:495,zoom:.8},{x:scenicLayout.CAMERA_LIMITS.maxX,y:scenicLayout.CAMERA_LIMITS.maxY,zoom:.8}]){
    const keys=chunkStore.visibleChunkKeys(cam,viewport);
    assert.ok(keys.length<=24,'visible + one buffer ring must stay bounded');
    const hw=viewport.width/2/cam.zoom,hh=viewport.height/2/cam.zoom;
    for(const corner of [{x:cam.x-hw,y:cam.y-hh},{x:cam.x+hw,y:cam.y-hh},{x:cam.x-hw,y:cam.y+hh},{x:cam.x+hw,y:cam.y+hh}])
      assert.ok(keys.some(k=>{const r=chunkStore.chunkRect(k.cx,k.cy);return corner.x>=r.left&&corner.x<=r.right&&corner.y>=r.top&&corner.y<=r.bottom;}),'visible chunks must cover the viewport (no blank voids)');
  }
  const store=new chunkStore.ScenicChunkStore();
  const needed=chunkStore.visibleChunkKeys(scenicLayout.DEFAULT_CAMERA,viewport);
  const first=store.sync(needed);
  assert.equal(first.added.length,needed.length,'first sync builds every needed chunk');
  assert.equal(first.removed.length,0);
  const again=store.sync(needed);
  assert.equal(again.added.length,0,'a stable camera must not rebuild chunks');
  assert.equal(again.removed.length,0,'a stable camera must not unload chunks');
  const moved=store.sync(chunkStore.visibleChunkKeys({x:390,y:195,zoom:1},viewport));
  assert.ok(moved.removed.length>0,'leaving chunks must be released');
}
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
  assert.equal(model.cells.length,known.length,'the minimap renders every known plot, not a fixed screenshot');
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
console.log('UI regression checks passed: 3x3 districts, signed expansion and save, plan/date, task routing and guards, P1 world-view isolation, R2 scenic projection/quads/regions/hit-test, scenic layout validation (homestead/river/bridges/paths/canopy) and thumbnail mapping, R2 river continuity/shared-edge ports, chunk determinism/release, minimap model and centroid zoom.');
