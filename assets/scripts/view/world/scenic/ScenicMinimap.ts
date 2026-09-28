import type { PlotRenderModel, SceneSnapshot, WorldCamera, WorldPoint, WorldViewport } from '../FarmWorldViewContract';
import {buildSceneSnapshot} from '../../../FarmCore';

export type MinimapTone='mist'|'field'|'water'|'green'|'home'|'facility'|'path'|'bridge';
export interface MinimapCell {id?:string;x:number;y:number;tone:MinimapTone;boundary:WorldPoint[]}
export interface MinimapView {x:number;y:number;w:number;h:number}
export interface MinimapModel {cells:MinimapCell[];environment:MinimapCell[];view:MinimapView;scale:number}
export function minimapTone(p:Partial<PlotRenderModel>):MinimapTone {
  if(p.kind==='unknown')return 'mist';
  if(p.landscape||p.improvement||p.purpose==='other'||(p.project&&(p.project.done??0)<(p.project.total??0)))return 'facility';
  if(p.kind==='water'||p.discovery?.id==='spring')return 'water';
  return p.kind==='field'?'field':'green';
}
export function buildMinimapModel(plots:PlotRenderModel[],camera:WorldCamera,viewport:WorldViewport,size:number,scene?:SceneSnapshot):MinimapModel {
  const map=scene??buildSceneSnapshot(plots) as SceneSnapshot;
  const bounds=map.bounds,cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;
  const scale=(size-28)/Math.max(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY,260);
  const project=(p:WorldPoint)=>({x:(p.x-cx)*scale,y:(p.y-cy)*scale});
  const byId=new Map(plots.map(p=>[p.id,p]));
  const cells:MinimapCell[]=[],environment:MinimapCell[]=[];
  for(const r of map.regions){
    const at=project(r.center),boundary=r.boundary.map(project);
    if(r.plotId){const p=byId.get(r.plotId);if(p)cells.push({id:p.id,...at,boundary,tone:p.id==='p2q2'?'home':minimapTone(p)});}
    else environment.push({...at,boundary,tone:r.type==='river'||r.capabilities.waterSource?'water':r.type==='path'?'path':r.type==='bridge'?'bridge':'home'});
  }
  const hw=viewport.width/2/camera.zoom,hh=viewport.height/2/camera.zoom,tl=project({x:camera.x-hw,y:camera.y-hh});
  return {cells,environment,view:{...tl,w:hw*2*scale,h:hh*2*scale},scale};
}
export function minimapSignature(plots:Partial<PlotRenderModel>[],camera:WorldCamera):string {
  return JSON.stringify([plots.map(p=>[p.id,p.kind,p.reachable,p.purpose,p.improvement,p.project,p.landscape,p.field,p.land?.water,p.discovery?.id]),camera]);
}
