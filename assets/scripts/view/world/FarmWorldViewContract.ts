/** Map view contract. Implementations render observation plots and report picks;
 * they never receive a Session, issue commands or touch the game save. */
export interface WorldCamera {x:number;y:number;zoom:number}
export interface WorldViewport {width:number;height:number}
export interface WorldPoint {x:number;y:number}
export interface DistrictId {x:number;y:number}

/** Observation-shaped plot snapshot the map may read. */
export interface PlotRenderModel {
  id:string;x:number;y:number;kind:string;reachable?:boolean;purpose?:string;
  improvement?:string;project?:unknown;
  landscape?:{kind?:string;name?:string}|null;
  field?:{crop?:string}|null;
  land?:{water?:number;waterName?:string;soil?:string}|null;
  maturity?:{days?:number;date?:string}|null;
  discovery?:{id?:string;title?:string}|null;
}
export interface WorldRenderModel {plots:PlotRenderModel[];selected:string;camera?:WorldCamera}
export interface FarmWorldViewContract {
  render(model:WorldRenderModel):void;
  hitTest(point:WorldPoint):string|null;
  focusPlot(id:string):WorldCamera|null;
  focusDistrict(id:DistrictId):WorldCamera;
  getCamera():WorldCamera;
  setCamera(camera:WorldCamera):void;
  resize(viewport:WorldViewport):void;
  dispose():void;
}
