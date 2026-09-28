import {cellDiamond,cellEdgeMidpoint,logicalToWorld,plotQuad,pointInPolygon,segmentsCross,type LogicalPoint,type ScenicWorldPoint} from './geometry.js';
import {BRIDGES,HOMESTEAD,PATHS,RIVER_SEGMENTS,SCENIC_DISTRICTS} from './layout.js';
import {courtyardRegions,strokeBoundary} from './regions.js';
import {makeTileLayout,plotTile,plotWorld,tileWorld,tileBoundary,grassArt,HOUSE_CELL,TILE_LAYOUT_VERSION} from './tile-map.js';
import {TILE_EDGES,TILE_EDGE_RULES} from './tile-art.js';

export const SCENE_ID='scenic-farm';
export const SCENE_VERSION=1;
export type ScenePoint=ScenicWorldPoint;
export type SceneRegionType='plot'|'path'|'river'|'environment'|'bridge';
export interface SceneRegion {
  regionId:string;type:SceneRegionType;boundary:ScenePoint[];center:ScenePoint;
  district:{x:number;y:number};plotId?:string;cell?:LogicalPoint;
  capabilities:{selectable:boolean;walkable:boolean;waterSource:boolean;waterLevel?:number};
  ground:string;innerBoundary?:ScenePoint[];artBounds?:{minX:number;maxX:number;minY:number;maxY:number};
  tileCell?:LogicalPoint;art?:string;
}
export interface SceneConnection {from:string;to:string;purpose:'exploration'|'agriculture'|'water';via?:string}
export interface SceneDefinition {id:string;version:number;regions:SceneRegion[];connections:SceneConnection[];districts:typeof SCENIC_DISTRICTS;plotAt:typeof scenePlotRegion;neighbors:typeof explorationNeighbors}
export interface SceneSnapshot {id:string;version:number;tileVersion:number;regions:SceneRegion[];objects:{id:string;art:string;center:ScenePoint;depth:number}[];connections:SceneConnection[];bounds:{minX:number;maxX:number;minY:number;maxY:number}}
export interface ScenePlot {id:string;x:number;y:number;kind:string}
const idAt=(x:number,y:number)=>`p${x}q${y}`;
const district=(p:ScenePoint)=>({x:Math.floor((p.x-1)/3),y:Math.floor((p.y-1)/3)});
const steps=[[-1,0],[1,0],[0,-1],[0,1]];
const neighbors=(p:LogicalPoint)=>steps.map(([dx,dy])=>({id:idAt(p.x+dx,p.y+dy),x:p.x+dx,y:p.y+dy}));
const centerOf=(poly:ScenePoint[])=>({x:poly.reduce((s,p)=>s+p.x,0)/poly.length,y:poly.reduce((s,p)=>s+p.y,0)/poly.length});

/** Boundary contact is also reserved: roads own their full outer edge. */
export function scenePolygonsIntersect(a:ScenePoint[],b:ScenePoint[]):boolean {
  return a.some(p=>pointInPolygon(p,b))||b.some(p=>pointInPolygon(p,a))||a.some((p,i)=>b.some((q,j)=>segmentsCross(p,a[(i+1)%a.length],q,b[(j+1)%b.length])));
}
const environment:SceneRegion[]=courtyardRegions().map(r=>{
  let boundary=r.boundary;
  // Ground occupancy is separate from the roof/sprite's tall artwork extent.
  if(r.regionId==='env.homestead') boundary=[{x:-530,y:-610},{x:-70,y:-610},{x:-70,y:-364},{x:-530,y:-364}];
  if(r.type==='bridge'){const bridge=BRIDGES[Number(r.regionId.split('.')[1])];boundary=strokeBoundary([cellEdgeMidpoint(bridge.cell,'ur'),cellEdgeMidpoint(bridge.cell,'ll')],24);}
  const water=r.type==='river'||r.regionId==='env.spring';
  const region:SceneRegion={regionId:r.regionId,type:r.type,boundary,center:centerOf(boundary),district:{x:0,y:0},ground:r.ground,
    capabilities:{selectable:false,walkable:r.type==='path'||r.type==='bridge',waterSource:water,...(water?{waterLevel:1}:{})}};
  if(r.type==='path'){const path=PATHS[Number(r.regionId.split('.')[1])];region.innerBoundary=strokeBoundary(path.points,path.width);}
  if(r.regionId==='env.homestead')region.artBounds={minX:HOMESTEAD.world.x-HOMESTEAD.width/2,maxX:HOMESTEAD.world.x+HOMESTEAD.width/2,minY:HOMESTEAD.world.y-HOMESTEAD.height*HOMESTEAD.anchor[1],maxY:HOMESTEAD.world.y+HOMESTEAD.height*(1-HOMESTEAD.anchor[1])};
  return region;
});
const riverByCell=new Map(RIVER_SEGMENTS.map((s,i)=>[`${s.cell.x},${s.cell.y}`,environment.find(r=>r.regionId===`river.${s.cell.x}.${s.cell.y}`)!]));
const blockers=environment;
const validCache=new Map<string,boolean>();
export function isValidPlotCell(x:number,y:number):boolean {
  const key=`${x},${y}`,cached=validCache.get(key);if(cached!==undefined)return cached;
  const quad=plotQuad(logicalToWorld({x,y}));
  const valid=Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&!blockers.some(r=>scenePolygonsIntersect(quad,r.boundary));
  // Bound the cache for continuous exploration.
  if(validCache.size>20000)validCache.clear();validCache.set(key,valid);return valid;
}
export function scenePlotRegion(x:number,y:number):SceneRegion|null {
  if(!isValidPlotCell(x,y))return null;
  const center=plotWorld({x,y}),tileCell=plotTile({x,y});
  return {regionId:`plot.${x}.${y}`,plotId:idAt(x,y),type:'plot',cell:{x,y},tileCell,center,boundary:cellDiamond(center),district:district({x,y}),ground:'soil',art:grassArt(tileCell),capabilities:{selectable:true,walkable:true,waterSource:false}};
}
export function agriculturalNeighbors(p:LogicalPoint){return neighbors(p).filter(n=>isValidPlotCell(n.x,n.y));}

// Explicit two-bank links. River straight-x runs along x; its banks lie at y±1.
const bridgeLinks=BRIDGES.map((b,i)=>({bridge:`river.${b.cell.x}.${b.cell.y}`,river:`river.${b.cell.x}.${b.cell.y}`,a:{x:b.cell.x,y:b.cell.y-1},b:{x:b.cell.x,y:b.cell.y+1}}));
const fixedConnections:SceneConnection[]=bridgeLinks.flatMap(b=>[
  {from:`plot.${b.a.x}.${b.a.y}`,to:b.bridge,purpose:'exploration' as const},
  {from:b.bridge,to:`plot.${b.b.x}.${b.b.y}`,purpose:'exploration' as const},
]);
for(let i=1;i<RIVER_SEGMENTS.length;i++){
  const a=RIVER_SEGMENTS[i-1].cell,b=RIVER_SEGMENTS[i].cell;
  fixedConnections.push({from:`river.${a.x}.${a.y}`,to:`river.${b.x}.${b.y}`,purpose:'water'});
}
fixedConnections.push({from:'env.spring',to:'river.-3.2',purpose:'water'});
const tileLayout=makeTileLayout(isValidPlotCell);
const tileEnvironment:SceneRegion[]=Array.from(tileLayout.values()).map(t=>({
  regionId:t.source??t.id,type:t.kind==='road'?'path':t.kind==='river'?'river':t.kind==='bridge'?'bridge':'environment',
  boundary:tileBoundary(t),center:tileWorld(t),tileCell:{x:t.x,y:t.y},district:district({x:t.x/2,y:t.y/2}),ground:t.kind,art:t.art,
  capabilities:{selectable:false,walkable:t.kind==='road'||t.kind==='bridge'||t.kind==='courtyard',waterSource:t.kind==='river'||t.kind==='bridge',...(['river','bridge'].includes(t.kind)?{waterLevel:1}:{})}
}));
export const FARM_SCENE:SceneDefinition={id:SCENE_ID,version:SCENE_VERSION,regions:tileEnvironment,connections:fixedConnections,districts:SCENIC_DISTRICTS,plotAt:scenePlotRegion,neighbors:explorationNeighbors};
export function explorationNeighbors(p:LogicalPoint){
  const out=agriculturalNeighbors(p);
  for(const link of bridgeLinks){
    const target=p.x===link.a.x&&p.y===link.a.y?link.b:p.x===link.b.x&&p.y===link.b.y?link.a:null;
    if(target&&isValidPlotCell(target.x,target.y))out.push({id:idAt(target.x,target.y),...target});
  }
  return out;
}
export function explorationStatus(plots:Record<string,ScenePlot>,p:ScenePlot):{reachable:boolean;reason:string}{
  const reachable=explorationNeighbors(p).some(n=>plots[n.id]&&plots[n.id].kind!=='unknown');
  return {reachable,reason:reachable?'与已探索区域相通':neighbors(p).some(n=>riverByCell.has(`${n.x},${n.y}`))?'河流阻隔，请从桥头逐步探索':'先探索相邻区域'};
}
export function adjacentSceneWater(p:LogicalPoint):SceneRegion[]{
  const sources=neighbors(p).map(n=>riverByCell.get(`${n.x},${n.y}`)).filter((r):r is SceneRegion=>!!r);
  const spring=environment.find(r=>r.regionId==='env.spring')!;
  if(scenePolygonsIntersect(cellDiamond(logicalToWorld(p)),spring.boundary))sources.push(spring);
  return sources;
}
export function sceneRange(p:LogicalPoint,stepsCount:number):string[]{
  const seen=new Set([idAt(p.x,p.y)]);let queue=[p];
  for(let i=0;i<stepsCount;i++){const next:LogicalPoint[]=[];for(const at of queue)for(const n of agriculturalNeighbors(at))if(!seen.has(n.id)){seen.add(n.id);next.push(n);}queue=next;}
  return [...seen];
}
export function buildSceneSnapshot(plots:ScenePlot[]):SceneSnapshot {
  const regions=[...tileEnvironment],connections=[...fixedConnections],known=new Set(plots.map(p=>p.id));
  for(const p of plots){
    const r=scenePlotRegion(p.x,p.y);if(!r)throw new Error(`地块 ${p.id} 不属于有效场景区域`);regions.push(r);
    for(const n of agriculturalNeighbors(p))if(known.has(n.id)&&p.id<n.id){
      const to=`plot.${n.x}.${n.y}`;
      const mid={x:p.x+n.x,y:p.y+n.y};const road=tileEnvironment.find(e=>e.type==='path'&&e.tileCell?.x===mid.x&&e.tileCell?.y===mid.y);
      connections.push({from:r.regionId,to,purpose:'agriculture'},{from:r.regionId,to,purpose:'water'},{from:r.regionId,to,purpose:'exploration',...(road?{via:road.regionId}:{})});
    }
    for(const water of adjacentSceneWater(p))connections.push({from:water.regionId,to:r.regionId,purpose:'water'});
  }
  // Fill only materialized districts and fixed environment neighborhoods, never an infinite plane.
  const occupied=new Set(regions.map(r=>`${r.tileCell!.x},${r.tileCell!.y}`));
  for(const r of [...regions])for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    const p={x:r.tileCell!.x+dx,y:r.tileCell!.y+dy},key=`${p.x},${p.y}`;if(occupied.has(key))continue;occupied.add(key);
    regions.push({regionId:`cell.${p.x}.${p.y}`,type:'environment',tileCell:p,center:tileWorld(p),boundary:tileBoundary(p),district:district({x:p.x/2,y:p.y/2}),ground:'grass',art:grassArt(p),capabilities:{selectable:false,walkable:false,waterSource:false}});
  }
  const byCell=new Map(regions.map(r=>[`${r.tileCell!.x},${r.tileCell!.y}`,r]));
  for(const t of tileLayout.values())for(const e of TILE_EDGES){
    if(t.ports[e]==='grass')continue;const d=TILE_EDGE_RULES[e],a=byCell.get(`${t.x},${t.y}`)!,b=byCell.get(`${t.x+d.dx},${t.y+d.dy}`);if(!b||a.regionId>b.regionId)continue;
    connections.push({from:a.regionId,to:b.regionId,purpose:t.ports[e]==='river'?'water':'exploration'});
  }
  const regionIds=new Set(regions.map(r=>r.regionId));
  const liveConnections=connections.filter(c=>regionIds.has(c.from)&&regionIds.has(c.to));
  const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  for(const r of regions)for(const p of r.boundary){bounds.minX=Math.min(bounds.minX,p.x-180);bounds.maxX=Math.max(bounds.maxX,p.x+180);bounds.minY=Math.min(bounds.minY,p.y-180);bounds.maxY=Math.max(bounds.maxY,p.y+180);}
  const home=tileWorld(HOUSE_CELL);
  return {id:SCENE_ID,version:SCENE_VERSION,tileVersion:TILE_LAYOUT_VERSION,regions,objects:[{id:'homestead',art:'object.house',center:home,depth:home.y+180}],connections:liveConnections,bounds};
}
export function sceneHitTest(point:ScenePoint,scene:SceneSnapshot,selectable:ReadonlySet<string>):string|null {
  const hits=scene.regions.filter(r=>r.plotId&&selectable.has(r.plotId)&&pointInPolygon(point,r.boundary));
  hits.sort((a,b)=>b.center.y-a.center.y||a.regionId.localeCompare(b.regionId));return hits[0]?.plotId??null;
}
