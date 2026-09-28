import { Node } from 'cc';
import { ArtRenderer } from '../art/ArtRenderer';
import { CurrentWorldView } from './world/current/CurrentWorldView';
import type { FarmWorldViewContract } from './world/FarmWorldViewContract';

export { MAP_LAYOUT, boardTileSlot } from './world/current/CurrentMapLayout';

/** Compatibility entry with the pre-P1 API. Delegates to the current world view
 * implementation; new callers should use the contract in view/world instead. */
export class FarmWorldView {
  private impl:CurrentWorldView;
  constructor(impl:CurrentWorldView);
  constructor(base:Node,map:Node,art:ArtRenderer);
  constructor(baseOrImpl:Node|CurrentWorldView,map?:Node,art?:ArtRenderer){
    this.impl=baseOrImpl instanceof CurrentWorldView?baseOrImpl:new CurrentWorldView(baseOrImpl,map!,art!);
  }
  static adapt(view:FarmWorldViewContract):FarmWorldView{
    if(view instanceof CurrentWorldView)return new FarmWorldView(view);
    throw new Error('FarmWorldView cannot adapt world view version: '+(view?.constructor?.name||'unknown'));
  }
  get continuous(){return this.impl.continuous;}
  get board(){return this.impl.board;}
  get panLimits(){return this.impl.panLimits;}
  setArt(art:ArtRenderer){this.impl.setArt(art);}
  background(){this.impl.background();}
  render(observedPlots:any[],selected:string,panX:number,panY:number,zoom=1){this.impl.render({plots:observedPlots,selected,camera:{x:panX,y:panY,zoom}});}
  hit(x:number,y:number){return this.impl.hit(x,y);}
  pulse(id:string){this.impl.pulse(id);}
  destroy(){this.impl.dispose();}
}
