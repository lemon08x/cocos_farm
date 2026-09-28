/** Oblique projection for the scenic (田园场景) map version, revision 2.
 * Logical plot coordinates map to a y-down world plane measured in pixels at
 * zoom 1; p2q2 renders at the world origin. Pure math, no engine imports.
 *
 * Revision 2 geometry (plan §4): the full ground cell is a 300×180 diamond
 * (half extents 150×90); the interactive plot tilled quad is a smaller
 * 228×142 diamond (half extents 114×71) centered on the cell, so adjacent
 * plots keep ~40–70px environment belts for roads, ridges and vegetation.
 * Rivers connect through the shared-edge midpoints of neighbouring cell
 * diamonds — never through diamond corners. */
export interface LogicalPoint { x: number; y: number }
export interface ScenicWorldPoint { x: number; y: number }
export interface ScenicCamera { x: number; y: number; zoom: number }

export const SCENIC_STEP_X = 150;
export const SCENIC_STEP_Y = 90;
export const SCENIC_ORIGIN_SUM = 4;
/** Full ground-cell diamond 300×180 (ground, river and region boundaries). */
export const CELL_HALF_WIDTH = 150;
export const CELL_HALF_HEIGHT = 90;
/** Plot tilled quad 228×142: the interactive soil/crop/selection outline. */
export const QUAD_HALF_WIDTH = 114;
export const QUAD_HALF_HEIGHT = 71;

export function logicalToWorld(p: LogicalPoint): ScenicWorldPoint {
  return { x: (p.x - p.y) * SCENIC_STEP_X, y: (p.x + p.y - SCENIC_ORIGIN_SUM) * SCENIC_STEP_Y };
}
export function worldToLogical(p: ScenicWorldPoint): LogicalPoint {
  const u = p.x / SCENIC_STEP_X, v = p.y / SCENIC_STEP_Y + SCENIC_ORIGIN_SUM;
  return { x: (u + v) / 2, y: (v - u) / 2 };
}
/** Plot quad footprint around a cell center: top, right, bottom, left. */
export function plotQuad(center: ScenicWorldPoint): ScenicWorldPoint[] {
  return [
    { x: center.x, y: center.y - QUAD_HALF_HEIGHT },
    { x: center.x + QUAD_HALF_WIDTH, y: center.y },
    { x: center.x, y: center.y + QUAD_HALF_HEIGHT },
    { x: center.x - QUAD_HALF_WIDTH, y: center.y }
  ];
}
/** Boundary-inclusive: a point on the edge or corner belongs to the quad. */
export function pointInQuad(p: ScenicWorldPoint, center: ScenicWorldPoint): boolean {
  return Math.abs(p.x - center.x) / QUAD_HALF_WIDTH + Math.abs(p.y - center.y) / QUAD_HALF_HEIGHT <= 1;
}
/** Full ground-cell diamond around a cell center: top, right, bottom, left. */
export function cellDiamond(center: ScenicWorldPoint): ScenicWorldPoint[] {
  return [
    { x: center.x, y: center.y - CELL_HALF_HEIGHT },
    { x: center.x + CELL_HALF_WIDTH, y: center.y },
    { x: center.x, y: center.y + CELL_HALF_HEIGHT },
    { x: center.x - CELL_HALF_WIDTH, y: center.y }
  ];
}
export function pointInCellDiamond(p: ScenicWorldPoint, center: ScenicWorldPoint): boolean {
  return Math.abs(p.x - center.x) / CELL_HALF_WIDTH + Math.abs(p.y - center.y) / CELL_HALF_HEIGHT <= 1;
}

/** Midpoints of a cell diamond's four edges — the only legal river ports.
 * Each midpoint is shared with exactly one logical neighbour:
 * ul ↔ (x−1,y), lr ↔ (x+1,y), ur ↔ (x,y−1), ll ↔ (x,y+1). */
export type CellEdgeId = 'ul' | 'ur' | 'll' | 'lr';
export const CELL_EDGE_NEIGHBOR: Record<CellEdgeId, LogicalPoint> = {
  ul: { x: -1, y: 0 }, lr: { x: 1, y: 0 }, ur: { x: 0, y: -1 }, ll: { x: 0, y: 1 }
};
export function cellEdgeMidpoint(cell: LogicalPoint, edge: CellEdgeId): ScenicWorldPoint {
  const c = logicalToWorld(cell);
  switch (edge) {
    case 'ul': return { x: c.x - CELL_HALF_WIDTH / 2, y: c.y - CELL_HALF_HEIGHT / 2 };
    case 'ur': return { x: c.x + CELL_HALF_WIDTH / 2, y: c.y - CELL_HALF_HEIGHT / 2 };
    case 'll': return { x: c.x - CELL_HALF_WIDTH / 2, y: c.y + CELL_HALF_HEIGHT / 2 };
    case 'lr': return { x: c.x + CELL_HALF_WIDTH / 2, y: c.y + CELL_HALF_HEIGHT / 2 };
  }
}

/** Camera: the world point shown at the viewport center, plus zoom.
 * Screen offsets are measured from the viewport center, y-down like the world plane. */
export function worldToScreen(p: ScenicWorldPoint, camera: ScenicCamera): ScenicWorldPoint {
  return { x: (p.x - camera.x) * camera.zoom, y: (p.y - camera.y) * camera.zoom };
}
export function screenToWorld(p: ScenicWorldPoint, camera: ScenicCamera): ScenicWorldPoint {
  return { x: p.x / camera.zoom + camera.x, y: p.y / camera.zoom + camera.y };
}

/** Strict proper crossing of two segments (endpoint touches are boundary, not crossing). */
export function segmentsCross(a: ScenicWorldPoint, b: ScenicWorldPoint, c: ScenicWorldPoint, d: ScenicWorldPoint): boolean {
  const o = (p: ScenicWorldPoint, q: ScenicWorldPoint, r: ScenicWorldPoint) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
/** Ray-cast point in polygon (boundary counts as inside). */
export function pointInPolygon(p: ScenicWorldPoint, poly: ScenicWorldPoint[]): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < 1e-9 && Math.min(a.x, b.x) - 1e-9 <= p.x && p.x <= Math.max(a.x, b.x) + 1e-9 && Math.min(a.y, b.y) - 1e-9 <= p.y && p.y <= Math.max(a.y, b.y) + 1e-9) return true;
  }
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
