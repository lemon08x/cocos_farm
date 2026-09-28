/** Tile-art contract. No Cocos imports and no gameplay state or image inference. */
export const TILE_ART_VERSION=1;
export const TILE_EDGES=['ul','ur','lr','ll'] as const;
export type TileEdge=typeof TILE_EDGES[number];
export type TileSocket='grass'|'road'|'river';
export type TileFamily='grass'|'field.dry'|'field.wet'|'courtyard'|'road'|'river'|'bridge';
export interface TileFootprint {x:number;y:number}
export interface TileArtEntry {
  id:string;family:string;layer:'ground'|'crop'|'object';
  sockets?:Record<TileEdge,TileSocket>;footprint:TileFootprint[];variant:number;
  description:string;
}
export const TILE_ART_SPEC={
  id:'scenic-tiles',version:TILE_ART_VERSION,
  display:{width:300,height:180},source:{width:600,height:360},
  anchor:[.5,.5],anchorOrigin:'top-left',light:'upper-left',rotationAllowed:false,
  edgeStrip:{width:352,height:96,lockDepth:16,blendDepth:16},
  corner:{size:80,lockRadius:16,blendRadius:16},
  sockets:{grass:{opening:0},road:{opening:.24},river:{opening:.40}},
  objectTopMargin:360,
} as const;
export const TILE_EDGE_RULES:Record<TileEdge,{opposite:TileEdge;dx:number;dy:number;axis:'x'|'y';side:1|-1;start:[number,number];end:[number,number]}>= {
  ul:{opposite:'lr',dx:-1,dy:0,axis:'x',side:1,start:[300,0],end:[0,180]},
  ur:{opposite:'ll',dx:0,dy:-1,axis:'y',side:1,start:[300,0],end:[600,180]},
  lr:{opposite:'ul',dx:1,dy:0,axis:'x',side:-1,start:[600,180],end:[300,360]},
  ll:{opposite:'ur',dx:0,dy:1,axis:'y',side:-1,start:[0,180],end:[300,360]},
};
const allGrass=():Record<TileEdge,TileSocket>=>({ul:'grass',ur:'grass',lr:'grass',ll:'grass'});
const sockets=(mask:number,kind:TileSocket)=>Object.fromEntries(TILE_EDGES.map((edge,i)=>[edge,mask&(1<<i)?kind:'grass'])) as Record<TileEdge,TileSocket>;
const dirs=(mask:number)=>TILE_EDGES.filter((_,i)=>mask&(1<<i)).join('-');
const one=[{x:0,y:0}];
export function tileArtCatalog():TileArtEntry[]{
  const entries:TileArtEntry[]=[];
  for(const [family,count,description] of [
    ['grass',3,'完整草地，中心细节可变化，边缘服从公共接口'],
    ['field.dry',1,'干燥耕地，土壤和田埂位于内部，完整草地外缘'],
    ['field.wet',1,'湿润耕地，保持与干地相同的田埂及草地外缘'],
    ['courtyard',1,'院落地面，石土细节在内部，草地外缘，不含房屋'],
  ] as const)for(let variant=0;variant<count;variant++)entries.push({id:`${family}.${variant}`,family,layer:'ground',sockets:allGrass(),footprint:one,variant,description});
  for(const family of ['road','river'] as const)for(let mask=1;mask<=15;mask++){
    // Four-way river junctions are not part of this pack.
    if(family==='river'&&mask===15)continue;
    const count=TILE_EDGES.filter((_,i)=>mask&(1<<i)).length;
    const shape=count===1?'end':count===2?(mask===5||mask===10?'straight':'turn'):count===3?'tee':'cross';
    entries.push({id:`${family}.${shape}.${dirs(mask)}`,family,layer:'ground',sockets:sockets(mask,family),footprint:one,variant:0,
      description:family==='road'?'土路与两侧草地；仅指定的边开放路口':'河水与两侧河岸；仅指定的边开放水口，单口模块为封闭河源/水潭'});
  }
  for(const roadMask of [5,10]){
    const ports=sockets(15^roadMask,'river');for(const e of TILE_EDGES.filter((_,i)=>roadMask&(1<<i)))ports[e]='road';
    entries.push({id:`bridge.${dirs(roadMask)}`,family:'bridge',layer:'ground',sockets:ports,footprint:one,variant:0,description:'一格完整河流和跨河桥面；道路连接桥的两端，河水从另一对边穿过'});
  }
  for(const crop of ['wheat','default'])for(const stage of ['growing','mature'])entries.push({id:`crop.${crop}.${stage}`,family:'crop',layer:'crop',footprint:one,variant:0,description:`${crop==='wheat'?'小麦':'通用作物'}${stage==='growing'?'生长期':'成熟期'}；仅作物，背景及行间透明，无土壤底图`});
  entries.push({id:'object.tree',family:'tree',layer:'object',footprint:one,variant:0,description:'树干与树冠，地面外透明，树根对齐地面中心；不附带草地底板'});
  entries.push({id:'object.house',family:'house',layer:'object',footprint:[{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}],variant:0,description:'占地 2×2 单元的完整农舍建筑，屋顶可向上伸出；不生成四栋房屋，不附带院落地面'});
  return entries;
}
export function tileCanvas(entry:TileArtEntry){
  const centers=entry.footprint.map(p=>({x:(p.x-p.y)*300,y:(p.x+p.y)*180}));
  const left=Math.min(...centers.map(p=>p.x))-300,right=Math.max(...centers.map(p=>p.x))+300;
  const top=Math.min(...centers.map(p=>p.y))-180-(entry.layer==='object'?TILE_ART_SPEC.objectTopMargin:0),bottom=Math.max(...centers.map(p=>p.y))+180;
  return {width:right-left,height:bottom-top,origin:{x:-left,y:-top},anchor:[-left/(right-left),-top/(bottom-top)],centers:centers.map(p=>({x:p.x-left,y:p.y-top}))};
}
export function tileSocketsMatch(a:TileArtEntry,edge:TileEdge,b:TileArtEntry):boolean {
  return !!a.sockets&&!!b.sockets&&a.sockets[edge]===b.sockets[TILE_EDGE_RULES[edge].opposite];
}
/** World topology chooses sockets. Artwork does not decide whether a cell is farmable. */
export function selectTileArt(entries:TileArtEntry[],family:TileFamily,ports:Record<TileEdge,TileSocket>,cell:TileFootprint):TileArtEntry {
  const matches=entries.filter(e=>e.layer==='ground'&&e.family===family&&TILE_EDGES.every(k=>e.sockets?.[k]===ports[k])).sort((a,b)=>a.id.localeCompare(b.id));
  if(!matches.length)throw new Error(`缺少图块：${family} ${TILE_EDGES.map(k=>`${k}=${ports[k]}`).join(' ')}`);
  const hash=((Math.imul(cell.x,73856093))^(Math.imul(cell.y,19349663)))>>>0;return matches[hash%matches.length];
}
