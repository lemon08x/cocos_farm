import { assetManager, ImageAsset, JsonAsset, resources, SpriteFrame, sys, Texture2D } from 'cc';

/** Dedicated loader for the scenic manifest (assets/resources/art-packs/scenic).
 * Independent from ArtPack: every slot is optional and a missing manifest or
 * image never throws — the graybox Graphics placeholders stay in place. */

export interface ScenicImageSpec { file: string; width: number; height: number; anchor: [number, number] }
export interface ScenicManifest {
  version: 1; id: string; name: string;
  palette: Record<string, string>;
  images: Record<string, ScenicImageSpec>;
}
export const SCENIC_DEFAULT_PALETTE: Record<string, string> = {
  ink: '#213d2c', muted: '#75836f', paper: '#f8f3e6', cream: '#eee4cb',
  green: '#2e5240', gold: '#d9a441', line: '#d9cfb4', status: '#7aa95c',
  caption: '#8a9478', disabled: '#b9bfae', warning: '#c96f3b', shade: '#1c3527',
  base: '#5f8a4e'
};
const safeFile = (s: unknown): s is string => typeof s === 'string' && /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(s);

export class ScenicArtPack {
  private static liveAvailable = false;
  readonly frames = new Map<string, SpriteFrame>();
  private ownedTextures: Texture2D[] = [];
  private ownedImages: ImageAsset[] = [];
  private constructor(readonly manifest: ScenicManifest | null, readonly source: 'live' | 'bundled' | 'empty') {}
  get palette(): Record<string, string> { return { ...SCENIC_DEFAULT_PALETTE, ...(this.manifest?.palette ?? {}) }; }
  spec(slot: string): ScenicImageSpec | undefined { return this.manifest?.images?.[slot]; }

  static async load(): Promise<ScenicArtPack> {
    let manifest: ScenicManifest | null = null, source: 'live' | 'bundled' | 'empty' = 'empty';
    try {
      const found = await this.manifestJson();
      if (found) { manifest = found.data; source = found.source; }
    } catch (error) { console.warn(error); }
    const pack = new ScenicArtPack(manifest, manifest ? source : 'empty');
    if (manifest) await Promise.allSettled(Object.entries(manifest.images).map(async ([slot, spec]) => {
      try { pack.frames.set(slot, await pack.image(spec)); }
      catch (error) { console.warn('田园场景图片缺失：' + slot, error); }
    }));
    return pack;
  }
  private static validate(m: any): ScenicManifest {
    if (m?.version !== 1 || m.id !== 'scenic' || typeof m.name !== 'string' || !m.images || typeof m.images !== 'object')
      throw new Error('scenic manifest.json 格式或 id 不正确');
    const images: Record<string, ScenicImageSpec> = {};
    for (const [slot, s] of Object.entries(m.images as Record<string, any>)) {
      if (!safeFile(s?.file) || !Number.isFinite(s?.width) || !Number.isFinite(s?.height) || s.width <= 0 || s.height <= 0 || s.width > 4096 || s.height > 4096) continue;
      const anchor: [number, number] = Array.isArray(s.anchor) && s.anchor.length === 2 && s.anchor.every(Number.isFinite) ? [s.anchor[0], s.anchor[1]] : [0.5, 0.5];
      images[slot] = { file: s.file, width: s.width, height: s.height, anchor };
    }
    const palette: Record<string, string> = {};
    if (m.palette && typeof m.palette === 'object')
      for (const [key, value] of Object.entries(m.palette as Record<string, any>))
        if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) palette[key] = value;
    return { version: 1, id: 'scenic', name: m.name, palette, images };
  }
  private static async manifestJson(): Promise<{ data: ScenicManifest; source: 'live' | 'bundled' } | null> {
    if (sys.isBrowser) {
      let response: Response | undefined;
      try { response = await fetch(`./art-packs/scenic/manifest.json?v=${Date.now()}`, { cache: 'no-store' }); }
      catch { /* fall back to bundled resources */ }
      if (response?.ok) { this.liveAvailable = true; return { data: this.validate(await response.json()), source: 'live' }; }
      if (this.liveAvailable) throw new Error('田园场景美术配置不可用：manifest.json');
      if (response && response.status !== 404) throw new Error(`田园场景美术配置读取失败 HTTP ${response.status}`);
    }
    try {
      const asset = await new Promise<JsonAsset>((resolve, reject) => resources.load('art-packs/scenic/manifest', JsonAsset, (e, a) => e ? reject(e) : resolve(a)));
      return { data: this.validate(asset.json), source: 'bundled' };
    } catch { return null; }
  }
  private async image(s: ScenicImageSpec): Promise<SpriteFrame> {
    let texture: Texture2D;
    if (this.source === 'live') {
      const ext = '.' + s.file.split('.').pop();
      const img = await new Promise<ImageAsset>((resolve, reject) =>
        assetManager.loadRemote<ImageAsset>(`./art-packs/scenic/${s.file}?v=${Date.now()}`, { ext, cacheAsset: false }, (e, a) => e ? reject(new Error(`图片加载失败：${s.file}`)) : resolve(a)));
      this.ownedImages.push(img);
      texture = new Texture2D(); texture.image = img; this.ownedTextures.push(texture);
    } else {
      const p = `art-packs/scenic/${s.file.replace(/\.[^.]+$/, '')}/texture`;
      texture = await new Promise<Texture2D>((resolve, reject) => resources.load(p, Texture2D, (e, a) => e ? reject(e) : resolve(a)));
      texture.addRef(); this.ownedTextures.push(texture);
    }
    const frame = new SpriteFrame(); frame.texture = texture;
    return frame;
  }
  dispose() {
    for (const f of Array.from(this.frames.values())) f.destroy(); this.frames.clear();
    for (const t of this.ownedTextures) { if (this.source === 'bundled') t.decRef(); else t.destroy(); }
    for (const i of this.ownedImages) i.destroy();
    this.ownedTextures = []; this.ownedImages = [];
  }
}
