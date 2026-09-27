export const plotTargetId=(target:string)=>/^p-?\d+q-?\d+/.exec(target)?.[0]??target;
/** Global plot axes: x east, y south; home unit (0,0) owns x/y 1..3. */
export const FARM_UNIT_SIZE=3;
export const farmUnitOf=(coordinate:number)=>Math.floor((coordinate-1)/FARM_UNIT_SIZE);
export const farmUnitStart=(coordinate:number)=>farmUnitOf(coordinate)*FARM_UNIT_SIZE+1;
export const farmLocalOf=(coordinate:number)=>coordinate-farmUnitStart(coordinate)+1;
