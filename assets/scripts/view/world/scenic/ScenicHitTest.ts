import { LogicalPoint, ScenicWorldPoint, logicalToWorld, pointInDiamond, worldToLogical } from './ScenicProjection';

export interface HitCandidate extends LogicalPoint { id: string; interactive?: boolean }

/** World point → plot id via candidate generation + point-in-diamond.
 * Boundary-inclusive; shared edges resolve to the front (higher x+y) plot.
 * Deliberately independent from the legacy row/column grid hit algorithm. */
export function hitTestPlot(world: ScenicWorldPoint, plots: Iterable<HitCandidate>): string | null {
  const approx = worldToLogical(world), cx = Math.round(approx.x), cy = Math.round(approx.y);
  const near = new Set<string>();
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) near.add((cx + dx) + ',' + (cy + dy));
  let best: { id: string; depth: number } | null = null;
  for (const p of plots) {
    if (p.interactive === false) continue;
    if (!near.has(p.x + ',' + p.y)) continue;
    if (!pointInDiamond(world, logicalToWorld(p))) continue;
    const depth = p.x + p.y;
    if (!best || depth > best.depth) best = { id: p.id, depth };
  }
  return best?.id ?? null;
}
