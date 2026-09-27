import { assetManager, ImageAsset, JsonAsset, resources, SpriteFrame, sys, Texture2D } from 'cc';

export type Palette = Record<string, string>;
export interface ImageSlot {
  file: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  fit?: 'contain' | 'stretch';
  /** Optional nine-slice borders in source-image pixels: left, top, right, bottom. */
  borders?: [number, number, number, number];
}
export interface ArtManifest {
  version: 1;
  id: string;
  name: string;
  palette: Palette;
  images: Record<string, ImageSlot>;
  scene: Array<{ slot: string; x: number; y: number; width?: number; height?: number }>;
  clouds: boolean;
  groundMode?: 'tiles' | 'continuous' | 'board';
}
export interface PackInfo { id: string; name: string; }
const requiredSlots = ['landscape','cottage','cloud','terrain.wild','terrain.unknown','terrain.fieldDry','terrain.fieldWet','terrain.water','terrain.story','terrain.rock','terrain.tree','selection','crop.default.growing','crop.default.mature','icon.background','icon.calendar','icon.book','icon.basket','icon.leaf','icon.rest','icon.home','icon.more'];
const boardSlots = [
  'icon.field','icon.calendar','icon.list','icon.basket','icon.more','icon.hoe','icon.rest','icon.back','icon.close','icon.next',
  'board.ground','board.canalH','board.canalV','board.home','board.wild','board.fieldDry','board.fieldWet',
  'board.wheatGrowing','board.wheatMature','board.tree','board.rock','board.water',
  'board.yard','board.garden','board.compost','board.shed'
];
const requiredColors = ['ink','muted','paper','cream','green','gold','line','status','caption','disabled','warning','shade','base'];
const safeId = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9][a-z0-9_-]{0,47}$/.test(s);
const safeFile = (s: unknown): s is string => typeof s === 'string' && /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(s);

/** Presentation only. No game state, actions, calendar, or save data enter this class. */
export class ArtPack {
  private static liveAvailable = false;
  readonly frames = new Map<string, SpriteFrame>();
  private ownedTextures: Texture2D[] = [];
  private ownedImages: ImageAsset[] = [];
  constructor(readonly manifest: ArtManifest, readonly source: 'live' | 'bundled') {}

  static async catalog(): Promise<PackInfo[]> {
    const value = await this.json('index');
    if (!Array.isArray(value.data.packs) || !value.data.packs.length) throw new Error('美术目录缺少 packs');
    return value.data.packs.map((p: any) => {
      if (!safeId(p.id) || typeof p.name !== 'string') throw new Error('美术目录条目无效');
      return {id:p.id, name:p.name};
    });
  }

  static async load(id: string): Promise<ArtPack> {
    if (!safeId(id)) throw new Error('无效的风格名称');
    const {data, source} = await this.json(`${id}/manifest`);
    this.validate(data, id);
    const pack = new ArtPack(data, source);
    try {
      // Finish all requests before disposing a failed pack. No late image can resurrect a discarded skin.
      const results = await Promise.allSettled(Object.entries(data.images).map(async ([slot, spec]: [string, ImageSlot]) => {
        const frame = await pack.image(id, spec);
        pack.frames.set(slot, frame);
      }));
      const failure = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
      if (failure) throw failure.reason;
      return pack;
    } catch (error) { pack.dispose(); throw error; }
  }

  private static async json(path: string): Promise<{data:any;source:'live'|'bundled'}> {
    if (sys.isBrowser) {
      // Our local preview server serves the editable art-packs directory directly.
      // Static exports receive a copy at the same relative URL. Editor preview uses resources fallback.
      let response: Response | undefined;
      try { response = await fetch(`./art-packs/${path}.json?v=${Date.now()}`, {cache:'no-store'}); }
      catch { /* Cocos preview/native can use bundled resources. */ }
      if (response?.ok) {const data=await response.json();this.liveAvailable=true;return {data,source:'live'};}
      if(this.liveAvailable) throw new Error(`美术配置不可用：${path}.json`);
      if (response && response.status !== 404) throw new Error(`美术配置读取失败 HTTP ${response.status}`);
    }
    const asset = await new Promise<JsonAsset>((resolve,reject)=>resources.load(`art-packs/${path}`,JsonAsset,(e,a)=>e?reject(e):resolve(a)));
    return {data:asset.json,source:'bundled'};
  }

  private static validate(m:any,id:string) {
    if (m?.version !== 1 || m.id !== id || typeof m.name !== 'string' || !m.images || !m.palette || !Array.isArray(m.scene)) throw new Error('manifest.json 格式或 id 不正确');
    if(m.groundMode && !['tiles','continuous','board'].includes(m.groundMode)) throw new Error('groundMode 无效');
    for (const key of requiredColors) if (!/^#[0-9a-fA-F]{6}$/.test(m.palette[key] || '')) throw new Error(`缺少有效颜色 palette.${key}`);
    for (const key of m.groundMode==='board'?boardSlots:requiredSlots) if (!m.images[key]) throw new Error(`缺少图片槽位 ${key}`);
    for (const [key,s] of Object.entries(m.images) as [string,ImageSlot][]) {
      if (!safeFile(s.file) || !Number.isFinite(s.width) || !Number.isFinite(s.height) || s.width<=0 || s.height<=0 || s.width>4096 || s.height>4096) throw new Error(`图片配置无效：${key}`);
      if ((s.x!==undefined&&!Number.isFinite(s.x)) || (s.y!==undefined&&!Number.isFinite(s.y))) throw new Error(`图片偏移无效：${key}`);
      if (s.fit && !['contain','stretch'].includes(s.fit)) throw new Error(`图片适配方式无效：${key}`);
      if (s.borders && (s.borders.length!==4 || s.borders.some(n=>!Number.isFinite(n)||n<0))) throw new Error(`九宫格边距无效：${key}`);
    }
    for (const l of m.scene) if (!m.images[l.slot] || !Number.isFinite(l.x) || !Number.isFinite(l.y) || (l.width!==undefined&&(!Number.isFinite(l.width)||l.width<=0)) || (l.height!==undefined&&(!Number.isFinite(l.height)||l.height<=0))) throw new Error('场景图层配置无效');
  }

  private async image(id:string,s:ImageSlot): Promise<SpriteFrame> {
    let texture:Texture2D;
    if (this.source==='live') {
      const ext='.'+s.file.split('.').pop();
      const img=await new Promise<ImageAsset>((resolve,reject)=>assetManager.loadRemote<ImageAsset>(`./art-packs/${id}/${s.file}?v=${Date.now()}`,{ext,cacheAsset:false},(e,a)=>e?reject(new Error(`图片加载失败：${s.file}`)):resolve(a)));
      this.ownedImages.push(img);
      texture=new Texture2D();texture.image=img;this.ownedTextures.push(texture);
    } else {
      const p=`art-packs/${id}/${s.file.replace(/\.[^.]+$/,'')}/texture`;
      texture=await new Promise<Texture2D>((resolve,reject)=>resources.load(p,Texture2D,(e,a)=>e?reject(e):resolve(a)));
      // Retain bundled textures while this pack is visible; release only our reference on dispose.
      texture.addRef();this.ownedTextures.push(texture);
    }
    if(s.borders){const [l,t,r,b]=s.borders;if(l+r>=texture.width||t+b>=texture.height)throw new Error(`九宫格边距超过图片尺寸：${s.file}`);}
    const frame=new SpriteFrame();frame.texture=texture;
    if(s.borders){const [l,t,r,b]=s.borders;frame.insetLeft=l;frame.insetTop=t;frame.insetRight=r;frame.insetBottom=b;}
    return frame;
  }
  dispose(){for(const f of Array.from(this.frames.values()))f.destroy();this.frames.clear();for(const t of this.ownedTextures){if(this.source==='bundled')t.decRef();else t.destroy();}for(const i of this.ownedImages)i.destroy();this.ownedTextures=[];this.ownedImages=[];}
}
