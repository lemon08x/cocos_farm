import type { DistrictId, WorldCamera } from '../FarmWorldViewContract';
import { LogicalPoint, ScenicWorldPoint, logicalToWorld } from './ScenicProjection';

/** Courtyard (院前) scene layout: anchors, outlines and layer order live here,
 * separate from the scenic image manifest (which owns files, sizes, anchors).
 * All positions are world-plane pixels at zoom 1 (y-down). Pure data, no engine imports. */

/** Camera targets sit this far below the content center so fields clear the bottom HUD. */
export const CAMERA_LIFT = 40;
/** First screen (720×1280): homestead fully visible upper-left, six home plots recognizable. */
export const DEFAULT_CAMERA: WorldCamera = { x: -220, y: -135, zoom: 1.05 };
export const CAMERA_LIMITS = { minX: -760, maxX: 560, minY: -420, maxY: 460, minZoom: .8, maxZoom: 2.4 };

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
export const RIVER_SEGMENTS: RiverSegment[] = [
  { cell: { x: -5, y: 0 }, kind: 'straight-y' },
  { cell: { x: -4, y: 1 }, kind: 'straight-y' },
  { cell: { x: -3, y: 2 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 3 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 4 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 5 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 6 }, kind: 'corner-fy' },
  { cell: { x: -3, y: 7 }, kind: 'corner-fy' }
];

/** The bridge sits on a straight river cell where the west trail crosses the water. */
export interface BridgeAnchor { world: ScenicWorldPoint; width: number; height: number; anchor: [number, number] }
export const BRIDGES: BridgeAnchor[] = [
  { world: logicalToWorld({ x: -4, y: 1 }), width: 260, height: 200, anchor: [0.5, 0.75] }
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
  { width: 18, points: [{ x: 390, y: 0 }, { x: 350, y: -65 }, { x: 310, y: -130 }] }
];

export interface SignpostAnchor { name: string; world: ScenicWorldPoint }
export const SIGNPOSTS: SignpostAnchor[] = [
  { name: '东侧田区', world: { x: 310, y: -130 } },
  { name: '南侧田区', world: { x: -335, y: 345 } }
];
export const FENCES: ScenicWorldPoint[] = [{ x: -350, y: -230 }, { x: -240, y: -222 }];
/** Foreground trees: placed so the canopy never covers a plot diamond (checked
 * against the initial 5×4 grid); depth sorting uses the ground contact y. */
export const TREES: ScenicWorldPoint[] = [{ x: -330, y: -140 }, { x: 760, y: 250 }];
/** Flower overlays on non-plot ground cells only. */
export const FLOWER_CELLS: LogicalPoint[] = [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: -4, y: 2 }, { x: -4, y: 3 }];

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
