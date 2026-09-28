import {logicalToWorld,worldToLogical,cellDiamond,type LogicalPoint} from './geometry.js';
import {PATHS,RIVER_SEGMENTS,BRIDGES} from './layout.js';
import {TILE_EDGES,TILE_EDGE_RULES,selectTileArt,tileArtCatalog,type TileSocket,type TileFamily} from './tile-art.js';

/** Stable game coordinates are embedded in a finer scene lattice. Odd cells
 * give the former inter-plot belts their own ground without moving save IDs. */
export const TILE_LAYOUT_VERSION=1;
export const plotTile=(p:LogicalPoint)=>({x:p.x*2,y:p.y*2});
export const tileWorld=(p:LogicalPoint)=>logicalToWorld({x:p.x-2,y:p.y-2});
export const plotWorld=(p:LogicalPoint)=>tileWorld(plotTile(p));
export const worldPlot=(p:LogicalPoint)=>worldToLogical({x:p.x/2,y:p.y/2});
export const HOUSE_CELL={x:-3,y:0};
export interface MapTile extends LogicalPoint {id:string;kind:'grass'|'courtyard'|'road'|'river'|'bridge';ports:Record<typeof TILE_EDGES[number],TileSocket>;art:string;source?:string}
const key=(p:LogicalPoint)=>`${p.x},${p.y}`;
const catalog=tileArtCatalog();
const grass=():MapTile['ports']=>({ul:'grass',ur:'grass',lr:'grass',ll:'grass'});
const move=(p:LogicalPoint,e:typeof TILE_EDGES[number])=>({x:p.x+TILE_EDGE_RULES[e].dx,y:p.y+TILE_EDGE_RULES[e].dy});
export function makeTileLayout(validPlot:(x:number,y:number)=>boolean){
  const fixed=new Map<string,MapTile>();
  const put=(p:LogicalPoint,kind:MapTile['kind'],source?:string)=>{const tile:MapTile={...p,id:`cell.${p.x}.${p.y}`,kind,ports:grass(),art:'',source};fixed.set(key(p),tile);return tile;};
  const connect=(a:LogicalPoint,b:LogicalPoint,socket:TileSocket)=>{
    const e=TILE_EDGES.find(e=>{const r=TILE_EDGE_RULES[e];return b.x-a.x===r.dx&&b.y-a.y===r.dy;});
    if(!e)throw new Error('Scene tile link is not adjacent');
    fixed.get(key(a))!.ports[e]=socket;fixed.get(key(b))!.ports[TILE_EDGE_RULES[e].opposite]=socket;
  };
  const river:LogicalPoint[]=[];
  RIVER_SEGMENTS.forEach((s,i)=>{
    const p=plotTile(s.cell);if(i){const prev=river[river.length-1];river.push({x:(p.x+prev.x)/2,y:(p.y+prev.y)/2});}river.push(p);
  });
  river.unshift({x:river[0].x,y:river[0].y-1});
  river.forEach((p,i)=>put(p,'river',i===0?'env.spring':p.x%2===0&&p.y%2===0?`river.${p.x/2}.${p.y/2}`:undefined));
  for(let i=1;i<river.length;i++)connect(river[i-1],river[i],'river');
  // End modules visibly close the river; the northern module is its spring.
  for(let x=-4;x<=-1;x++)for(let y=-1;y<=2;y++){
    if(x%2===0&&y%2===0&&validPlot(x/2,y/2))continue;
    if(!fixed.has(`${x},${y}`))put({x,y},'courtyard');
  }
  const isPlot=(p:LogicalPoint)=>p.x%2===0&&p.y%2===0&&validPlot(p.x/2,p.y/2);
  const isHouse=(p:LogicalPoint)=>p.x>=HOUSE_CELL.x&&p.x<=HOUSE_CELL.x+1&&p.y>=HOUSE_CELL.y&&p.y<=HOUSE_CELL.y+1;
  const canRoad=(p:LogicalPoint)=>!isPlot(p)&&!isHouse(p)&&!['river','bridge'].includes(fixed.get(key(p))?.kind??'');
  // Explicitly mapped bridge approaches connect both banks but never make water turn onto a road.
  BRIDGES.forEach((b,i)=>{
    const p=plotTile(b.cell),t=fixed.get(key(p))!;t.kind='bridge';
    for(const dy of [-1,1]){const n={x:p.x,y:p.y+dy};put(n,'road');connect(p,n,'road');}
  });
  const route=(a:LogicalPoint,b:LogicalPoint)=>{
    if(key(a)===key(b))return;
    const minX=Math.min(a.x,b.x)-5,maxX=Math.max(a.x,b.x)+5,minY=Math.min(a.y,b.y)-5,maxY=Math.max(a.y,b.y)+5;
    const queue=[a],prev=new Map<string,LogicalPoint|null>([[key(a),null]]);let found=false;
    for(let at=0;at<queue.length;at++){
      const p=queue[at];if(key(p)===key(b)){found=true;break;}
      for(const e of TILE_EDGES){const n=move(p,e);if(n.x<minX||n.x>maxX||n.y<minY||n.y>maxY||prev.has(key(n))||!canRoad(n))continue;prev.set(key(n),p);queue.push(n);}
    }
    if(!found)throw new Error(`道路无法映射：${key(a)} → ${key(b)}`);
    const chain:LogicalPoint[]=[];for(let p:LogicalPoint|null=b;p;p=prev.get(key(p))??null)chain.push(p);chain.reverse();
    for(const p of chain)if(fixed.get(key(p))?.kind!=='road')put(p,'road');
    for(let i=1;i<chain.length;i++)connect(chain[i-1],chain[i],'road');
  };
  const snap=(world:LogicalPoint)=>{const p=worldToLogical(world),base={x:Math.round(p.x*2),y:Math.round(p.y*2)};
    for(let r=0;r<=5;r++)for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){if(Math.abs(dx)+Math.abs(dy)!==r)continue;const n={x:base.x+dx,y:base.y+dy};if(canRoad(n))return n;}
    throw new Error('道路节点无空闲单元');
  };
  // Split routes at river crossings. The bridge itself is the only crossing.
  for(const path of PATHS){const points=path.points.map(snap);for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    const bridge=BRIDGES.find(v=>{const c=plotTile(v.cell);return (a.y-c.y)*(b.y-c.y)<0&&Math.abs((a.x+b.x)/2-c.x)<=3;});
    if(bridge){const c=plotTile(bridge.cell),sign=a.y<c.y?-1:1;route(a,{x:c.x,y:c.y+sign});route({x:c.x,y:c.y-sign},b);}else route(a,b);
  }}
  // Join touching road cells so the visual sockets describe the whole network.
  for(const t of fixed.values())if(t.kind==='road')for(const e of TILE_EDGES){const n=move(t,e);if(fixed.get(key(n))?.kind==='road')connect(t,n,'road');}
  for(const t of fixed.values())t.art=selectTileArt(catalog,t.kind as TileFamily,t.ports,t).id;
  return fixed;
}
export function tileBoundary(p:LogicalPoint){return cellDiamond(tileWorld(p));}
export function grassArt(p:LogicalPoint){return selectTileArt(catalog,'grass',grass(),p).id;}
