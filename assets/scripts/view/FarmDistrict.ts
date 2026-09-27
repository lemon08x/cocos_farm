/** Plot x grows east and y grows south. The home unit (0,0) covers p1q1..p3q3. */
export const DISTRICT_SIZE = 3;
export const DISTRICT_STEP_X = 672;
export const DISTRICT_STEP_Y = 576;
export const PLOT_STEP_X = 212;
export const PLOT_STEP_Y = 180;

export interface District { x:number; y:number }
export interface PlotCoordinate { x:number; y:number }
export const HOME_PLOT_ID = 'p2q2';

export function districtOf(x:number,y:number):District {
  return {x:Math.floor((x-1)/DISTRICT_SIZE),y:Math.floor((y-1)/DISTRICT_SIZE)};
}

export function districtOrigin(d:District):PlotCoordinate {
  return {x:d.x*DISTRICT_SIZE+1,y:d.y*DISTRICT_SIZE+1};
}

export function plotIdAt(x:number,y:number):string {return `p${x}q${y}`;}

export function coordinatesOf(id:string):PlotCoordinate|null {
  const m=/^p(-?\d+)q(-?\d+)$/.exec(id);
  return m?{x:Number(m[1]),y:Number(m[2])}:null;
}

export function localPlotOf(x:number,y:number):PlotCoordinate {
  const unit=districtOf(x,y),origin=districtOrigin(unit);
  return {x:x-origin.x+1,y:y-origin.y+1};
}

export function plotAtDistrict(unit:District,local:PlotCoordinate):PlotCoordinate {
  const origin=districtOrigin(unit);
  return {x:origin.x+local.x-1,y:origin.y+local.y-1};
}

export function plotPosition(x:number,y:number):PlotCoordinate {
  const unit=districtOf(x,y),local=localPlotOf(x,y);
  return {x:unit.x*DISTRICT_STEP_X+(local.x-2)*PLOT_STEP_X,
    y:-unit.y*DISTRICT_STEP_Y+(2-local.y)*PLOT_STEP_Y};
}

export function districtAtCamera(panX:number,panY:number,zoom:number):District {
  return {x:Math.round(-panX/(zoom*DISTRICT_STEP_X)),y:Math.round(panY/(zoom*DISTRICT_STEP_Y))};
}

export function cameraForDistrict(district:District,zoom:number):District {
  return {x:-district.x*DISTRICT_STEP_X*zoom,y:district.y*DISTRICT_STEP_Y*zoom};
}
