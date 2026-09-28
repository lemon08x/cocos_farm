import { Graphics, Label, Node, Sprite, Tween, UITransform, tween, Vec3 } from 'cc';
import { tint, visualNode } from '../../../art/ArtRenderer';
import { coordinatesOf } from '../../FarmDistrict';
import type { DistrictId, FarmWorldViewContract, PlotRenderModel, WorldCamera, WorldPoint, WorldRenderModel, WorldViewport } from '../FarmWorldViewContract';
import type { WorldViewRegistry } from '../WorldViewRegistry';
import type { WorldViewHost } from '../current/CurrentWorldView';
import { DIAMOND_HALF_HEIGHT, DIAMOND_HALF_WIDTH, ScenicWorldPoint, logicalToWorld } from './ScenicProjection';
import * as layout from './ScenicLayout';
import { hitTestPlot } from './ScenicHitTest';
import { ScenicArtPack } from './ScenicArtPack';

export function registerScenicWorldView(registry: WorldViewRegistry<WorldViewHost>) {
  registry.register({
    id: 'scenic', name: '田园场景',
    create: async host => new ScenicWorldView(host.base, host.map, await ScenicArtPack.load())
  });
}

interface PlotEntry { node: Node; key: string; x: number; y: number; interactive: boolean }
type LayerName = 'ground' | 'river' | 'path' | 'plot' | 'env' | 'overlay';

/** Graybox fallback colors; the scenic manifest palette overrides where a key exists. */
const FALLBACK_COLORS: Record<string, string> = {
  dry: '#9a7648', wet: '#5f5140', wild: '#4e7a40', brush: '#4e7a40',
  water: '#5b8fa8', tree: '#3c6334', rock: '#8a8a80', story: '#c2a14d'
};

/** Scenic (田园场景) graybox world view: layered oblique rendering with
 * Graphics placeholders plus any scenic manifest images that happen to load.
 * Rendering only — no rules commands, no save access, selection via the contract. */
export class ScenicWorldView implements FarmWorldViewContract {
  private camera: WorldCamera = { ...layout.DEFAULT_CAMERA };
  private viewport: WorldViewport = { width: 720, height: 1280 };
  private layers: Record<LayerName, Node> | null = null;
  private plots = new Map<string, PlotEntry>();
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
      const key = JSON.stringify([p.kind, p.field, p.land?.water, (p.maturity?.days ?? 1) <= 0, interactive]);
      let e = this.plots.get(p.id);
      if (!e) { e = { node: visualNode('Scenic plot ' + p.id, this.layers!.plot, 0, 0, 260, 130), key: '', x: p.x, y: p.y, interactive }; this.plots.set(p.id, e); }
      e.x = p.x; e.y = p.y; e.interactive = interactive;
      e.node.setPosition(w.x, -w.y); e.node.setSiblingIndex(index);
      if (e.key === key) return;
      e.key = key; this.clear(e.node); this.drawPlot(e.node, p, interactive);
    });
    this.drawSelection(model.selected);
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
    this.diamond(node, FALLBACK_COLORS[p.kind] || FALLBACK_COLORS.wild);
    if (p.kind === 'tree') {
      const n = visualNode('Tree', node, 0, 10, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint(P.shade); g.circle(0, 14, 26); g.fill();
    }
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
  }

  /** Static environment, built once: ground → river → paths → homestead/decor. */
  private ensureWorld() {
    if (this.layers) return;
    const L = this.layers = {
      ground: visualNode('Scenic ground', this.map),
      river: visualNode('Scenic river', this.map),
      path: visualNode('Scenic path', this.map),
      plot: visualNode('Scenic plots', this.map),
      env: visualNode('Scenic environment', this.map),
      overlay: visualNode('Scenic overlay', this.map)
    };
    const P = this.palette;
    const ground = visualNode('Ground base', L.ground, 0, 0, 0, 0), gg = ground.addComponent(Graphics);
    gg.fillColor = tint(P.base); gg.rect(-2100, -2100, 4200, 4200); gg.fill();
    if (this.pack.frames.has('ground.base')) for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) this.placeImage('ground.base', L.ground, i * 512, j * 512);
    for (const seg of layout.RIVER_SEGMENTS) {
      const w = logicalToWorld(seg.cell);
      const slot = seg.kind === 'corner' ? 'env.river.corner' : seg.kind === 'straight-x' ? 'env.river.straight' : null;
      if (slot && this.placeImage(slot, L.river, w.x, w.y)) continue;
      const n = visualNode('River ' + seg.cell.x + ',' + seg.cell.y, L.river, w.x, -w.y, 0, 0), g = n.addComponent(Graphics);
      g.strokeColor = tint(FALLBACK_COLORS.water); g.lineWidth = 60;
      if (seg.kind === 'straight-y') { g.moveTo(0, 65); g.lineTo(0, -65); }
      else if (seg.kind === 'corner') { g.moveTo(-130, 0); g.lineTo(0, 0); g.lineTo(0, -65); }
      else { g.moveTo(-130, 0); g.lineTo(130, 0); }
      g.stroke();
    }
    for (const path of layout.PATHS) {
      const n = visualNode('Scenic path', L.path, 0, 0, 0, 0), g = n.addComponent(Graphics);
      g.strokeColor = tint(P.cream); g.lineWidth = path.width;
      g.moveTo(path.points[0].x, -path.points[0].y);
      for (const pt of path.points.slice(1)) g.lineTo(pt.x, -pt.y);
      g.stroke();
    }
    for (const b of layout.BRIDGES) {
      if (this.placeImage('env.bridge', L.env, b.world.x, b.world.y)) continue;
      const n = visualNode('Bridge', L.env, b.world.x, -b.world.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint('#8a6a44'); g.roundRect(-75, -16, 150, 32, 6); g.fill();
    }
    const h = layout.HOMESTEAD;
    if (!this.placeImage('env.homestead', L.env, h.world.x, h.world.y)) {
      const n = visualNode('Homestead placeholder', L.env, h.world.x, -h.world.y + h.height * (h.anchor[1] - 0.5), 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint(P.cream); g.roundRect(-190, -160, 380, 110, 12); g.fill();
      g.fillColor = tint(P.paper); g.roundRect(-130, -60, 190, 130, 8); g.fill();
      g.fillColor = tint('#7a4f35'); g.moveTo(-160, 70); g.lineTo(-35, 150); g.lineTo(90, 70); g.close(); g.fill();
      g.strokeColor = tint(P.line); g.lineWidth = 3; g.roundRect(-190, -160, 380, 110, 12); g.stroke();
    }
    for (const s of layout.SIGNPOSTS) {
      if (this.placeImage('env.signpost', L.env, s.world.x, s.world.y)) continue;
      const n = visualNode('Signpost ' + s.name, L.env, s.world.x, -s.world.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint('#8a6a44'); g.rect(-4, -60, 8, 60); g.fill();
      g.fillColor = tint(P.cream); g.roundRect(-55, -100, 110, 44, 6); g.fill();
      const label = visualNode('Signpost name', n, 0, -78, 106, 40), text = label.addComponent(Label);
      text.string = s.name; text.fontSize = 20; text.lineHeight = 26; text.color = tint(P.ink);
    }
    for (const f of layout.FENCES) {
      if (this.placeImage('env.fence', L.env, f.x, f.y)) continue;
      const n = visualNode('Fence', L.env, f.x, -f.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint('#8a6a44'); g.rect(-60, -8, 120, 8); g.fill(); g.rect(-60, 6, 120, 8); g.fill();
    }
    for (const t of layout.TREES) {
      if (this.placeImage('env.tree.canopy', L.env, t.x, t.y)) continue;
      const n = visualNode('Tree canopy', L.env, t.x, -t.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint('#6b4a30'); g.rect(-6, -20, 12, 30); g.fill();
      g.fillColor = tint(P.shade); g.circle(0, 40, 58); g.fill();
    }
    for (const cell of layout.FLOWER_CELLS) {
      const w = logicalToWorld(cell);
      this.placeImage('env.flowers', L.env, w.x, w.y);
    }
  }
}
