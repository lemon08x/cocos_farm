import { LogicalPoint, ScenicWorldPoint, logicalToWorld, plotQuad, pointInPolygon, segmentsCross } from './ScenicProjection';
import * as layout from './ScenicLayout';
import { ScenicRegion, courtyardRegions, plotRegion } from './ScenicRegionLayout';

/** Pure-function layout checks (plan §4.2, §10.1): region geometry must hold
 * for the initial courtyard, the connected east/south districts, negative
 * coordinates and later expansion alike — a passing initial map must never
 * hide overlaps that appear after exploration. No engine imports. */

/** Strict point-in-polygon: boundary points do NOT count (used for interior tests). */
function strictlyInside(p: ScenicWorldPoint, poly: ScenicWorldPoint[]): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < 1e-6 && Math.min(a.x, b.x) - 1e-6 <= p.x && p.x <= Math.max(a.x, b.x) + 1e-6 && Math.min(a.y, b.y) - 1e-6 <= p.y && p.y <= Math.max(a.y, b.y) + 1e-6) return false;
  }
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Interior overlap of two polygons; touching edges or corners is allowed. */
export function polygonsOverlap(a: ScenicWorldPoint[], b: ScenicWorldPoint[]): boolean {
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      if (segmentsCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
  return a.some(p => strictlyInside(p, b)) || b.some(p => strictlyInside(p, a));
}

/** Representative logical cells: initial courtyard, east/south districts,
 * negative coordinates and far expansion in one sweep (plan §4.2). */
export function representativeCells(): LogicalPoint[] {
  const cells: LogicalPoint[] = [];
  for (let x = -8; x <= 12; x++) for (let y = -8; y <= 12; y++) cells.push({ x, y });
  return cells;
}

/** Plot quads must never intersect path or decorative-river interiors.
 * Cells reserved by the homestead/river carry no plot region in the handcrafted
 * set (plan §4.1 reserved space), so their formula quads are exempt — this is
 * also what allows the two bridge streets to cross their bridge cells. */
export function validatePlotQuadsVsRegions(cells: LogicalPoint[], regions: ScenicRegion[]): string[] {
  const problems: string[] = [];
  const blockers = regions.filter(r => r.type === 'path' || r.type === 'river');
  for (const cell of cells) {
    if (layout.isRiverCell(cell.x, cell.y) || layout.isHomesteadReservedCell(cell.x, cell.y)) continue;
    const region = plotRegion(cell.x, cell.y);
    for (const other of blockers) {
      if (polygonsOverlap(region.boundary, other.boundary))
        problems.push(`plot quad ${region.regionId} intersects ${other.regionId}`);
    }
  }
  return problems;
}

/** No two plot quads may share an interior point (checked against all 8
 * neighbours so shared-edge selection rules never get ambiguous). */
export function validatePlotQuadSeparation(cells: LogicalPoint[]): string[] {
  const problems: string[] = [];
  const quads = new Map<string, ScenicWorldPoint[]>();
  for (const cell of cells) quads.set(cell.x + ',' + cell.y, plotQuad(logicalToWorld(cell)));
  for (const cell of cells) {
    const a = quads.get(cell.x + ',' + cell.y)!;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, -1], [-1, 1], [1, 1], [-1, -1], [2, -1], [1, -2]] as const) {
      const b = quads.get(cell.x + dx + ',' + (cell.y + dy));
      if (b && polygonsOverlap(a, b)) problems.push(`plot quads ${cell.x},${cell.y} and ${cell.x + dx},${cell.y + dy} share an interior point`);
    }
  }
  return problems;
}

/** The river chain: consecutive segments share a port that is exactly the
 * shared-edge midpoint of the two cells; the waterway is a single connected
 * component; loose ends are only the spring source or the pannable exit. */
export function validateRiverChain(): string[] {
  const problems: string[] = [];
  const segs = layout.RIVER_SEGMENTS;
  const keyOf = (p: ScenicWorldPoint) => Math.round(p.x * 1000) + ',' + Math.round(p.y * 1000);
  const byPort = new Map<string, number[]>();
  segs.forEach((seg, i) => {
    for (const p of layout.riverPorts(seg)) {
      const k = keyOf(p);
      if (!byPort.has(k)) byPort.set(k, []);
      byPort.get(k)!.push(i);
    }
  });
  const L = layout.CAMERA_LIMITS, margin = { x: 720 / 2 / L.minZoom, y: 1280 / 2 / L.minZoom };
  const outside = (p: ScenicWorldPoint) => p.x < L.minX - margin.x || p.x > L.maxX + margin.x || p.y < L.minY - margin.y || p.y > L.maxY + margin.y;
  segs.forEach((seg, i) => {
    for (const p of layout.riverPorts(seg)) {
      const shared = (byPort.get(keyOf(p)) ?? []).length >= 2;
      const spring = Math.hypot(p.x - layout.RIVER_SPRING.x, p.y - layout.RIVER_SPRING.y) < 2;
      if (!shared && !spring && !outside(p)) problems.push(`river port of cell ${seg.cell.x},${seg.cell.y} dead-ends inside the map`);
    }
    if (i === 0) return;
    const prev = segs[i - 1], d = Math.abs(prev.cell.x - seg.cell.x) + Math.abs(prev.cell.y - seg.cell.y);
    if (d !== 1) { problems.push(`river cells ${prev.cell.x},${prev.cell.y} and ${seg.cell.x},${seg.cell.y} are not edge-adjacent`); return; }
    const pa = layout.riverPorts(prev), pb = layout.riverPorts(seg);
    const shared = pa.some(a => pb.some(b => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6));
    if (!shared) problems.push(`river cells ${prev.cell.x},${prev.cell.y} and ${seg.cell.x},${seg.cell.y} do not share an edge midpoint`);
    else {
      const ca = logicalToWorld(prev.cell), cb = logicalToWorld(seg.cell);
      const mid = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
      if (!pa.some(p => Math.hypot(p.x - mid.x, p.y - mid.y) < 1e-6)) problems.push(`river port between ${prev.cell.x},${prev.cell.y} and ${seg.cell.x},${seg.cell.y} is not the shared-edge midpoint`);
    }
  });
  const parent = segs.map((_, i) => i);
  const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (const list of byPort.values()) for (let i = 1; i < list.length; i++) parent[find(list[0])] = find(list[i]);
  if (new Set(segs.map((_, i) => find(i))).size !== 1) problems.push('the river is not a single connected component');
  return problems;
}

/** Bridges anchor only on straight-x river segments (the fixed bridge art
 * orientation) and sit on the segment's cell center. */
export function validateBridges(): string[] {
  const problems: string[] = [];
  for (const b of layout.BRIDGES) {
    const seg = layout.RIVER_SEGMENTS.find(s => s.cell.x === b.cell.x && s.cell.y === b.cell.y);
    if (!seg) { problems.push(`bridge at ${b.cell.x},${b.cell.y} is not on a river cell`); continue; }
    if (seg.kind !== 'straight-x') problems.push(`bridge at ${b.cell.x},${b.cell.y} must anchor on a straight-x river segment, got ${seg.kind}`);
    const center = logicalToWorld(b.cell);
    if (Math.hypot(center.x - b.world.x, center.y - b.world.y) > 1e-6) problems.push(`bridge at ${b.cell.x},${b.cell.y} is not centered on its river cell`);
  }
  return problems;
}

/** The homestead footprint clears every plot quad outside its declared
 * reserved cells — checked across the representative range so expansion into
 * the neighbourhood can never collide with the courtyard. */
export function validateHomestead(cells: LogicalPoint[]): string[] {
  const problems: string[] = [];
  const homestead = courtyardRegions().find(r => r.regionId === 'env.homestead')!;
  for (const cell of cells) {
    if (layout.isHomesteadReservedCell(cell.x, cell.y)) continue;
    if (polygonsOverlap(plotRegion(cell.x, cell.y).boundary, homestead.boundary))
      problems.push(`homestead footprint intersects plot quad ${cell.x},${cell.y}`);
  }
  return problems;
}

/** Full revision-2 layout check; returns every problem found (empty = valid). */
export function validateScenicLayout(cells: LogicalPoint[] = representativeCells()): string[] {
  const regions = courtyardRegions();
  return [
    ...validatePlotQuadsVsRegions(cells, regions),
    ...validatePlotQuadSeparation(cells),
    ...validateRiverChain(),
    ...validateBridges(),
    ...validateHomestead(cells)
  ];
}
