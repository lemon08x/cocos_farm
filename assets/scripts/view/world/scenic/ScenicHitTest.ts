import { LogicalPoint, ScenicWorldPoint, logicalToWorld, pointInQuad, worldToLogical } from './ScenicProjection';

export interface HitCandidate extends LogicalPoint { id: string; interactive?: boolean }

/** World point → plot id via candidate generation + point-in-quad (plan §4.3:
 * the plot quad is the single geometry shared by art, selection outline, hit
 * test and minimap). The quad is smaller than its ground cell, so the belts
 * between plots hit nothing; a point exactly on a quad edge or corner belongs
 * to the quad, and any residual tie resolves to the front (higher x+y) plot.
 * Deliberately independent from the legacy row/column grid hit algorithm. */
export function hitTestPlot(world: ScenicWorldPoint, plots: Iterable<HitCandidate>): string | null {
  const approx = worldToLogical(world), cx = Math.round(approx.x), cy = Math.round(approx.y);
  const near = new Set<string>();
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) near.add((cx + dx) + ',' + (cy + dy));
  let best: { id: string; depth: number } | null = null;
  for (const p of plots) {
    if (p.interactive === false) continue;
    if (!near.has(p.x + ',' + p.y)) continue;
    if (!pointInQuad(world, logicalToWorld(p))) continue;
    const depth = p.x + p.y;
    if (!best || depth > best.depth) best = { id: p.id, depth };
  }
  return best?.id ?? null;
}
