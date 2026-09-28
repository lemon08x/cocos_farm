import type { DistrictId, WorldCamera } from '../FarmWorldViewContract';
import { LogicalPoint, ScenicWorldPoint, logicalToWorld } from './ScenicProjection';

/** Courtyard (院前) scene layout: anchors, outlines and layer order live here,
 * separate from the scenic image manifest (which owns files, sizes, anchors).
 * All positions are world-plane pixels at zoom 1 (y-down). Pure data, no engine imports. */

/** Camera targets sit this far below the content center so fields clear the bottom HUD. */
export const CAMERA_LIFT = 40;
/** First screen (720×1280): homestead fully visible upper-left, six home plots recognizable. */
export const DEFAULT_CAMERA: WorldCamera = { x: -220, y: -135, zoom: 1.05 };
/** P4: limits now reach the east (1,0) and south (0,1) district centers plus the
 * southern river run and the bridge, so every connected area stays pannable. */
export const CAMERA_LIMITS = { minX: -1150, maxX: 950, minY: -650, maxY: 820, minZoom: .8, maxZoom: 2.4 };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export function clampScenicCamera(camera: WorldCamera): WorldCamera {
  return {
    x: clamp(camera.x, CAMERA_LIMITS.minX, CAMERA_LIMITS.maxX),
    y: clamp(camera.y, CAMERA_LIMITS.minY, CAMERA_LIMITS.maxY),
    zoom: clamp(camera.zoom, CAMERA_LIMITS.minZoom, CAMERA_LIMITS.maxZoom)
  };
}

/** Independent environment node north-west of the home plots; never replaces a plot's soil/crop/selection.
 * Footprint (−510..−50 × −594..−214) clears every initial plot diamond (x 1..5, y 1..4) and the river chain. */
export interface HomesteadAnchor { world: ScenicWorldPoint; width: number; height: number; anchor: [number, number] }
export const HOMESTEAD: HomesteadAnchor = { world: { x: -280, y: -290 }, width: 460, height: 380, anchor: [0.5, 0.8] };
export function homesteadFootprint() {
  const h = HOMESTEAD;
  return {
    left: h.world.x - h.width / 2, right: h.world.x + h.width / 2,
    top: h.world.y - h.anchor[1] * h.height, bottom: h.world.y + (1 - h.anchor[1]) * h.height
  };
}

/** River chain along the far west edge: straight-y entry (long axis rotated 90°,
 * SPEC §6) flowing south on logical diagonal x−y=−5, then a zigzag of corner
 * segments down the x=−3 column to the south-west exit. Every cell is outside
 * the initial observed plot set (which extendsFarm grows to x −2..6, y −2..6)
 * and clears the homestead footprint, so the water is a continuous environment
 * feature and never hides under an interactive plot. Corner variants are
 * orientation flips of env.river.corner (base ports: left in → bottom out). */
export interface RiverSegment { cell: LogicalPoint; kind: 'straight-x' | 'straight-y' | 'corner' | 'corner-fx' | 'corner-fy' | 'corner-fxy' }
export type RiverKind = RiverSegment['kind'];
/** Diamond corner ids used as water ports (SPEC §6: ports sit at the shared corners). */
export type RiverPort = 'L' | 'R' | 'T' | 'B';
/** Port assignment per art kind (world orientation; the base corner is left-in →
 * bottom-out per SPEC §6, the flips mirror it). Verified against the P3 west chain. */
export const RIVER_KIND_PORTS: Record<RiverKind, [RiverPort, RiverPort]> = {
  'straight-x': ['L', 'R'], 'straight-y': ['T', 'B'],
  'corner': ['L', 'B'], 'corner-fx': ['R', 'B'], 'corner-fy': ['L', 'T'], 'corner-fxy': ['R', 'T']
};
/** World position of a cell's diamond corner. */
export function cellCorner(cell: LogicalPoint, port: RiverPort): ScenicWorldPoint {
  const c = logicalToWorld(cell);
  switch (port) {
    case 'L': return { x: c.x - 130, y: c.y };
    case 'R': return { x: c.x + 130, y: c.y };
    case 'T': return { x: c.x, y: c.y - 65 };
    case 'B': return { x: c.x, y: c.y + 65 };
  }
}
export function riverPorts(seg: RiverSegment): [ScenicWorldPoint, ScenicWorldPoint] {
  const [a, b] = RIVER_KIND_PORTS[seg.kind];
  return [cellCorner(seg.cell, a), cellCorner(seg.cell, b)];
}

/** One continuous river (single connected chain, verified by test-ui):
 * enters from a spring pond in the far north-west, runs the west column south,
 * turns east south of the farm and exits off the east pan edge. Every cell stays
 * outside the initial observed plot set (x −2..6 × y −2..6); the water never
 * stops inside the pannable area (the north end is a spring source pool).
 * P4 extends the P3 courtyard chain with the entry pair, the south turn and the
 * east straight run (straight-x cells keep x+y=14, i.e. world y=650). */
export const RIVER_SEGMENTS: RiverSegment[] = [
  { cell: { x: -7, y: -2 }, kind: 'straight-y' },
  { cell: { x: -6, y: -1 }, kind: 'straight-y' },
  { cell: { x: -5, y: 0 }, kind: 'straight-y' },
  { cell: { x: -4, y: 1 }, kind: 'straight-y' },
  { cell: { x: -3, y: 2 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 3 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 4 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 5 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 6 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 7 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 8 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 9 }, kind: 'corner-fxy' },
  { cell: { x: -2, y: 8 }, kind: 'corner' },
  { cell: { x: -1, y: 9 }, kind: 'straight-y' },
  { cell: { x: 0, y: 10 }, kind: 'corner-fxy' },
  { cell: { x: 1, y: 9 }, kind: 'corner' },
  { cell: { x: 2, y: 10 }, kind: 'straight-y' },
  { cell: { x: 3, y: 11 }, kind: 'corner-fxy' },
  { cell: { x: 4, y: 10 }, kind: 'straight-x' },
  { cell: { x: 5, y: 9 }, kind: 'straight-x' },
  { cell: { x: 6, y: 8 }, kind: 'straight-x' },
  { cell: { x: 7, y: 7 }, kind: 'straight-x' },
  { cell: { x: 8, y: 6 }, kind: 'straight-x' },
  { cell: { x: 9, y: 5 }, kind: 'straight-x' },
  { cell: { x: 10, y: 4 }, kind: 'straight-x' },
  { cell: { x: 11, y: 3 }, kind: 'straight-x' },
  { cell: { x: 12, y: 2 }, kind: 'straight-x' },
  { cell: { x: 13, y: 1 }, kind: 'straight-x' }
];
/** The river's source: a spring pond at the north end of the chain (a river may
 * begin at a spring — it must never end mid-field). */
export const RIVER_SPRING: ScenicWorldPoint = cellCorner({ x: -7, y: -2 }, 'T');

/** The bridge sits on a straight river cell where a street crosses the water:
 * the west trail on the west straight, the south street on the southern run. */
export interface BridgeAnchor { world: ScenicWorldPoint; width: number; height: number; anchor: [number, number] }
export const BRIDGES: BridgeAnchor[] = [
  { world: logicalToWorld({ x: -4, y: 1 }), width: 260, height: 200, anchor: [0.5, 0.75] },
  { world: logicalToWorld({ x: 7, y: 7 }), width: 260, height: 200, anchor: [0.5, 0.75] }
];

/** Dirt streets hug the shared diamond edges between plot rows/columns (zigzag
 * vertices alternate between adjacent rows of plot corners), plus connectors to
 * the homestead gate, the two bridges and the east signpost. */
export interface ScenicPath { points: ScenicWorldPoint[]; width: number }
export const PATHS: ScenicPath[] = [
  { width: 22, points: [{ x: -650, y: -65 }, { x: -590, y: -5 }, { x: -520, y: 65 }] },
  { width: 24, points: [{ x: -520, y: 65 }, { x: -390, y: 0 }, { x: -260, y: 65 }, { x: -130, y: 0 }, { x: 0, y: 65 }, { x: 130, y: 0 }, { x: 260, y: 65 }, { x: 390, y: 0 }, { x: 520, y: 65 }, { x: 650, y: 0 }] },
  { width: 24, points: [{ x: -520, y: 195 }, { x: -390, y: 130 }, { x: -260, y: 195 }, { x: -130, y: 130 }, { x: 0, y: 195 }, { x: 130, y: 130 }, { x: 260, y: 195 }, { x: 390, y: 130 }, { x: 520, y: 195 }, { x: 650, y: 130 }] },
  { width: 22, points: [{ x: 0, y: -130 }, { x: -130, y: -65 }, { x: 0, y: 0 }, { x: -130, y: 65 }, { x: 0, y: 130 }, { x: -130, y: 195 }, { x: 0, y: 260 }] },
  { width: 22, points: [{ x: 130, y: -260 }, { x: 0, y: -195 }, { x: 130, y: -130 }, { x: 0, y: -65 }, { x: 130, y: 0 }, { x: 0, y: 65 }, { x: 130, y: 130 }, { x: 0, y: 195 }, { x: 130, y: 260 }] },
  { width: 20, points: [{ x: -300, y: -214 }, { x: -345, y: -105 }, { x: -390, y: 0 }] },
  { width: 20, points: [{ x: -300, y: -214 }, { x: -460, y: -320 }, { x: -650, y: -440 }] },
  { width: 18, points: [{ x: 390, y: 0 }, { x: 350, y: -65 }, { x: 310, y: -130 }] },
  // P4 east continuation: the two courtyard streets run on across the district
  // border toward the east pan edge (street network continues, plan §5.3).
  { width: 24, points: [{ x: 650, y: 0 }, { x: 780, y: 65 }, { x: 910, y: 0 }, { x: 1040, y: 65 }, { x: 1170, y: 0 }, { x: 1300, y: 65 }] },
  { width: 24, points: [{ x: 650, y: 130 }, { x: 780, y: 195 }, { x: 910, y: 130 }, { x: 1040, y: 195 }, { x: 1170, y: 130 }] },
  // P4 south street: from the courtyard verticals across the south district
  // border, over the south bridge (river cell 7,7 at world (0,650)) and on to
  // the south pan edge.
  { width: 22, points: [{ x: 0, y: 260 }, { x: -130, y: 325 }, { x: 0, y: 390 }, { x: -130, y: 455 }, { x: 0, y: 520 }, { x: -130, y: 585 }, { x: 0, y: 650 }, { x: -130, y: 715 }, { x: 0, y: 780 }, { x: -130, y: 845 }] }
];

export interface SignpostAnchor { name: string; world: ScenicWorldPoint }
export const SIGNPOSTS: SignpostAnchor[] = [
  { name: '东侧田区', world: { x: 310, y: -130 } },
  { name: '南侧田区', world: { x: -335, y: 345 } },
  { name: '南桥', world: { x: 190, y: 540 } }
];
export const FENCES: ScenicWorldPoint[] = [{ x: -350, y: -230 }, { x: -240, y: -222 }, { x: -280, y: 690 }, { x: 280, y: 700 }];
/** Foreground trees: placed so the canopy never covers a plot diamond (checked
 * against the initial 5×4 grid); depth sorting uses the ground contact y.
 * P4 adds an east riverside tree and a south tree on free cells only. */
export const TREES: ScenicWorldPoint[] = [{ x: -520, y: -390 }, { x: 760, y: 250 }, { x: 1170, y: 40 }, { x: -240, y: 560 }];
/** Flower overlays on non-plot ground cells only. */
export const FLOWER_CELLS: LogicalPoint[] = [{ x: -4, y: 4 }, { x: -4, y: 5 }, { x: -4, y: 2 }, { x: -4, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 5 }, { x: 5, y: 7 }, { x: -5, y: 2 }];

/** Navigation anchors only; plots keep global logical coordinates. */
export interface ScenicDistrict { id: string; name: string; district: DistrictId }
export const SCENIC_DISTRICTS: ScenicDistrict[] = [
  { id: 'qian', name: '院前', district: { x: 0, y: 0 } },
  { id: 'dong', name: '东侧', district: { x: 1, y: 0 } },
  { id: 'nan', name: '南侧', district: { x: 0, y: 1 } }
];
export function districtCenter(d: DistrictId): ScenicWorldPoint {
  return logicalToWorld({ x: d.x * 3 + 2, y: d.y * 3 + 2 });
}

/** Pinch zoom about the pinch centroid (P4): returns the camera that keeps the
 * map-space point `mapPoint` (map node space: x = world x, y = −world y) fixed
 * at the same viewport-space point `viewportPoint` (y-up offsets from the
 * viewport center) after changing zoom to `zoom`. With viewportPoint (0,0)
 * this reduces to the old viewport-center zoom. Pure math, clamped by caller. */
export function zoomCameraAboutPoint(camera: WorldCamera, mapPoint: ScenicWorldPoint, viewportPoint: ScenicWorldPoint, zoom: number): WorldCamera {
  return { x: mapPoint.x - viewportPoint.x / zoom, y: viewportPoint.y / zoom - mapPoint.y, zoom };
}
