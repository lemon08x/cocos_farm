import type { DistrictId, WorldCamera } from '../FarmWorldViewContract';
import { LogicalPoint, ScenicWorldPoint, logicalToWorld } from './ScenicProjection';

/** Courtyard (院前) scene layout: anchors, outlines and layer order live here,
 * separate from the scenic image manifest (which owns files, sizes, anchors).
 * All positions are world-plane pixels at zoom 1 (y-down). Pure data, no engine imports. */

/** Camera targets sit this far below the content center so fields clear the bottom HUD. */
export const CAMERA_LIFT = 40;
/** First screen (720×1280): homestead upper-left, six home plots recognizable. */
export const DEFAULT_CAMERA: WorldCamera = { x: -100, y: 40, zoom: 1.6 };
export const CAMERA_LIMITS = { minX: -520, maxX: 520, minY: -360, maxY: 420, minZoom: .9, maxZoom: 2.4 };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export function clampScenicCamera(camera: WorldCamera): WorldCamera {
  return {
    x: clamp(camera.x, CAMERA_LIMITS.minX, CAMERA_LIMITS.maxX),
    y: clamp(camera.y, CAMERA_LIMITS.minY, CAMERA_LIMITS.maxY),
    zoom: clamp(camera.zoom, CAMERA_LIMITS.minZoom, CAMERA_LIMITS.maxZoom)
  };
}

/** Independent environment node north-west of p2q2; never replaces a plot's soil/crop/selection. */
export interface HomesteadAnchor { world: ScenicWorldPoint; width: number; height: number; anchor: [number, number] }
export const HOMESTEAD: HomesteadAnchor = { world: { x: -280, y: -270 }, width: 460, height: 380, anchor: [0.5, 0.8] };
export function homesteadFootprint() {
  const h = HOMESTEAD;
  return {
    left: h.world.x - h.width / 2, right: h.world.x + h.width / 2,
    top: h.world.y - h.anchor[1] * h.height, bottom: h.world.y + (1 - h.anchor[1]) * h.height
  };
}

/** River chain along the west edge: straight-x feeds a corner, then straight-y runs south.
 * Connections follow art/scenic/SPEC.md §6 (edge midpoints: left in, right/bottom out). */
export interface RiverSegment { cell: LogicalPoint; kind: 'straight-x' | 'straight-y' | 'corner' }
export const RIVER_SEGMENTS: RiverSegment[] = [
  { cell: { x: -4, y: 1 }, kind: 'straight-x' },
  { cell: { x: -3, y: 0 }, kind: 'corner' },
  { cell: { x: -2, y: 1 }, kind: 'straight-y' },
  { cell: { x: -1, y: 2 }, kind: 'straight-y' },
  { cell: { x: 0, y: 3 }, kind: 'straight-y' },
  { cell: { x: 1, y: 4 }, kind: 'straight-y' },
  { cell: { x: 2, y: 5 }, kind: 'straight-y' }
];

export interface BridgeAnchor { world: ScenicWorldPoint; width: number; height: number; anchor: [number, number] }
export const BRIDGES: BridgeAnchor[] = [
  { world: logicalToWorld({ x: -1, y: 2 }), width: 260, height: 200, anchor: [0.5, 0.75] },
  { world: logicalToWorld({ x: 1, y: 4 }), width: 260, height: 200, anchor: [0.5, 0.75] }
];

export interface ScenicPath { points: ScenicWorldPoint[]; width: number }
export const PATHS: ScenicPath[] = [
  { width: 26, points: [{ x: -280, y: -190 }, { x: -190, y: -125 }, { x: -70, y: -45 }, { x: 0, y: 0 }] },
  { width: 22, points: [{ x: 0, y: 0 }, { x: 130, y: 0 }, { x: 260, y: 0 }, { x: 340, y: 10 }] },
  { width: 22, points: [{ x: 0, y: 0 }, { x: -130, y: 65 }, { x: -260, y: 130 }, { x: -390, y: 195 }] }
];

export interface SignpostAnchor { name: string; world: ScenicWorldPoint }
export const SIGNPOSTS: SignpostAnchor[] = [
  { name: '东侧田区', world: { x: 300, y: -120 } },
  { name: '南侧田区', world: { x: -520, y: 120 } }
];
export const FENCES: ScenicWorldPoint[] = [{ x: -170, y: -200 }, { x: -60, y: -230 }];
export const TREES: ScenicWorldPoint[] = [{ x: -520, y: -40 }, { x: 300, y: 320 }];
export const FLOWER_CELLS: LogicalPoint[] = [{ x: 0, y: 2 }, { x: 2, y: 0 }];

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
