import { Graphics, Label, Node, Sprite, Tween, UITransform, tween, Vec3 } from 'cc';
import { tint, visualNode } from '../../../art/ArtRenderer';
import { coordinatesOf } from '../../FarmDistrict';
import { plotName } from '../../FarmPresentation';
import type { DistrictId, FarmWorldViewContract, PlotRenderModel, WorldCamera, WorldPoint, WorldRenderModel, WorldViewport } from '../FarmWorldViewContract';
import type { WorldViewRegistry } from '../WorldViewRegistry';
import type { WorldViewHost } from '../current/CurrentWorldView';
import { DIAMOND_HALF_HEIGHT, DIAMOND_HALF_WIDTH, ScenicWorldPoint, logicalToWorld } from './ScenicProjection';
import * as layout from './ScenicLayout';
import { hitTestPlot } from './ScenicHitTest';
import { ScenicArtPack } from './ScenicArtPack';
import { CHUNK_SIZE, ScenicChunkStore, chunkContent, chunkKey, visibleChunkKeys } from './ScenicChunkStore';

export function registerScenicWorldView(registry: WorldViewRegistry<WorldViewHost>) {
  registry.register({
    id: 'scenic', name: '田园场景',
    create: async host => new ScenicWorldView(host.base, host.map, await ScenicArtPack.load())
  });
}

interface PlotEntry { node: Node; key: string; x: number; y: number; interactive: boolean }
type LayerName = 'ground' | 'river' | 'plot' | 'path' | 'env' | 'overlay';

/** Graybox fallback colors; the scenic manifest palette overrides where a key exists. */
const FALLBACK_COLORS: Record<string, string> = {
  dry: '#9a7648', wet: '#5f5140', water: '#5b8fa8', rock: '#8a8a80'
};
/** Grass diamond variants for non-field plots (wild/brush/tree/rock/story ground),
 * picked by a deterministic coordinate hash — never the core RNG. */
const GRASS_VARIANTS = ['#5f8a4e', '#649355', '#578549'];
const BRUSH_GRASS = '#4f7a42';
const ROCK_GROUND = '#7e8a6a';
const PATH_EDGE = '#96805a';
const PATH_FILL = '#c2a26e';

/** Deterministic per-cell hash for decoration variants (independent of core RNG). */
function cellHash(x: number, y: number): number {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}

/** Scenic (田园场景) world view: layered oblique rendering driven by the scenic
 * art pack, with Graphics fallbacks when a slot is missing.
 * Rendering only — no rules commands, no save access, selection via the contract. */
export class ScenicWorldView implements FarmWorldViewContract {
  private camera: WorldCamera = { ...layout.DEFAULT_CAMERA };
  private viewport: WorldViewport = { width: 720, height: 1280 };
  private layers: Record<LayerName, Node> | null = null;
  private plots = new Map<string, PlotEntry>();
  private chunkStore = new ScenicChunkStore();
  private chunks = new Map<string, { ground: Node; river: Node; path: Node; env: Node }>();
  private chunkOccupiedSig = '';
  constructor(private base: Node, private map: Node, private pack: ScenicArtPack) {}
  get images(): ScenicArtPack { return this.pack; }
  private get palette() { return this.pack.palette; }

  render(model: WorldRenderModel) {
    if (model.camera) this.camera = { ...model.camera };
    this.applyCamera();
    this.ensureWorld();
    const sorted = [...model.plots].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const ids = new Set(sorted.map(p => p.id));
    for (const [id, e] of Array.from(this.plots))
      if (!ids.has(id)) { Tween.stopAllByTarget(e.node); e.node.destroy(); this.plots.delete(id); }
    sorted.forEach((p, index) => {
      const w = logicalToWorld(p);
      const interactive = p.kind !== 'unknown' || p.reachable === true;
      const key = JSON.stringify([p.kind, p.field, p.land?.water, p.discovery?.id, (p.maturity?.days ?? 1) <= 0, interactive]);
      let e = this.plots.get(p.id);
      if (!e) { e = { node: visualNode('Scenic plot ' + p.id, this.layers!.plot, 0, 0, 260, 130), key: '', x: p.x, y: p.y, interactive }; this.plots.set(p.id, e); }
      e.x = p.x; e.y = p.y; e.interactive = interactive;
      e.node.setPosition(w.x, -w.y); e.node.setSiblingIndex(index);
      if (e.key === key) return;
      e.key = key; this.clear(e.node); this.drawPlot(e.node, p, interactive);
    });
    this.drawSelection(model.selected);
    this.syncChunks();
  }
  hitTest(point: WorldPoint): string | null {
    return hitTestPlot(point, Array.from(this.plots.entries(), ([id, e]) => ({ id, x: e.x, y: e.y, interactive: e.interactive })));
  }
  focusPlot(id: string): WorldCamera | null {
    const c = coordinatesOf(id); if (!c) return null;
    const w = logicalToWorld(c);
    return { x: w.x, y: w.y + layout.CAMERA_LIFT, zoom: this.camera.zoom };
  }
  focusDistrict(id: DistrictId): WorldCamera {
    const w = layout.districtCenter(id);
    return { x: w.x, y: w.y + layout.CAMERA_LIFT, zoom: this.camera.zoom };
  }
  getCamera(): WorldCamera { return { ...this.camera }; }
  setCamera(camera: WorldCamera) { this.camera = { ...camera }; this.applyCamera(); }
  resize(viewport: WorldViewport) { this.viewport = viewport; }
  pulse(id: string) {
    const e = this.plots.get(id); if (!e) return;
    Tween.stopAllByTarget(e.node); e.node.setScale(1, 1, 1);
    tween(e.node).to(.15, { scale: new Vec3(1.07, 1.07, 1) }).to(.25, { scale: new Vec3(1, 1, 1) }).start();
  }
  dispose() {
    for (const e of Array.from(this.plots.values())) Tween.stopAllByTarget(e.node);
    this.plots.clear();
    for (const key of Array.from(this.chunks.keys())) this.destroyChunk(key);
    this.chunkStore.clear();
    if (this.layers) { for (const n of Object.values(this.layers)) n.destroy(); this.layers = null; }
    this.pack.dispose();
  }

  private applyCamera() {
    const z = this.camera.zoom;
    this.map.setScale(z, z, 1);
    // Children sit at (wx, -wy); this maps the camera world point to the viewport center.
    this.map.setPosition(-this.camera.x * z, this.camera.y * z, 0);
  }
  private clear(parent: Node) { for (const n of [...parent.children]) { n.active = false; n.destroy(); } }

  /** Anchor-aware image placement: the image point (ax·w, ay·h) lands on the world point. */
  private placeImage(slot: string, parent: Node, worldX: number, worldY: number): Node | null {
    const spec = this.pack.spec(slot), frame = this.pack.frames.get(slot);
    if (!spec || !frame) return null;
    const [ax, ay] = spec.anchor;
    const n = visualNode(slot, parent, worldX + spec.width * (0.5 - ax), -worldY + spec.height * (ay - 0.5), spec.width, spec.height);
    const sp = n.addComponent(Sprite); sp.spriteFrame = frame; sp.sizeMode = Sprite.SizeMode.CUSTOM;
    n.getComponent(UITransform)!.setContentSize(spec.width, spec.height);
    return n;
  }
  private diamond(parent: Node, fill: string, alpha = 255): Node {
    const n = visualNode('Diamond', parent, 0, 0, 0, 0), g = n.addComponent(Graphics);
    g.fillColor = tint(fill, alpha);
    g.moveTo(0, -DIAMOND_HALF_HEIGHT); g.lineTo(DIAMOND_HALF_WIDTH, 0); g.lineTo(0, DIAMOND_HALF_HEIGHT); g.lineTo(-DIAMOND_HALF_WIDTH, 0); g.close(); g.fill();
    return n;
  }

  /** Grass-covered plot ground with a deterministic decoration overlay. */
  private drawWildGround(node: Node, p: PlotRenderModel, fill: string) {
    this.diamond(node, fill);
    const h = cellHash(p.x, p.y);
    const overlay = this.placeImage('env.flowers', node, 0, 0);
    if (overlay) overlay.setScale((h & 1) ? -1 : 1, (h & 2) ? -1 : 1, 1);
  }

  private drawPlot(node: Node, p: PlotRenderModel, interactive: boolean) {
    const P = this.palette;
    if (p.kind === 'unknown') {
      if (!this.placeImage('field.unknown', node, 0, 0)) this.diamond(node, P.disabled, interactive ? 150 : 90);
      return;
    }
    if (p.kind === 'field') {
      const wet = (p.land?.water ?? 0) >= 2;
      if (!this.placeImage(wet ? 'field.soil.wet' : 'field.soil.dry', node, 0, 0)) this.diamond(node, wet ? FALLBACK_COLORS.wet : FALLBACK_COLORS.dry);
      this.placeImage('field.ridge', node, 0, 0);
      if (p.field?.crop) {
        const stage = (p.maturity?.days ?? 1) <= 0 ? 'mature' : 'growing';
        const specific = `crop.${p.field.crop}.${stage}`;
        if (!this.placeImage(this.pack.frames.has(specific) ? specific : `crop.default.${stage}`, node, 0, 0)) {
          const n = visualNode('Crop rows', node, 0, 0, 0, 0), g = n.addComponent(Graphics);
          g.strokeColor = tint(stage === 'mature' ? P.gold : P.status); g.lineWidth = 10;
          for (const y of [-30, -10, 10, 30]) {
            const half = DIAMOND_HALF_WIDTH * (1 - Math.abs(y) / DIAMOND_HALF_HEIGHT) * 0.8;
            g.moveTo(-half, y); g.lineTo(half, y);
          }
          g.stroke();
        }
      }
      return;
    }
    if (p.kind === 'water') {
      if (!this.placeRiverArt(node, cellHash(p.x, p.y) % 2 === 0 ? 'straight-y' : 'straight-x'))
        this.diamond(node, FALLBACK_COLORS.water);
      return;
    }
    if (p.kind === 'tree' || p.discovery?.id === 'woodland') {
      this.drawWildGround(node, p, GRASS_VARIANTS[cellHash(p.x, p.y) % GRASS_VARIANTS.length]);
      if (!this.placeImage('env.tree.canopy', node, 0, 8)) {
        const n = visualNode('Tree', node, 0, 10, 0, 0), g = n.addComponent(Graphics);
        g.fillColor = tint(P.shade); g.circle(0, 14, 26); g.fill();
      }
      return;
    }
    if (p.kind === 'rock') {
      this.diamond(node, ROCK_GROUND);
      const n = visualNode('Rock', node, 0, 6, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint(FALLBACK_COLORS.rock);
      g.roundRect(-34, -20, 68, 34, 12); g.fill();
      g.fillColor = tint('#a3a397'); g.roundRect(-26, -16, 30, 14, 7); g.fill();
      return;
    }
    if (p.discovery?.id === 'spring') {
      if (!this.placeRiverArt(node, 'straight-x')) this.diamond(node, FALLBACK_COLORS.water);
      return;
    }
    // wild / brush / story and other observed wilderness: grass + deterministic flowers.
    const h = cellHash(p.x, p.y);
    this.drawWildGround(node, p, p.kind === 'brush' ? BRUSH_GRASS : GRASS_VARIANTS[h % GRASS_VARIANTS.length]);
  }

  private drawSelection(selected: string) {
    const overlay = this.layers!.overlay;
    this.clear(overlay);
    const e = this.plots.get(selected);
    const c = e ? { x: e.x, y: e.y } : coordinatesOf(selected);
    if (!c) return;
    const w = logicalToWorld(c);
    const n = visualNode('Selection outline', overlay, w.x, -w.y, 0, 0), g = n.addComponent(Graphics);
    const trace = () => {
      g.moveTo(0, -DIAMOND_HALF_HEIGHT); g.lineTo(DIAMOND_HALF_WIDTH, 0); g.lineTo(0, DIAMOND_HALF_HEIGHT); g.lineTo(-DIAMOND_HALF_WIDTH, 0); g.close(); g.stroke();
    };
    g.strokeColor = tint(this.palette.gold, 240); g.lineWidth = 9; trace();
    g.strokeColor = tint(this.palette.paper); g.lineWidth = 3; trace();
    const marker = visualNode('Selected field name', n, 0, -(DIAMOND_HALF_HEIGHT + 34), 168, 44), mg = marker.addComponent(Graphics);
    mg.fillColor = tint(this.palette.paper, 245); mg.roundRect(-84, -22, 168, 44, 12); mg.fill();
    mg.strokeColor = tint(this.palette.gold); mg.lineWidth = 3; mg.roundRect(-84, -22, 168, 44, 12); mg.stroke();
    const caption = visualNode('Name', marker, 0, 0, 160, 40), label = caption.addComponent(Label);
    label.string = plotName(selected); label.fontSize = 24; label.lineHeight = 30; label.color = tint(this.palette.ink);
  }

  /** River art for one cell; straight-y mirrors SPEC §6 by rotating the
   * long-axis straight 90° inside the same diamond (affine swap of the basis).
   * Corner variants flip the base left-in → bottom-out corner for the other orientations. */
  private placeRiverArt(parent: Node, kind: 'straight-x' | 'straight-y' | 'corner' | 'corner-fx' | 'corner-fy' | 'corner-fxy'): Node | null {
    const isCorner = kind.startsWith('corner');
    const n = this.placeImage(isCorner ? 'env.river.corner' : 'env.river.straight', parent, 0, 0);
    if (!n) return null;
    if (kind === 'straight-y') { n.angle = 90; n.setScale(0.5, 2, 1); }
    if (kind === 'corner-fx') n.setScale(-1, 1, 1);
    if (kind === 'corner-fy') n.setScale(1, -1, 1);
    if (kind === 'corner-fxy') n.setScale(-1, -1, 1);
    return n;
  }

  /** Layers only; all environment content is chunk-driven (plan §5.3). */
  private ensureWorld() {
    if (this.layers) return;
    this.layers = {
      ground: visualNode('Scenic ground', this.map),
      river: visualNode('Scenic river', this.map),
      plot: visualNode('Scenic plots', this.map),
      path: visualNode('Scenic streets', this.map),
      env: visualNode('Scenic environment', this.map),
      overlay: visualNode('Scenic overlay', this.map)
    };
  }

  /** Instantiate visible chunks + one buffer ring, release the rest.
   * Release policy: chunk nodes are destroyed; textures stay owned by the art
   * pack (chunks never addRef), so node destruction drops the only references. */
  private syncChunks() {
    if (!this.layers) return;
    const needed = visibleChunkKeys(this.camera, this.viewport);
    const occupied = new Set<string>();
    for (const e of this.plots.values()) occupied.add(e.x + ',' + e.y);
    const sig = Array.from(occupied).sort().join('|');
    const rebuildAll = sig !== this.chunkOccupiedSig;
    this.chunkOccupiedSig = sig;
    for (const key of this.chunkStore.sync(needed).removed) this.destroyChunk(key);
    if (rebuildAll) for (const key of Array.from(this.chunks.keys())) this.destroyChunk(key);
    for (const k of needed) {
      const key = chunkKey(k.cx, k.cy);
      if (!this.chunks.has(key)) this.buildChunk(k.cx, k.cy, occupied);
    }
  }
  private destroyChunk(key: string) {
    const entry = this.chunks.get(key);
    if (!entry) return;
    for (const n of Object.values(entry)) { n.active = false; n.destroy(); }
    this.chunks.delete(key);
  }

  private buildChunk(cx: number, cy: number, occupied: ReadonlySet<string>) {
    const content = chunkContent(cx, cy, occupied), L = this.layers!, P = this.palette;
    const key = content.key;
    const ground = visualNode('Chunk ground ' + key, L.ground);
    const gg = ground.addComponent(Graphics);
    gg.fillColor = tint(P.base);
    gg.rect(cx * CHUNK_SIZE, -(cy * CHUNK_SIZE + CHUNK_SIZE), CHUNK_SIZE, CHUNK_SIZE); gg.fill();
    if (this.pack.frames.has('ground.base')) for (const t of content.groundTiles) this.placeImage('ground.base', ground, t.x, t.y);
    const river = visualNode('Chunk river ' + key, L.river);
    for (const seg of content.rivers) {
      const w = logicalToWorld(seg.cell);
      const art = this.placeRiverArt(river, seg.kind);
      if (art) { art.setPosition(w.x, -w.y); continue; }
      const n = visualNode('River ' + seg.cell.x + ',' + seg.cell.y, river, w.x, -w.y, 0, 0), g = n.addComponent(Graphics);
      g.strokeColor = tint(FALLBACK_COLORS.water); g.lineWidth = 60;
      if (seg.kind === 'straight-y') { g.moveTo(0, 65); g.lineTo(0, -65); }
      else if (seg.kind.startsWith('corner')) { g.moveTo(-130, 0); g.lineTo(0, 0); g.lineTo(0, seg.kind === 'corner-fy' || seg.kind === 'corner-fxy' ? -65 : 65); }
      else { g.moveTo(-130, 0); g.lineTo(130, 0); }
      g.stroke();
    }
    if (content.spring) {
      const s = layout.RIVER_SPRING;
      const n = visualNode('River spring', river, s.x, -s.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint(FALLBACK_COLORS.water); g.ellipse(0, 0, 110, 60); g.fill();
      g.strokeColor = tint(P.status, 180); g.lineWidth = 10; g.ellipse(0, 0, 118, 68); g.stroke();
    }
    // Flower overlays sit on the ground below the plot layer (plots may cover them later).
    for (const cell of content.flowerCells) {
      const w = logicalToWorld(cell);
      const placed = this.placeImage('env.flowers', river, w.x, w.y);
      if (placed) { const h = cellHash(cell.x, cell.y); placed.setScale((h & 1) ? -1 : 1, (h & 2) ? -1 : 1, 1); }
    }
    // Packed-earth streets: darker wide under-stroke + warm sand core, round caps.
    const path = visualNode('Chunk streets ' + key, L.path);
    for (const seg of content.streets) {
      const n = visualNode('Scenic street', path, 0, 0, 0, 0), g = n.addComponent(Graphics);
      const stroke = (color: string, width: number, alpha: number) => {
        g.strokeColor = tint(color, alpha); g.lineWidth = width;
        g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
        g.moveTo(seg.a.x, -seg.a.y); g.lineTo(seg.b.x, -seg.b.y); g.stroke();
      };
      stroke(PATH_EDGE, seg.width + 6, 210);
      stroke(PATH_FILL, seg.width, 255);
    }
    const env = visualNode('Chunk env ' + key, L.env);
    const envDepth: { node: Node; y: number }[] = [];
    const track = (node: Node | null, y: number) => { if (node) envDepth.push({ node, y }); };
    for (const b of content.bridges) {
      const placed = this.placeImage('env.bridge', env, b.world.x, b.world.y);
      if (placed) { track(placed, b.world.y); continue; }
      const n = visualNode('Bridge', env, b.world.x, -b.world.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint('#8a6a44'); g.roundRect(-75, -16, 150, 32, 6); g.fill();
      track(n, b.world.y);
    }
    if (content.homestead) {
      const h = content.homestead;
      const homestead = this.placeImage('env.homestead', env, h.world.x, h.world.y);
      if (homestead) track(homestead, h.world.y);
      else {
        const n = visualNode('Homestead placeholder', env, h.world.x, -h.world.y + h.height * (h.anchor[1] - 0.5), 0, 0), g = n.addComponent(Graphics);
        g.fillColor = tint(P.cream); g.roundRect(-190, -160, 380, 110, 12); g.fill();
        g.fillColor = tint(P.paper); g.roundRect(-130, -60, 190, 130, 8); g.fill();
        g.fillColor = tint('#7a4f35'); g.moveTo(-160, 70); g.lineTo(-35, 150); g.lineTo(90, 70); g.close(); g.fill();
        g.strokeColor = tint(P.line); g.lineWidth = 3; g.roundRect(-190, -160, 380, 110, 12); g.stroke();
        track(n, h.world.y);
      }
    }
    for (const s of content.signposts) {
      const placed = this.placeImage('env.signpost', env, s.world.x, s.world.y);
      const n = placed ?? visualNode('Signpost ' + s.name, env, s.world.x, -s.world.y, 0, 0);
      if (!placed) {
        const g = n.addComponent(Graphics);
        g.fillColor = tint('#8a6a44'); g.rect(-4, -60, 8, 60); g.fill();
        g.fillColor = tint(P.cream); g.roundRect(-55, -100, 110, 44, 6); g.fill();
      }
      const label = visualNode('Signpost name', n, 0, placed ? 55 : -78, 110, 40), text = label.addComponent(Label);
      text.string = s.name; text.fontSize = 20; text.lineHeight = 26; text.color = tint(P.ink);
      track(n, s.world.y);
    }
    for (const f of content.fences) {
      const placed = this.placeImage('env.fence', env, f.x, f.y);
      if (placed) { track(placed, f.y); continue; }
      const n = visualNode('Fence', env, f.x, -f.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint('#8a6a44'); g.rect(-60, -8, 120, 8); g.fill(); g.rect(-60, 6, 120, 8); g.fill();
      track(n, f.y);
    }
    for (const t of content.trees) {
      const placed = this.placeImage('env.tree.canopy', env, t.x, t.y);
      if (placed) { track(placed, t.y); continue; }
      const n = visualNode('Tree canopy', env, t.x, -t.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint('#6b4a30'); g.rect(-6, -20, 12, 30); g.fill();
      g.fillColor = tint(P.shade); g.circle(0, 40, 58); g.fill();
      track(n, t.y);
    }
    // Depth: foreground decor sorts by ground contact point within the chunk (plan §5.2).
    envDepth.sort((a, b) => a.y - b.y).forEach((e, i) => e.node.setSiblingIndex(i));
    this.chunks.set(key, { ground, river, path, env });
  }
}
