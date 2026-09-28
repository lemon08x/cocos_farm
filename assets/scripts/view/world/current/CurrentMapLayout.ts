import { HOME_PLOT_ID } from '../../FarmDistrict';

/** Geometry is a UI concern, independent of replacement image bounds. */
export const MAP_LAYOUT={stepX:58,stepY:31,originY:130,hitX:58,hitY:30};
export const BOARD_TILE={width:202,height:152};

export function boardTileSlot(p:any):string {
  // The homestead is the fixed visual origin. Its front garden is still the playable home field.
  if(p?.id===HOME_PLOT_ID)return 'board.home';
  if(p?.landscape)return 'board.'+(p.landscape.kind==='garden'?'garden':p.landscape.kind==='tea'?'garden':'shed');
  if(p?.improvement){
    const use:{[key:string]:string}={yard:'yard',cellar:'shed',shed:'shed',pit:'compost',retting:'water',canal:'water',drain:'water',shelter:'tree'};
    return 'board.'+(use[p.improvement]||'yard');
  }
  if(p?.purpose==='other')return 'board.yard';
  if(p?.kind==='field')return 'board.'+(p.field?.crop==='wheat'?((p.maturity?.days??1)<=0?'wheatMature':'wheatGrowing'):(p.land?.water??0)>=3?'fieldWet':'fieldDry');
  if(p?.kind==='story'&&p.discovery?.id==='spring')return 'board.water';
  if(p?.kind==='story'&&p.discovery?.id==='woodland')return 'board.tree';
  const kind:{[key:string]:string}={wild:'wild',brush:'wild',story:'wild',tree:'tree',rock:'rock',water:'water'};
  return 'board.'+(kind[p?.kind]||'wild');
}
