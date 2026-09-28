import type { FarmWorldViewContract } from './FarmWorldViewContract';

export interface WorldViewInfo {id:string;name:string}
export interface WorldViewFactory<H> extends WorldViewInfo {create(host:H):Promise<FarmWorldViewContract>}

/** Map versions known to the build. Factories are registered per host type by each implementation. */
export const WORLD_VIEW_VERSIONS:WorldViewInfo[]=[{id:'current',name:'田格手账'}];

export class WorldViewRegistry<H> {
  private factories=new Map<string,WorldViewFactory<H>>();
  register(factory:WorldViewFactory<H>){this.factories.set(factory.id,factory);}
  has(id:string){return this.factories.has(id);}
  list():WorldViewInfo[]{return Array.from(this.factories.values(),({id,name})=>({id,name}));}
  async create(id:string,host:H):Promise<FarmWorldViewContract>{
    const factory=this.factories.get(id);
    if(!factory)throw new Error('Unknown world view version: '+id);
    return factory.create(host);
  }
}
