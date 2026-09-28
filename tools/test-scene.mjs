import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:`
export * from './core/bridge.ts';
export {extendFarm,exploreFarm,waterAccess,waterConnected,drainOutlet,shedCovers,irrigationTargets,spatialView,blankField,farmBlocker,farmWork} from './core/src/game/systems/agriculture.ts';
export {validateScenicLayout} from './assets/scripts/view/world/scenic/ScenicLayoutValidation.ts';
export {parseSession} from './core/src/runtime/session.ts';
export {prepareGameSave,GAME_SAVE_KEY} from './assets/scripts/view/world/GameSaveStorage.ts';
export {buildMinimapModel,minimapSignature} from './assets/scripts/view/world/scenic/ScenicMinimap.ts';
`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const core=new m.FarmCore(),obs=await core.start(),initial=JSON.parse(core.save());
const farm=obs.game.economy.farm;
assert.deepEqual(initial.state.economy.farm.scene,{id:m.SCENE_ID,version:m.SCENE_VERSION});
assert.ok(farm.plots.some(p=>p.id==='p2q2'&&p.kind==='field'));
for(const id of ['p1q2','p3q2','p2q3'])assert.ok(farm.plots.find(p=>p.id===id)?.discovery);
const plot=(x,y,kind='unknown',elevation=1,improvement)=>({id:`p${x}q${y}`,x,y,kind,...(kind!=='unknown'?{land:{soil:'loam',elevation,water:0,dryDays:0,wetDays:0,drainDays:0}}:{}),...(kind==='field'?{purpose:improvement?'other':'sowing',field:m.blankField()}:{}),...(improvement?{improvement}:{})});
const fixture=(...plots)=>{const state=structuredClone(initial.state);state.economy.farm.plots=Object.fromEntries(plots.map(p=>[p.id,p]));return state;};
// The actual generated plots, including far expansion, never overlap environmental ground.
const expanded=structuredClone(initial.state);
for(const at of [plot(4,6,'wild'),plot(4,8,'wild'),plot(-10,-10,'wild'),plot(30,30,'wild')]){
 assert.ok(m.isValidPlotCell(at.x,at.y));expanded.economy.farm.plots[at.id]=at;m.extendFarm(expanded,at);
}
const snapshot=m.buildSceneSnapshot(Object.values(expanded.economy.farm.plots));
assert.deepEqual(m.validateScenicLayout(snapshot),[]);
const environment=snapshot.regions.filter(r=>!r.plotId);
for(const r of snapshot.regions.filter(r=>r.plotId)){
 assert.ok(!environment.some(e=>m.scenePolygonsIntersect(r.boundary,e.boundary)),`${r.plotId} overlaps environment`);
 assert.equal(m.sceneHitTest(r.center,snapshot,new Set([r.plotId])),r.plotId);
 assert.deepEqual(r,m.scenePlotRegion(r.cell.x,r.cell.y));
}
for(const r of snapshot.regions.filter(r=>!r.plotId))assert.equal(m.sceneHitTest(r.boundary[0],snapshot,new Set(farm.plots.map(p=>p.id))),null);
assert.ok(snapshot.bounds.maxY>m.CAMERA_LIMITS.maxY);
assert.equal(m.clampScenicCamera({x:5000,y:5000,zoom:1},snapshot.bounds).y,5000);
// No bridge: directly opposing banks remain disconnected. Existing bridges join only exploration.
for(const x of [4,7]){
 const a=plot(x,6,'wild'),b=plot(x,8),state=fixture(a,b);
 assert.equal(m.explorationStatus(state.economy.farm.plots,b).reachable,true);
 assert.ok(!m.agriculturalNeighbors(a).some(n=>n.id===b.id));
 m.extendFarm(state,a);assert.ok(state.economy.farm.plots[b.id]);
 m.exploreFarm(state,b.id,[]);assert.notEqual(state.economy.farm.plots[b.id].kind,'unknown');
 const frontier=state.economy.farm.plots[`p${x}q9`];assert.ok(frontier,'far bank has a next exploration frontier');
 m.exploreFarm(state,frontier.id,[]);assert.ok(Object.keys(state.economy.farm.plots).some(id=>id.endsWith('q10')),'crossing continues district expansion');
}
{
 const a=plot(2,6,'wild'),b=plot(2,8),state=fixture(a,b);
 assert.equal(m.explorationStatus(state.economy.farm.plots,b).reachable,false);
 assert.throws(()=>m.exploreFarm(state,b.id,[]),/不可探索/);
 const chain=fixture(plot(20,20,'wild'),plot(21,20),plot(22,20));
 assert.equal(m.explorationStatus(chain.economy.farm.plots,chain.economy.farm.plots.p22q20).reachable,false);
}
// Real command path and saved progress round trip.
await core.act('economy:farmexplore:p0q2');
const restored=new m.FarmCore();await restored.start(core.save());assert.equal(restored.save(),core.save());
const bad=JSON.parse(core.save());bad.state.economy.farm.scene.version=999;
assert.throws(()=>m.parseSession(bad),/场景存档版本/);
const overlapping=JSON.parse(core.save());overlapping.state.economy.farm.plots.p4q7=plot(4,7);
assert.throws(()=>m.parseSession(overlapping),/存档/);
// River level is one. Water crosses connected downhill/equal channels, never a bridge or an uphill link.
{
 const a=plot(4,6,'field',1,'canal'),b=plot(4,5,'field',1,'canal'),c=plot(4,4,'field',0),high=plot(5,5,'field',2),far=plot(4,8,'field',2);
 const state=fixture(a,b,c,high,far);
 assert.equal(m.waterAccess(state,a),true);assert.equal(m.waterConnected(state,b),true);
 assert.equal(m.waterAccess(state,high),false);assert.equal(m.waterAccess(state,far),false);
 assert.ok(m.irrigationTargets(state,a).has(c.id),'multi-segment channels reach the downstream crop');
 assert.ok(!m.irrigationTargets(state,a).has(high.id));assert.ok(!m.irrigationTargets(state,a).has(far.id));
 assert.ok(m.spatialView(state,a).waterSources.includes('river.4.7'));
 c.field.crop='wheat';c.field.growth=0;c.field.duration=100;state.location.water=0;
 assert.ok(!m.farmBlocker(state,'wheat',undefined,c.field).some(reason=>reason.includes('公共水')));
 m.farmWork(state,'wheat',[],undefined,c.field);assert.equal(state.location.water,0);assert.ok(c.land.water>=2);
 b.land.elevation=2;assert.equal(m.waterConnected(state,b),false);
}
{
 const high=plot(4,6,'field',2,'drain'),level=plot(7,6,'field',1,'drain');
 const state=fixture(high,level);assert.equal(m.drainOutlet(state,high),true);assert.equal(m.drainOutlet(state,level),false);
 const oldOutlet=plot(0,-10,'field',1,'drain');assert.equal(m.drainOutlet(fixture(oldOutlet),oldOutlet),false);
 const shed=plot(20,20,'field',1,'shed'),near=plot(22,20,'field'),diagonal=plot(22,22,'field');
 const coverage=fixture(shed,near,diagonal);assert.equal(m.shedCovers(coverage,near),true);assert.equal(m.shedCovers(coverage,diagonal),false);
 const north=plot(4,6,'field',1,'shed'),south=plot(4,8,'field');assert.equal(m.shedCovers(fixture(north,south),south),false);
}
// Storage cleanup targets the retired slot only, including when v2 is malformed.
{
 const values=new Map([['shanju.cocos.farm.v1','old'],[m.GAME_SAVE_KEY,'broken'],['shanju.cocos.world.v1','preference']]);
 const storage={getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k)};
 assert.deepEqual(m.prepareGameSave(storage),{saved:'broken',reset:false});assert.equal(values.has('shanju.cocos.farm.v1'),false);assert.equal(values.get('shanju.cocos.world.v1'),'preference');
 values.delete(m.GAME_SAVE_KEY);assert.equal(m.prepareGameSave(storage).reset,true);
 values.set(m.GAME_SAVE_KEY,core.save());assert.equal(m.prepareGameSave(storage).reset,false);
}
// Minimap uses the same boundaries and reacts when a plot changes without changing plot count.
{
 const cam={x:0,y:0,zoom:1},model=m.buildMinimapModel(farm.plots,cam,{width:720,height:1280},160,farm.scene);
 assert.equal(model.cells.length,farm.plots.length);assert.ok(model.environment.some(r=>r.tone==='bridge'));assert.ok(model.environment.some(r=>r.tone==='water'));
 const region=farm.scene.regions.find(r=>r.plotId==='p2q2'),cell=model.cells.find(c=>c.id==='p2q2');
 assert.equal(cell.boundary[1].x-cell.boundary[3].x,(region.boundary[1].x-region.boundary[3].x)*model.scale);
 const changed=structuredClone(farm.plots);changed.find(p=>p.id==='p2q2').purpose='other';
 assert.notEqual(m.minimapSignature(changed,cam),m.minimapSignature(farm.plots,cam));
}
console.log('Scene checks passed: valid regions, bridges and expansion, water/drainage/coverage, commands, persistence and minimap.');
