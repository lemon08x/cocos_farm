import {assetManager,ImageAsset,JsonAsset,resources,SpriteFrame,sys,Texture2D} from 'cc';
import {DEFAULT_SCENIC_STYLE,SCENIC_STYLE_KEY,safeStyleId,stylePackPath,validateScenicManifest,validateStyleCatalog,type ScenicImageSpec,type ScenicManifest,type ScenicStyleInfo} from './ScenicStyleContract';
export type {ScenicImageSpec,ScenicManifest,ScenicStyleInfo} from './ScenicStyleContract';

/** A fully loaded immutable style. Callers commit a switch only after load succeeds. */
export class ScenicArtPack {
  readonly frames=new Map<string,SpriteFrame>();
  private textures:Texture2D[]=[];private images:ImageAsset[]=[];private disposed=false;
  readonly cacheKey=Date.now().toString(36)+Math.random().toString(36).slice(2);
  recoveredFrom:string|null=null;
  private constructor(readonly manifest:ScenicManifest,readonly source:'live'|'bundled'){}
  get palette(){return this.manifest.palette;}
  spec(slot:string){return this.manifest.images[slot];}
  static preferred(){try{const id=sys.localStorage.getItem(SCENIC_STYLE_KEY);return safeStyleId(id)?id:DEFAULT_SCENIC_STYLE;}catch{return DEFAULT_SCENIC_STYLE;}}
  static remember(id:string){if(!safeStyleId(id))throw new Error('无效风格 ID');sys.localStorage.setItem(SCENIC_STYLE_KEY,id);}
  static async catalog():Promise<ScenicStyleInfo[]>{return validateStyleCatalog((await this.json('scenic-styles/index')).data);}
  static async loadPreferred(){
    const id=this.preferred();try{return await this.load(id);}catch(error){if(id===DEFAULT_SCENIC_STYLE)throw error;const fallback=await this.load(DEFAULT_SCENIC_STYLE);fallback.recoveredFrom=id;return fallback;}
  }
  static async load(id=DEFAULT_SCENIC_STYLE):Promise<ScenicArtPack>{
    const found=await this.json(stylePackPath(id)+'/manifest'),pack=new ScenicArtPack(validateScenicManifest(found.data,id),found.source);
    const pending=new Map<string,Promise<SpriteFrame>>(),failures:unknown[]=[];
    await Promise.allSettled(Object.entries(pack.manifest.images).map(async([slot,spec])=>{
      try{let image=pending.get(spec.file);if(!image){image=pack.image(spec);pending.set(spec.file,image);}pack.frames.set(slot,await image);}catch(error){failures.push(error);}
    }));
    if(failures.length){pack.dispose();throw new Error(`风格 ${pack.manifest.name} 加载失败：${String(failures[0])}`);}return pack;
  }
  private static async json(relative:string):Promise<{data:any;source:'live'|'bundled'}>{
    if(sys.isBrowser){
      let response:Response|undefined;try{response=await fetch(`./art-packs/${relative}.json?v=${Date.now()}`,{cache:'no-store'});}catch{/* Offline packaged resources remain usable. */}
      if(response?.ok)return {data:await response.json(),source:'live'};
      if(response&&response.status!==404)throw new Error(`风格读取失败 HTTP ${response.status}`);
    }
    const asset=await new Promise<JsonAsset>((resolve,reject)=>resources.load('art-packs/'+relative,JsonAsset,(error,value)=>error?reject(error):resolve(value)));
    return {data:asset.json,source:'bundled'};
  }
  private async image(spec:ScenicImageSpec){
    const relative=stylePackPath(this.manifest.styleId)+'/'+spec.file;let texture:Texture2D;
    if(this.source==='live'){
      const img=await new Promise<ImageAsset>((resolve,reject)=>assetManager.loadRemote<ImageAsset>(`./art-packs/${relative}?v=${this.cacheKey}`,{ext:'.png',cacheAsset:false},(e,a)=>e?reject(new Error('图片加载失败：'+spec.file)):resolve(a)));
      this.images.push(img);texture=new Texture2D();texture.image=img;this.textures.push(texture);
    }else{
      texture=await new Promise<Texture2D>((resolve,reject)=>resources.load('art-packs/'+relative.slice(0,-4)+'/texture',Texture2D,(e,a)=>e?reject(e):resolve(a)));
      texture.addRef();this.textures.push(texture);
    }
    const filter=this.manifest.textureFilter==='nearest'?Texture2D.Filter.NEAREST:Texture2D.Filter.LINEAR;
    texture.setFilters(filter,filter);texture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE,Texture2D.WrapMode.CLAMP_TO_EDGE);
    if(texture.width!==spec.width*2||texture.height!==spec.height*2)throw new Error('图片实际尺寸不符：'+spec.file);
    const frame=new SpriteFrame();frame.texture=texture;return frame;
  }
  dispose(){if(this.disposed)return;this.disposed=true;for(const f of Array.from(new Set(this.frames.values())))f.destroy();this.frames.clear();for(const t of this.textures){if(this.source==='bundled')t.decRef();else t.destroy();}for(const i of this.images)i.destroy();this.textures=[];this.images=[];}
}
