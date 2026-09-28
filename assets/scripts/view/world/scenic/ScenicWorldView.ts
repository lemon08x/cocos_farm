import {sceneHitTest} from '../../../FarmCore';
import type {SceneRegion,SceneSnapshot} from '../FarmWorldViewContract';
import {plotTitle} from '../../../presentation/FarmViewModel';
import { Graphics, Label, Node, Sprite, Tween, UITransform, tween, Vec3 } from 'cc';
import { tint, visualNode } from '../../../art/ArtRenderer';
import { plotName } from '../../FarmPresentation';
import type { DistrictId, FarmWorldViewContract, PlotRenderModel, WorldCamera, WorldPoint, WorldRenderModel, WorldViewport } from '../FarmWorldViewContract';
import type { WorldViewRegistry } from '../WorldViewRegistry';
import type { WorldViewHost } from '../current/CurrentWorldView';
import { QUAD_HALF_HEIGHT, QUAD_HALF_WIDTH, ScenicWorldPoint, logicalToWorld } from './ScenicProjection';
import * as layout from './ScenicLayout';


import { ScenicArtPack } from './ScenicArtPack';
import { CHUNK_SIZE, ScenicChunkStore, chunkContent, chunkKey, visibleChunkKeys } from './ScenicChunkStore';

export function registerScenicWorldView(registry: WorldViewRegistry<WorldViewHost>) {
  registry.register({
    id: 'scenic', name: '田园场景',
    create: async host => new ScenicWorldView(host.base, host.map, await ScenicArtPack.load())
  });
}

interface PlotEntry { node: Node; key: string; x: number; y: number; interactive: boolean; region:SceneRegion; standing:Node[] }
type LayerName = 'ground' | 'fog' | 'river' | 'plot' | 'path' | 'env' | 'overlay';

/** Graybox fallback colors; the scenic manifest palette overrides where a key exists. */
const FALLBACK_COLORS: Record<string, string> = {
  dry: '#9a7648', wet: '#5f5140', water: '#5b8fa8', rock: '#8a8a80', fog: '#b9bfae'
};
/** Grass quad variants for non-field plots (wild/brush/tree/rock/story ground),
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

/** Scenic (田园场景) world view, revision 2: region-driven layered rendering.
 * Plot regions, the water-source river chain, streets, courtyard environment
 * and merged unknown-area fog all come from the shared layout geometry
 * (plan §4/§7). Rendering only — no rules commands, no save access. */
export class ScenicWorldView implements FarmWorldViewContract {
  private camera: WorldCamera = { ...layout.DEFAULT_CAMERA };
  private viewport: WorldViewport = { width: 720, height: 1280 };
  private layers: Record<LayerName, Node> | null = null;
  private plots = new Map<string, PlotEntry>();
  private fogSignature = '';
  private scene:SceneSnapshot|null=null;
  private regions=new Map<string,SceneRegion>();
  private depth=new Map<Node,number>();
  private chunkStanding=new Map<string,Node[]>();
  private drawing:PlotEntry|null=null;
  private environmentNode:Node|null=null;
  private chunkStore = new ScenicChunkStore();
  private chunks = new Map<string, { ground: Node; river: Node; path: Node; env: Node }>();
  private chunkOccupiedSig = '';
  constructor(private base: Node, private map: Node, private pack: ScenicArtPack) {}
  get images(): ScenicArtPack { return this.pack; }
  private get palette() { return this.pack.palette; }

  render(model: WorldRenderModel) {
    if(model.scene){this.scene=model.scene;this.regions=new Map(model.scene.regions.filter(r=>r.plotId).map(r=>[r.plotId!,r]));}
    if(!this.scene)return;
    if (model.camera) this.camera = { ...model.camera };
    this.applyCamera();
    this.ensureWorld();
    const sorted = [...model.plots].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const ids = new Set(sorted.map(p => p.id));
    for (const [id, e] of Array.from(this.plots))
      if (!ids.has(id)) { Tween.stopAllByTarget(e.node); this.clearStanding(e);e.node.destroy(); this.plots.delete(id); }
    sorted.forEach((p, index) => {
      const region=this.regions.get(p.id);if(!region)return;
      const w = region.center;
      const interactive = p.kind !== 'unknown' || p.reachable === true;
      const key = JSON.stringify([p,region.boundary]);
      let e = this.plots.get(p.id);
      if (!e) { e = { node: visualNode('Scenic plot ' + p.id, this.layers!.plot, 0, 0, 228, 142), key: '', x: p.x, y: p.y, interactive:true,region,standing:[] }; this.plots.set(p.id, e); }
      e.x = p.x; e.y = p.y; e.interactive = true;e.region=region;
      e.node.setPosition(w.x, -w.y); e.node.setSiblingIndex(index);
      if (e.key === key) return;
      e.key = key; this.clearStanding(e);this.clear(e.node);this.drawing=e; this.drawPlot(e.node, p, interactive);this.drawing=null;
    });
    this.syncFog(sorted);
    this.drawSelection(model.selected);
    this.syncChunks();
    this.syncEnvironment();
    Array.from(this.depth.entries()).sort((a,b)=>a[1]-b[1]).forEach(([node],i)=>node.setSiblingIndex(i));
  }
  hitTest(point: WorldPoint): string | null {
    return this.scene?sceneHitTest(point,this.scene,new Set(this.plots.keys())):null;
  }
  focusPlot(id: string): WorldCamera | null {
    const r=this.regions.get(id);return r?{x:r.center.x,y:r.center.y+layout.CAMERA_LIFT,zoom:this.camera.zoom}:null;
  }
  focusDistrict(id: DistrictId): WorldCamera {
    const plots=Array.from(this.regions.values()).filter(r=>r.district.x===id.x&&r.district.y===id.y);
    if(!plots.length)return this.getCamera();
    return {x:plots.reduce((s,r)=>s+r.center.x,0)/plots.length,y:plots.reduce((s,r)=>s+r.center.y,0)/plots.length+layout.CAMERA_LIFT,zoom:this.camera.zoom};
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
    for(const e of Array.from(this.plots.values()))this.clearStanding(e);
    this.plots.clear();
    for (const key of Array.from(this.chunks.keys())) this.destroyChunk(key);
    this.chunkStore.clear();
    if (this.layers) { for (const n of Object.values(this.layers)) n.destroy(); this.layers = null; }
    this.depth.clear();this.environmentNode=null;this.pack.dispose();
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
  private quad(parent: Node, fill: string, alpha = 255): Node {
    const n = visualNode('Plot quad', parent, 0, 0, 0, 0), g = n.addComponent(Graphics);
    g.fillColor = tint(fill, alpha);
    this.trace(g,this.drawing!.region.boundary,this.drawing!.region.center);g.fill();
    return n;
  }
  /** Trace the observed region boundary for reachable unknown plots. */
  private quadOutline(parent: Node, color: string, alpha: number) {
    const n = visualNode('Quad outline', parent, 0, 0, 0, 0), g = n.addComponent(Graphics);
    g.strokeColor = tint(color, alpha); g.lineWidth = 4;
    this.trace(g,this.drawing!.region.boundary,this.drawing!.region.center);g.stroke();
  }

  /** Grass-covered plot ground with a deterministic decoration overlay. */
  private drawWildGround(node: Node, p: PlotRenderModel, fill: string) {
    this.quad(node, fill);
    const h = cellHash(p.x, p.y);
    const overlay = this.placeImage('env.flowers', node, 0, 0);
    if (overlay) overlay.setScale((h & 1) ? -1 : 1, (h & 2) ? -1 : 1, 1);
  }

  /** Discovered spring plots stay identifiable: a recognizable
   * water quad with a bank post. The fixed river is also a source. */
  private drawWaterPlot(node: Node) {
    const P = this.palette;
    this.quad(node, FALLBACK_COLORS.water);
    const n = visualNode('Water ripples', node, 0, 0, 0, 0), g = n.addComponent(Graphics);
    g.strokeColor = tint(P.paper, 160); g.lineWidth = 5; g.lineCap = Graphics.LineCap.ROUND;
    for (const [y, half] of [[-18, 52], [6, 76]] as const) { g.moveTo(-half, y); g.lineTo(-half + 34, y); g.moveTo(half - 34, y + 10); g.lineTo(half, y + 10); }
    g.stroke();
    const post = visualNode('Water sign', node, 58, -58, 0, 0), pg = post.addComponent(Graphics);
    pg.fillColor = tint('#8a6a44'); pg.rect(-3, -6, 6, 30); pg.fill();
    pg.fillColor = tint(P.cream); pg.roundRect(-22, -30, 44, 26, 6); pg.fill();
    pg.fillColor = tint(FALLBACK_COLORS.water); pg.circle(0, -17, 7); pg.fill();
  }

  private drawPlot(node: Node, p: PlotRenderModel, interactive: boolean) {
    const P = this.palette;
    if (p.kind === 'unknown') {
      // Distant unknowns merge into the fog cluster layer (drawn in syncFog);
      // only frontier/reachable unknowns get their own quad + outline (plan §4.4).
      if (!interactive) return;
      if (!this.placeImage('field.unknown', node, 0, 0)) this.quad(node, P.disabled, 150);
      this.quadOutline(node, P.paper, 170);
      return;
    }
    if(p.landscape||p.improvement||(p.project&&(p.project.done??0)<(p.project.total??0))||p.purpose==='other'){
      this.quad(node,p.improvement==='canal'||p.improvement==='retting'?'#5b8fa8':'#a98b60');
      const badge=visualNode('Facility '+p.id,this.layers!.env,this.drawing!.region.center.x,-this.drawing!.region.center.y,156,62);
      const g=badge.addComponent(Graphics);g.fillColor=tint(P.paper,235);g.roundRect(-78,-24,156,48,10);g.fill();
      const text=visualNode('Facility name',badge,0,0,150,60).addComponent(Label);
      text.string=p.project&&p.project.done!==p.project.total?(p.project.name||plotTitle(p))+' · '+(p.project.stage||'建设中'):plotTitle(p);text.fontSize=20;text.lineHeight=24;text.color=tint(P.ink);
      this.drawing!.standing.push(badge);this.depth.set(badge,this.drawing!.region.center.y);
      return;
    }
    if (p.kind === 'field') {
      const wet = (p.land?.water ?? 0) >= 2;
      if (!this.placeImage(wet ? 'field.soil.wet' : 'field.soil.dry', node, 0, 0)) this.quad(node, wet ? FALLBACK_COLORS.wet : FALLBACK_COLORS.dry);
      this.placeImage('field.ridge', node, 0, 0);
      if (p.field?.crop) {
        const stage = (p.maturity?.days ?? 1) <= 0 ? 'mature' : 'growing';
        const specific = `crop.${p.field.crop}.${stage}`;
        if (!this.placeImage(this.pack.frames.has(specific) ? specific : `crop.default.${stage}`, node, 0, 0)) {
          const n = visualNode('Crop rows', node, 0, 0, 0, 0), g = n.addComponent(Graphics);
          g.strokeColor = tint(stage === 'mature' ? P.gold : P.status); g.lineWidth = 9;
          for (const y of [-36, -12, 12, 36]) {
            const half = QUAD_HALF_WIDTH * (1 - Math.abs(y) / QUAD_HALF_HEIGHT) * 0.8;
            g.moveTo(-half, y); g.lineTo(half, y);
          }
          g.stroke();
        }
      }
      return;
    }
    if (p.kind === 'water') { this.drawWaterPlot(node); return; }
    if (p.kind === 'tree' || p.discovery?.id === 'woodland') {
      this.drawWildGround(node, p, GRASS_VARIANTS[cellHash(p.x, p.y) % GRASS_VARIANTS.length]);
      const tree=this.placeImage('env.tree.canopy', this.layers!.env, this.drawing!.region.center.x, this.drawing!.region.center.y+8);
      if(tree){this.drawing!.standing.push(tree);this.depth.set(tree,this.drawing!.region.center.y);}
      if (!tree) {
        const n = visualNode('Tree', this.layers!.env, this.drawing!.region.center.x, -this.drawing!.region.center.y+10, 0, 0), g = n.addComponent(Graphics);
        this.drawing!.standing.push(n);this.depth.set(n,this.drawing!.region.center.y);
        g.fillColor = tint(P.shade); g.circle(0, 14, 26); g.fill();
      }
      return;
    }
    if (p.kind === 'rock') {
      this.quad(node, ROCK_GROUND);
      const n = visualNode('Rock', node, 0, 6, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint(FALLBACK_COLORS.rock);
      g.roundRect(-34, -20, 68, 34, 12); g.fill();
      g.fillColor = tint('#a3a397'); g.roundRect(-26, -16, 30, 14, 7); g.fill();
      return;
    }
    if (p.discovery?.id === 'spring') { this.drawWaterPlot(node); return; }
    // wild / brush / story and other observed wilderness: grass + deterministic flowers.
    const h = cellHash(p.x, p.y);
    this.drawWildGround(node, p, p.kind === 'brush' ? BRUSH_GRASS : GRASS_VARIANTS[h % GRASS_VARIANTS.length]);
  }

  /** Unknown terrain mask uses actual region polygons and never reveals resource state. */
  private syncFog(sorted: PlotRenderModel[]) {
    const unknown=sorted.filter(p=>p.kind==='unknown');
    const sig=JSON.stringify(unknown.map(p=>[p.id,p.reachable,this.regions.get(p.id)?.boundary]));
    if(sig===this.fogSignature)return;this.fogSignature=sig;
    this.clear(this.layers!.fog);
    const n=visualNode('Unknown region mask',this.layers!.fog),g=n.addComponent(Graphics);
    g.fillColor=tint(FALLBACK_COLORS.fog,200);
    for(const p of unknown){const r=this.regions.get(p.id);if(r){this.trace(g,r.boundary);g.fill();}}
  }

  private drawSelection(selected: string) {
    const overlay = this.layers!.overlay;
    this.clear(overlay);
    const r=this.regions.get(selected);if(!r)return;
    const w=r.center;
    const n=visualNode('Selection outline',overlay,w.x,-w.y,0,0),g=n.addComponent(Graphics);
    const trace=()=>{this.trace(g,r.boundary,w);g.stroke();};
    g.strokeColor = tint(this.palette.gold, 240); g.lineWidth = 9; trace();
    g.strokeColor = tint(this.palette.paper); g.lineWidth = 3; trace();
    const marker = visualNode('Selected field name', n, 0, -(QUAD_HALF_HEIGHT + 34), 168, 44), mg = marker.addComponent(Graphics);
    mg.fillColor = tint(this.palette.paper, 245); mg.roundRect(-84, -22, 168, 44, 12); mg.fill();
    mg.strokeColor = tint(this.palette.gold); mg.lineWidth = 3; mg.roundRect(-84, -22, 168, 44, 12); mg.stroke();
    const caption = visualNode('Name', marker, 0, 0, 160, 40), label = caption.addComponent(Label);
    label.string = plotName(selected); label.fontSize = 24; label.lineHeight = 30; label.color = tint(this.palette.ink);
  }

  /** River art for one water cell: dedicated orientation slots, corners only
   * ever need the base art plus a 180° rotation (plan §6.4 — no mirroring). */
  private placeRiverArt(parent: Node, seg: layout.RiverSegment): Node | null {
    const slot = seg.kind === 'corner' ? 'env.river.corner' : seg.kind === 'straight-y' ? 'env.river.straight.y' : 'env.river.straight';
    const n = this.placeImage(slot, parent, 0, 0);
    if (!n) return null;
    if (seg.rotation === 180) n.angle = 180;
    return n;
  }

  /** Layers only; all environment content is chunk-driven (plan §5.3). The fog
   * layer sits below the river so merged unknown ground never covers water. */
  private ensureWorld() {
    if (this.layers) return;
    this.layers = {
      ground: visualNode('Scenic ground', this.map),
      fog: visualNode('Scenic fog', this.map),
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
    for(const n of this.chunkStanding.get(key)??[]){this.depth.delete(n);n.active=false;n.destroy();}this.chunkStanding.delete(key);
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
      const art = this.placeRiverArt(river, seg);
      if (art) { art.setPosition(w.x, -w.y); continue; }
      const [p1, p2] = layout.riverPorts(seg);
      const n = visualNode('River ' + seg.cell.x + ',' + seg.cell.y, river, w.x, -w.y, 0, 0), g = n.addComponent(Graphics);
      g.strokeColor = tint(FALLBACK_COLORS.water); g.lineWidth = 46;
      g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
      g.moveTo(p1.x - w.x, -(p1.y - w.y)); g.lineTo(0, 0); g.lineTo(p2.x - w.x, -(p2.y - w.y)); g.stroke();
    }
    if (content.spring) {
      const s = layout.RIVER_SPRING;
      const n = visualNode('River spring', river, s.x, -s.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint(FALLBACK_COLORS.water); g.ellipse(0, 0, 110, 65); g.fill();
      g.strokeColor = tint(P.status, 180); g.lineWidth = 10; g.ellipse(0, 0, 118, 73); g.stroke();
    }
    // Flower overlays sit on the ground below the plot layer (plots may cover them later).
    for (const cell of content.flowerCells) {
      const w = logicalToWorld(cell);
      const placed = this.placeImage('env.flowers', river, w.x, w.y);
      if (placed) { const h = cellHash(cell.x, cell.y); placed.setScale((h & 1) ? -1 : 1, (h & 2) ? -1 : 1, 1); }
    }
    // Packed-earth streets in the belts: darker wide under-stroke + warm sand core, round caps.
    const path = visualNode('Chunk streets ' + key, L.path);
    const env = visualNode('Chunk env ' + key, L.env);
    const owned:Node[]=[];this.chunkStanding.set(key,owned);
    const track = (node: Node | null, y: number) => { if (node){node.setParent(L.env);this.depth.set(node,y);owned.push(node);} };
    for (const b of content.bridges) {
      const placed = this.placeImage('env.bridge', env, b.world.x, b.world.y);
      if (placed) { track(placed, b.world.y); continue; }
      const n = visualNode('Bridge', env, b.world.x, -b.world.y, 0, 0), g = n.addComponent(Graphics);
      g.fillColor = tint('#8a6a44'); g.roundRect(-90, -16, 180, 32, 6); g.fill();
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

    this.chunks.set(key, { ground, river, path, env });
  }
  private trace(g:Graphics,boundary:WorldPoint[],origin:WorldPoint={x:0,y:0}){
    if(!boundary.length)return;g.moveTo(boundary[0].x-origin.x,-(boundary[0].y-origin.y));
    for(const p of boundary.slice(1))g.lineTo(p.x-origin.x,-(p.y-origin.y));g.close();
  }
  private clearStanding(e:PlotEntry){for(const n of e.standing){this.depth.delete(n);n.active=false;n.destroy();}e.standing=[];}
  private syncEnvironment(){
    if(this.environmentNode||!this.scene)return;
    this.environmentNode=visualNode('Scene road regions',this.layers!.path);
    const g=this.environmentNode.addComponent(Graphics);
    for(const r of this.scene.regions.filter(r=>r.type==='path')){
      g.fillColor=tint(PATH_EDGE);this.trace(g,r.boundary);g.fill();
      if(r.innerBoundary){g.fillColor=tint(PATH_FILL);this.trace(g,r.innerBoundary);g.fill();}
    }
  }

}
