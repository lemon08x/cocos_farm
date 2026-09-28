import type { PlotRenderModel, WorldCamera, WorldViewport } from '../FarmWorldViewContract';
import { logicalToWorld } from './ScenicProjection';
import { HOMESTEAD } from './ScenicLayout';

/** Real-data minimap model for the scenic district navigator (plan §7).
 * Pure functions, no engine imports: the HUD draws what this returns.
 * Cells come only from observation data — unexplored plots render as mist and
 * never leak their real terrain; the homestead is the fixed courtyard anchor. */

export type MinimapTone = 'mist' | 'field' | 'water' | 'green' | 'home';
export interface MinimapCell { x: number; y: number; tone: MinimapTone }
export interface MinimapView { x: number; y: number; w: number; h: number }
export interface MinimapModel { cells: MinimapCell[]; view: MinimapView; scale: number }

/** Observation kind → minimap tone. Unknown stays mist regardless of anything
 * else on the plot (no terrain leak); water includes springs. */
export function minimapTone(plot: Pick<PlotRenderModel, 'kind' | 'discovery'>): MinimapTone {
  if (plot.kind === 'unknown') return 'mist';
  if (plot.kind === 'water' || plot.discovery?.id === 'spring') return 'water';
  if (plot.kind === 'field') return 'field';
  return 'green';
}

/** Scale and offset that fit the known plots (plus the courtyard anchor) into
 * a size×size box; world px → minimap px about the bounds center. */
export function buildMinimapModel(
  plots: Pick<PlotRenderModel, 'id' | 'x' | 'y' | 'kind' | 'discovery' | 'reachable'>[],
  camera: WorldCamera, viewport: WorldViewport, size: number
): MinimapModel {
  const known = plots.filter(p => p.kind !== 'unknown' || p.reachable);
  const points = known.map(p => logicalToWorld(p));
  points.push({ x: HOMESTEAD.world.x, y: HOMESTEAD.world.y });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const pad = 14, spanX = Math.max(260, maxX - minX), spanY = Math.max(260, maxY - minY);
  const scale = (size - pad * 2) / Math.max(spanX, spanY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const project = (wx: number, wy: number) => ({ x: (wx - cx) * scale, y: (wy - cy) * scale });
  const cells: MinimapCell[] = known.map(p => {
    const w = logicalToWorld(p), pt = project(w.x, w.y);
    return { x: pt.x, y: pt.y, tone: p.id === 'p2q2' ? 'home' : minimapTone(p) };
  });
  const hw = viewport.width / 2 / camera.zoom, hh = viewport.height / 2 / camera.zoom;
  const tl = project(camera.x - hw, camera.y - hh);
  return { cells, view: { x: tl.x, y: tl.y, w: hw * 2 * scale, h: hh * 2 * scale }, scale };
}

/** Cheap signature so the HUD redraws only when data or camera actually moved. */
export function minimapSignature(plots: Pick<PlotRenderModel, 'id' | 'kind' | 'reachable'>[], camera: WorldCamera): string {
  let known = 0;
  for (const p of plots) if (p.kind !== 'unknown' || p.reachable) known++;
  return [plots.length, known, Math.round(camera.x), Math.round(camera.y), Math.round(camera.zoom * 100)].join('|');
}
