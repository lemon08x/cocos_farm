import {scenePolygonsIntersect} from '../../../FarmCore';
import type {SceneSnapshot} from '../FarmWorldViewContract';
/** Check actual game data, never exempt a materialized plot because it is hidden. */
export function validateScenicLayout(scene:SceneSnapshot):string[]{
  const errors:string[]=[],ids=new Set<string>(),plots=new Set<string>();
  const occupied=new Set<string>();
  for(const r of scene.regions){
    if(ids.has(r.regionId))errors.push('重复区域 '+r.regionId);ids.add(r.regionId);
    if(r.tileCell){const key=r.tileCell.x+','+r.tileCell.y;if(occupied.has(key))errors.push('单元重复占位 '+key);occupied.add(key);}
    if(r.plotId){
      if(plots.has(r.plotId))errors.push('重复地块 '+r.plotId);plots.add(r.plotId);
    }else if(r.capabilities.selectable)errors.push('环境区域不可作为田地选择 '+r.regionId);
  }
  for(const c of scene.connections)if(!ids.has(c.from)||!ids.has(c.to))errors.push('连接缺少端点 '+c.from+' → '+c.to);
  return errors;
}
