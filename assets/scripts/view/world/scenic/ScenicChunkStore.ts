import type { WorldCamera, WorldViewport } from '../FarmWorldViewContract';
import { LogicalPoint, ScenicWorldPoint, logicalToWorld, pointInQuad, worldToLogical } from './ScenicProjection';
import * as layout from './ScenicLayout';

/** 地景块缓存与卸载 (plan §5.3). Pure data: no engine imports, so test-ui can
 * verify chunking, connection ports and variant determinism directly.
 *
 * The world plane (pixels at zoom 1, y-down) is partitioned into square chunks
 * of CHUNK_SIZE — a chunk spans several logical 3×3 units and chunk edges do
 * NOT align with district borders. Each chunk carries the handcrafted layout
 * pieces whose anchors fall inside it (river cells, street segments, bridges,
 * courtyard decor; the homestead lives in exactly one chunk) plus deterministic
 * filler decor (trees/flowers) hashed from the chunk coordinates — never the
 * core RNG, so exploration results never change.
 *
 * Boundary connections: every chunk declares its river/street crossing points
 * (ports) per edge. Ports are computed from the shared edge itself, so the two
 * chunks adjacent to an edge always declare the same crossings — the river
 * continues and streets meet no matter which chunks are instantiated. River
 * ports are the shared-edge midpoints of the water cells (plan §4.2), not
 * diamond corners.
 *
 * Instantiation & release policy (enforced by ScenicWorldView):
 * - Only chunks returned by visibleChunkKeys (visible rect + one buffer ring)
 *   have live nodes; a chunk node holds river/street/ground/decor children.
 * - When a chunk leaves that set its nodes are destroyed. Chunks never addRef
 *   textures: SpriteFrames stay owned by ScenicArtPack (one per world view),
 *   so destroying the chunk nodes releases the only chunk-side references and
 *   texture lifetime is bounded by the view, not by panning.
 * - Filler decor is filtered against the observed plot quads and the reserved
 *   homestead/river cells (no decor on top of fields, the courtyard or the
 *   water, and nothing leaks real field states); when exploration changes the
 *   plot set the affected chunks are rebuilt from scratch. */

export const CHUNK_SIZE = 1024;
/** Ground tiles are 512px, so every chunk owns exactly 2×2 of them. */
const TILES_PER_CHUNK = CHUNK_SIZE / 512;

export interface ChunkStreetSegment { a: ScenicWorldPoint; b: ScenicWorldPoint; width: number }
export type ChunkEdge = 'n' | 's' | 'e' | 'w';
export interface ChunkPort { kind: 'river' | 'street'; edge: ChunkEdge; world: ScenicWorldPoint }
export interface ScenicChunkContent {
  cx: number; cy: number; key: string;
  groundTiles: ScenicWorldPoint[];
  rivers: layout.RiverSegment[];
  spring: boolean;
  streets: ChunkStreetSegment[];
  bridges: layout.BridgeAnchor[];
  homestead: layout.HomesteadAnchor | null;
  signposts: layout.SignpostAnchor[];
  fences: ScenicWorldPoint[];
  trees: ScenicWorldPoint[];
  flowerCells: LogicalPoint[];
  ports: ChunkPort[];
}

export function chunkKey(cx: number, cy: number): string { return cx + ',' + cy; }
export function chunkOfPoint(p: ScenicWorldPoint): { cx: number; cy: number } {
  return { cx: Math.floor(p.x / CHUNK_SIZE), cy: Math.floor(p.y / CHUNK_SIZE) };
}
export function chunkRect(cx: number, cy: number) {
  return { left: cx * CHUNK_SIZE, right: (cx + 1) * CHUNK_SIZE, top: cy * CHUNK_SIZE, bottom: (cy + 1) * CHUNK_SIZE };
}

/** Chunks intersecting the camera's visible world rect plus `ring` buffer chunks. */
export function visibleChunkKeys(camera: WorldCamera, viewport: WorldViewport, ring = 1): { cx: number; cy: number }[] {
  const hw = viewport.width / 2 / camera.zoom + ring * CHUNK_SIZE;
  const hh = viewport.height / 2 / camera.zoom + ring * CHUNK_SIZE;
  const keys: { cx: number; cy: number }[] = [];
  const cx0 = Math.floor((camera.x - hw) / CHUNK_SIZE), cx1 = Math.floor((camera.x + hw) / CHUNK_SIZE);
  const cy0 = Math.floor((camera.y - hh) / CHUNK_SIZE), cy1 = Math.floor((camera.y + hh) / CHUNK_SIZE);
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) keys.push({ cx, cy });
  return keys;
}

/** Deterministic 0..1 stream from chunk coordinates (decoration only — never core RNG). */
function chunkRand(cx: number, cy: number, i: number): number {
  let h = ((cx * 73856093) ^ (cy * 19349663) ^ (i * 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
  return (h >>> 8) / 16777216;
}

/** Intersection of segment a→b with a chunk edge line, restricted to the edge span. */
function edgeCrossing(a: ScenicWorldPoint, b: ScenicWorldPoint, rect: ReturnType<typeof chunkRect>, edge: ChunkEdge): ScenicWorldPoint | null {
  if (edge === 'e' || edge === 'w') {
    const x = edge === 'e' ? rect.right : rect.left;
    const dx = b.x - a.x;
    if (Math.abs(dx) < 1e-9) return null;
    const t = (x - a.x) / dx;
    if (t <= 0 || t >= 1) return null;
    const y = a.y + t * (b.y - a.y);
    return y > rect.top && y < rect.bottom ? { x, y } : null;
  }
  const y = edge === 's' ? rect.bottom : rect.top;
  const dy = b.y - a.y;
  if (Math.abs(dy) < 1e-9) return null;
  const t = (y - a.y) / dy;
  if (t <= 0 || t >= 1) return null;
  const x = a.x + t * (b.x - a.x);
  return x > rect.left && x < rect.right ? { x, y } : null;
}

function eachStreetSegment(fn: (a: ScenicWorldPoint, b: ScenicWorldPoint, width: number) => void) {
  for (const path of layout.PATHS)
    for (let i = 0; i + 1 < path.points.length; i++) fn(path.points[i], path.points[i + 1], path.width);
}

/** Ports on one edge of a chunk: where river water or a street crosses it.
 * Computed from the shared edge, so both adjacent chunks declare the same port. */
export function edgePorts(cx: number, cy: number, edge: ChunkEdge): ChunkPort[] {
  const rect = chunkRect(cx, cy), ports: ChunkPort[] = [];
  for (const seg of layout.RIVER_SEGMENTS) {
    const [p1, p2] = layout.riverPorts(seg), center = logicalToWorld(seg.cell);
    for (const [a, b] of [[p1, center], [center, p2]] as [ScenicWorldPoint, ScenicWorldPoint][]) {
      const hit = edgeCrossing(a, b, rect, edge);
      if (hit) ports.push({ kind: 'river', edge, world: hit });
    }
  }
  eachStreetSegment((a, b) => {
    const hit = edgeCrossing(a, b, rect, edge);
    if (hit) ports.push({ kind: 'street', edge, world: hit });
  });
  return ports;
}

/** Distance from a point to the street network (used to keep trees off roads). */
function nearStreet(p: ScenicWorldPoint, clearance: number): boolean {
  let hit = false;
  eachStreetSegment((a, b) => {
    if (hit) return;
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
    hit = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) < clearance;
  });
  return hit;
}

function insideOccupied(p: ScenicWorldPoint, occupied: ReadonlySet<string>): boolean {
  const approx = worldToLogical(p), cx = Math.round(approx.x), cy = Math.round(approx.y);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const cell = { x: cx + dx, y: cy + dy };
    if (occupied.has(cell.x + ',' + cell.y) && pointInQuad(p, logicalToWorld(cell))) return true;
  }
  return false;
}

function insideHomestead(p: ScenicWorldPoint): boolean {
  const f = layout.homesteadFootprint();
  return p.x > f.left - 60 && p.x < f.right + 60 && p.y > f.top - 60 && p.y < f.bottom + 60;
}

/** Full deterministic content of one chunk. `occupied` holds observed plot cell
 * keys ("x,y"); filler decor never lands on their quads, so unexplored areas
 * keep their merged fog and no real field state leaks through decoration. */
export function chunkContent(cx: number, cy: number, occupied: ReadonlySet<string> = new Set()): ScenicChunkContent {
  const rect = chunkRect(cx, cy);
  const inChunk = (p: ScenicWorldPoint) => p.x >= rect.left && p.x < rect.right && p.y >= rect.top && p.y < rect.bottom;
  const groundTiles: ScenicWorldPoint[] = [];
  for (let i = 0; i < TILES_PER_CHUNK; i++) for (let j = 0; j < TILES_PER_CHUNK; j++)
    groundTiles.push({ x: rect.left + i * 512, y: rect.top + j * 512 });
  const rivers = layout.RIVER_SEGMENTS.filter(s => inChunk(logicalToWorld(s.cell)));
  const streets: ChunkStreetSegment[] = [];
  eachStreetSegment((a, b, width) => {
    if (inChunk({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })) streets.push({ a, b, width });
  });
  const bridges = layout.BRIDGES.filter(b => inChunk(b.world));
  const homestead = inChunk(layout.HOMESTEAD.world) ? layout.HOMESTEAD : null;
  const signposts = layout.SIGNPOSTS.filter(s => inChunk(s.world));
  const fences = layout.FENCES.filter(f => inChunk(f));
  const trees = layout.TREES.filter(t => inChunk(t));
  const flowerCells = layout.FLOWER_CELLS.filter(c => inChunk(logicalToWorld(c)));
  // Filler trees: 1-3 per chunk on free ground, clear of plot quads, water,
  // the courtyard and streets.
  const treeCount = 1 + Math.floor(chunkRand(cx, cy, 0) * 2.999);
  for (let i = 0; i < treeCount; i++) {
    const p = {
      x: rect.left + 120 + chunkRand(cx, cy, 1 + i * 2) * (CHUNK_SIZE - 240),
      y: rect.top + 120 + chunkRand(cx, cy, 2 + i * 2) * (CHUNK_SIZE - 240)
    };
    const cell = worldToLogical(p), key = Math.round(cell.x) + ',' + Math.round(cell.y);
    if (layout.RIVER_CELLS.has(key) || layout.isHomesteadReservedCell(Math.round(cell.x), Math.round(cell.y))) continue;
    if (insideOccupied(p, occupied) || insideHomestead(p) || nearStreet(p, 110)) continue;
    if (trees.some(t => Math.hypot(t.x - p.x, t.y - p.y) < 260)) continue;
    trees.push(p);
  }
  // Filler flowers: deterministic free cells inside the chunk.
  const u0 = Math.floor(rect.left / 150), u1 = Math.ceil(rect.right / 150);
  const v0 = Math.floor(rect.top / 90), v1 = Math.ceil(rect.bottom / 90);
  for (let u = u0; u <= u1; u++) for (let v = v0; v <= v1; v++) {
    // u = x−y, v+4 = x+y → solve for integer cells only.
    if (((u + v) & 1) !== 0) continue;
    const cell = { x: (u + v) / 2, y: (v - u) / 2 };
    const w = logicalToWorld(cell);
    if (!inChunk(w)) continue;
    const key = cell.x + ',' + cell.y;
    if (occupied.has(key) || layout.RIVER_CELLS.has(key) || layout.isHomesteadReservedCell(cell.x, cell.y)) continue;
    if (flowerCells.some(c => c.x === cell.x && c.y === cell.y)) continue;
    const h = ((cell.x * 73856093) ^ (cell.y * 19349663)) >>> 0;
    if (h % 5 === 0) flowerCells.push(cell);
  }
  const ports: ChunkPort[] = [];
  for (const edge of ['n', 's', 'e', 'w'] as ChunkEdge[]) ports.push(...edgePorts(cx, cy, edge));
  return { cx, cy, key: chunkKey(cx, cy), groundTiles, rivers, spring: inChunk(layout.RIVER_SPRING), streets, bridges, homestead, signposts, fences, trees, flowerCells, ports };
}

/** Tracks which chunks currently have live nodes. sync() reports which chunk
 * nodes to build and which to destroy; the world view owns the actual nodes. */
export class ScenicChunkStore {
  private loaded = new Set<string>();
  sync(needed: Iterable<{ cx: number; cy: number }>): { added: { cx: number; cy: number }[]; removed: string[] } {
    const want = new Set<string>();
    for (const k of needed) want.add(chunkKey(k.cx, k.cy));
    const added: { cx: number; cy: number }[] = [], removed: string[] = [];
    for (const k of want) if (!this.loaded.has(k)) {
      const [cx, cy] = k.split(',').map(Number);
      added.push({ cx, cy });
    }
    for (const k of Array.from(this.loaded)) if (!want.has(k)) removed.push(k);
    this.loaded = want;
    return { added, removed };
  }
  clear() { this.loaded.clear(); }
  get size() { return this.loaded.size; }
}
