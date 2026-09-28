/** 2:1 oblique projection for the scenic (田园场景) map version.
 * Logical plot coordinates map to a y-down world plane measured in pixels at
 * zoom 1; p2q2 renders at the world origin. Pure math, no engine imports. */
export interface LogicalPoint { x: number; y: number }
export interface ScenicWorldPoint { x: number; y: number }
export interface ScenicCamera { x: number; y: number; zoom: number }

export const SCENIC_STEP_X = 130;
export const SCENIC_STEP_Y = 65;
export const SCENIC_ORIGIN_SUM = 4;
export const DIAMOND_HALF_WIDTH = 130;
export const DIAMOND_HALF_HEIGHT = 65;

export function logicalToWorld(p: LogicalPoint): ScenicWorldPoint {
  return { x: (p.x - p.y) * SCENIC_STEP_X, y: (p.x + p.y - SCENIC_ORIGIN_SUM) * SCENIC_STEP_Y };
}
export function worldToLogical(p: ScenicWorldPoint): LogicalPoint {
  const u = p.x / SCENIC_STEP_X, v = p.y / SCENIC_STEP_Y + SCENIC_ORIGIN_SUM;
  return { x: (u + v) / 2, y: (v - u) / 2 };
}
/** Diamond footprint of the plot at center: top, right, bottom, left. */
export function plotDiamond(center: ScenicWorldPoint): ScenicWorldPoint[] {
  return [
    { x: center.x, y: center.y - DIAMOND_HALF_HEIGHT },
    { x: center.x + DIAMOND_HALF_WIDTH, y: center.y },
    { x: center.x, y: center.y + DIAMOND_HALF_HEIGHT },
    { x: center.x - DIAMOND_HALF_WIDTH, y: center.y }
  ];
}
/** Boundary-inclusive: a point on the edge or corner belongs to the diamond. */
export function pointInDiamond(p: ScenicWorldPoint, center: ScenicWorldPoint): boolean {
  return Math.abs(p.x - center.x) / DIAMOND_HALF_WIDTH + Math.abs(p.y - center.y) / DIAMOND_HALF_HEIGHT <= 1;
}
/** Camera: the world point shown at the viewport center, plus zoom.
 * Screen offsets are measured from the viewport center, y-down like the world plane. */
export function worldToScreen(p: ScenicWorldPoint, camera: ScenicCamera): ScenicWorldPoint {
  return { x: (p.x - camera.x) * camera.zoom, y: (p.y - camera.y) * camera.zoom };
}
export function screenToWorld(p: ScenicWorldPoint, camera: ScenicCamera): ScenicWorldPoint {
  return { x: p.x / camera.zoom + camera.x, y: p.y / camera.zoom + camera.y };
}
