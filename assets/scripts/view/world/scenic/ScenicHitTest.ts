import {scenePlotRegion,pointInPolygon} from '../../../FarmCore';
import type {LogicalPoint,ScenicWorldPoint} from './ScenicProjection';
export interface HitCandidate extends LogicalPoint {id:string;interactive?:boolean}
/** Compatibility helper using the same valid scene regions as runtime picking. */
export function hitTestPlot(world:ScenicWorldPoint,plots:Iterable<HitCandidate>):string|null{
  let best:{id:string;y:number}|null=null;
  for(const p of Array.from(plots)){
    if(p.interactive===false)continue;
    const region=scenePlotRegion(p.x,p.y);
    if(region&&pointInPolygon(world,region.boundary)&&(!best||region.center.y>best.y))best={id:p.id,y:region.center.y};
  }
  return best?.id??null;
}
