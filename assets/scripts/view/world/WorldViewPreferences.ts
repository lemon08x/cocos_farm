import type { WorldCamera } from './FarmWorldViewContract';
import { DEFAULT_WORLD_VIEW } from './WorldViewRegistry';

/** Map version + per-version camera preferences. Separate from the game save
 * (`shanju.cocos.farm.v1`) and the art style key (`shanju.cocos.art.v2`). */
export const WORLD_VIEW_PREFERENCES_KEY='shanju.cocos.world.v1';
export interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void}

const PREFERENCE_SCHEMA_VERSION=2;
interface PreferenceData {version:string;cameras:Record<string,WorldCamera>}

export class WorldViewPreferences {
  constructor(private storage:StorageLike,private fallbackVersion=DEFAULT_WORLD_VIEW){}
  private read():PreferenceData{
    try{
      const raw=this.storage.getItem(WORLD_VIEW_PREFERENCES_KEY);
      if(!raw)return {version:this.fallbackVersion,cameras:{}};
      const data=JSON.parse(raw);
      const cameras:Record<string,WorldCamera>={};
      if(data?.cameras&&typeof data.cameras==='object')for(const [key,value] of Object.entries(data.cameras as Record<string,unknown>)){
        const c=value as WorldCamera;
        if(c&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&Number.isFinite(c.zoom))cameras[key]={x:c.x,y:c.y,zoom:c.zoom};
      }
      // Promote existing installs to the scenic main scene once. Keep camera
      // preferences; later explicit choices (including the legacy view) persist.
      return {version:data?.schemaVersion===PREFERENCE_SCHEMA_VERSION&&typeof data?.version==='string'?data.version:this.fallbackVersion,cameras};
    }catch{return {version:this.fallbackVersion,cameras:{}};}
  }
  private write(data:PreferenceData){try{this.storage.setItem(WORLD_VIEW_PREFERENCES_KEY,JSON.stringify({...data,schemaVersion:PREFERENCE_SCHEMA_VERSION}));}catch(error){console.warn(error);}}
  preferredVersion():string{return this.read().version;}
  selectVersion(id:string){const data=this.read();data.version=id;this.write(data);}
  cameraFor(id:string):WorldCamera|undefined{return this.read().cameras[id];}
  rememberCamera(id:string,camera:WorldCamera){const data=this.read();data.cameras[id]={x:camera.x,y:camera.y,zoom:camera.zoom};this.write(data);}
}
