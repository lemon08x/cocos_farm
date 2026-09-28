export interface DistrictId {x:number;y:number}
export interface WorldCamera {x:number;y:number;zoom:number}
import { CellEdgeId, LogicalPoint, ScenicWorldPoint, cellEdgeMidpoint, logicalToWorld, plotQuad, pointInPolygon, pointInQuad, segmentsCross } from './geometry.js';

/** Courtyard (院前) scene layout revision 2: anchors, street belts, the river
 * chain and camera live here, separate from the scenic image manifest (which
 * owns files, sizes, anchors). All positions are world-plane pixels at zoom 1
 * (y-down). Pure data, no engine imports.
 *
 * Revision 2 (plan §4/§5): plots no longer tile the plane — every plot quad
 * (228×142) sits inside its 300×180 ground cell and the belts between quads
 * carry streets, ridges and vegetation. The river is a dedicated chain of
 * whole cells outside the observed farm, connected through shared-edge
 * midpoints; bridges sit only on straight-x water cells. The homestead is an
 * environment region north-west of the home block on declared reserved cells. */

/** Camera targets sit this far below the content center so fields clear the bottom HUD. */
export const CAMERA_LIFT = 40;
/** First screen (720×1280): homestead upper-left (top slightly off-frame), the
 * central home plots fully readable, west spring/south river run, one bridge,
 * streets and vegetation all in frame (plan §5). */
export const DEFAULT_CAMERA: WorldCamera = { x: -560, y: 60, zoom: .65 };
/** Limits reach the east/south district centers, the whole river run from the
 * courtyard spring to the southern exit, and the street ends. */
export const CAMERA_LIMITS = { minX: -2500, maxX: 2500, minY: -1700, maxY: 2500, minZoom: .35, maxZoom: 2.4 };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export function clampScenicCamera(camera: WorldCamera, bounds?: {minX:number;maxX:number;minY:number;maxY:number}): WorldCamera {
  const limits = bounds ?? CAMERA_LIMITS;
  return {
    x: clamp(camera.x, limits.minX, limits.maxX),
    y: clamp(camera.y, limits.minY, limits.maxY),
    zoom: clamp(camera.zoom, CAMERA_LIMITS.minZoom, CAMERA_LIMITS.maxZoom)
  };
}

/** Art anchor and sprite extent. Game occupancy is the separate ground boundary in world.ts. */
export interface HomesteadAnchor { world: ScenicWorldPoint; width: number; height: number; anchor: [number, number] }
export const HOMESTEAD: HomesteadAnchor = { world: { x: -300, y: -440 }, width: 460, height: 380, anchor: [0.5, 0.8] };
export function homesteadFootprint() {
  const h = HOMESTEAD;
  return {
    left: h.world.x - h.width / 2, right: h.world.x + h.width / 2,
    top: h.world.y - h.anchor[1] * h.height, bottom: h.world.y + (1 - h.anchor[1]) * h.height
  };
}
function footprintPolygon(): ScenicWorldPoint[] {
  const f = homesteadFootprint();
  return [{ x: f.left, y: f.top }, { x: f.right, y: f.top }, { x: f.right, y: f.bottom }, { x: f.left, y: f.bottom }];
}
function quadIntersectsFootprint(center: ScenicWorldPoint): boolean {
  const quad = plotQuad(center), rect = footprintPolygon(), f = homesteadFootprint();
  if (quad.some(p => pointInPolygon(p, rect))) return true;
  if (rect.some(p => pointInQuad(p, center))) return true;
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      if (segmentsCross(quad[i], quad[(i + 1) % 4], rect[j], rect[(j + 1) % 4])) return true;
  return f.left <= center.x && center.x <= f.right && f.top <= center.y && center.y <= f.bottom;
}
const homesteadReserved = new Set<string>();
for (let x = -12; x <= 12; x++) for (let y = -12; y <= 12; y++)
  if (quadIntersectsFootprint(logicalToWorld({ x, y }))) homesteadReserved.add(x + ',' + y);
/** Art-footprint cells for decoration culling only. Gameplay uses isValidPlotCell. */
export const HOMESTEAD_RESERVED: ReadonlySet<string> = homesteadReserved;
export function isHomesteadReservedCell(x: number, y: number): boolean { return homesteadReserved.has(x + ',' + y); }

/** The permanent water-source river: a dedicated chain of whole cells excluded from generated
 * game plots, connected through shared-edge midpoints.
 * straight-x carries water along logical x (ports ul↔lr), straight-y along
 * logical y (ports ur↔ll); the base corner bends ul↔ll and rotation 180 turns
 * it into ur↔lr — the staircase chain only ever needs these two bends, so no
 * mirrored corner art is required (light direction stays consistent). */
export interface RiverSegment { cell: LogicalPoint; kind: 'straight-x' | 'straight-y' | 'corner'; rotation?: 0 | 180 }
export type RiverKind = RiverSegment['kind'];
export type RiverPort = CellEdgeId;
export const RIVER_KIND_PORTS: Record<RiverKind, [RiverPort, RiverPort]> = {
  'straight-x': ['ul', 'lr'], 'straight-y': ['ur', 'll'], 'corner': ['ul', 'll']
};
const CORNER_ROTATED_PORTS: [RiverPort, RiverPort] = ['ur', 'lr'];
export function riverPorts(seg: RiverSegment): [ScenicWorldPoint, ScenicWorldPoint] {
  const [a, b] = seg.kind === 'corner' && seg.rotation === 180 ? CORNER_ROTATED_PORTS : RIVER_KIND_PORTS[seg.kind];
  return [cellEdgeMidpoint(seg.cell, a), cellEdgeMidpoint(seg.cell, b)];
}

/** One continuous waterway (single connected component, verified by test-ui):
 * a spring pond west of the courtyard feeds the west column flowing south,
 * bends east along the south edge of the farm (both bridges live here), then
 * turns south again and exits the pannable bounds. Every cell stays outside
 * the initial observed plot set (x −2..6, y −2..6). */
export const RIVER_SEGMENTS: RiverSegment[] = [
  { cell: { x: -3, y: 2 }, kind: 'straight-y' },
  { cell: { x: -3, y: 3 }, kind: 'straight-y' },
  { cell: { x: -3, y: 4 }, kind: 'straight-y' },
  { cell: { x: -3, y: 5 }, kind: 'straight-y' },
  { cell: { x: -3, y: 6 }, kind: 'straight-y' },
  { cell: { x: -3, y: 7 }, kind: 'corner', rotation: 180 },
  { cell: { x: -2, y: 7 }, kind: 'straight-x' },
  { cell: { x: -1, y: 7 }, kind: 'straight-x' },
  { cell: { x: 0, y: 7 }, kind: 'straight-x' },
  { cell: { x: 1, y: 7 }, kind: 'straight-x' },
  { cell: { x: 2, y: 7 }, kind: 'straight-x' },
  { cell: { x: 3, y: 7 }, kind: 'straight-x' },
  { cell: { x: 4, y: 7 }, kind: 'straight-x' },
  { cell: { x: 5, y: 7 }, kind: 'straight-x' },
  { cell: { x: 6, y: 7 }, kind: 'straight-x' },
  { cell: { x: 7, y: 7 }, kind: 'straight-x' },
  { cell: { x: 8, y: 7 }, kind: 'corner' },
  { cell: { x: 8, y: 8 }, kind: 'straight-y' },
  { cell: { x: 8, y: 9 }, kind: 'straight-y' },
  { cell: { x: 8, y: 10 }, kind: 'straight-y' },
  { cell: { x: 8, y: 11 }, kind: 'straight-y' },
  { cell: { x: 8, y: 12 }, kind: 'straight-y' },
  { cell: { x: 8, y: 13 }, kind: 'straight-y' },
  { cell: { x: 8, y: 14 }, kind: 'straight-y' },
  { cell: { x: 8, y: 15 }, kind: 'straight-y' },
  { cell: { x: 8, y: 16 }, kind: 'straight-y' },
  { cell: { x: 8, y: 17 }, kind: 'straight-y' },
  { cell: { x: 8, y: 18 }, kind: 'straight-y' },
  { cell: { x: 8, y: 19 }, kind: 'straight-y' }
];
const riverCells = new Set(RIVER_SEGMENTS.map(s => s.cell.x + ',' + s.cell.y));
export const RIVER_CELLS: ReadonlySet<string> = riverCells;
export function isRiverCell(x: number, y: number): boolean { return riverCells.has(x + ',' + y); }
/** The river's source: a spring pond at the north port of the first cell (a
 * river may begin at a spring — it must never end mid-field). */
export const RIVER_SPRING: ScenicWorldPoint = cellEdgeMidpoint({ x: -3, y: 2 }, 'ur');

/** Bridges cross the water only on straight-x river cells, where a street
 * passes through the cell center: the courtyard street at the south run and
 * the east street further along it. */
export interface BridgeAnchor { world: ScenicWorldPoint; width: number; height: number; anchor: [number, number]; cell: LogicalPoint }
export const BRIDGES: BridgeAnchor[] = [
  { world: logicalToWorld({ x: 4, y: 7 }), width: 260, height: 200, anchor: [0.5, 0.75], cell: { x: 4, y: 7 } },
  { world: logicalToWorld({ x: 7, y: 7 }), width: 260, height: 200, anchor: [0.5, 0.75], cell: { x: 7, y: 7 } }
];

/** Packed-earth streets own their width and live entirely in the environment
 * belts between plot quads (validated by ScenicLayoutValidation): main streets
 * follow the half-integer logical lines between cell rows/columns, cross at
 * belt junctions, and reach the river only along shared bank edges or across
 * the two bridge cells (the explicit bridge exception, plan §4.2). */
export interface ScenicPath { points: ScenicWorldPoint[]; width: number }
export const PATHS: ScenicPath[] = [
  // Main north street: courtyard gate → east pan edge (logical y = 0.5 belt).
  { width: 26, points: [{ x: -450, y: -540 }, { x: 0, y: -270 }, { x: 450, y: 0 }, { x: 900, y: 270 }, { x: 1200, y: 450 }] },
  // Homestead connector into the courtyard (reserved cells, no quads there).
  { width: 20, points: [{ x: -300, y: -450 }, { x: -360, y: -420 }] },
  // West street (logical x = 0.5 belt) down to the towpath.
  { width: 24, points: [{ x: 0, y: -270 }, { x: -300, y: -90 }, { x: -600, y: 90 }, { x: -900, y: 270 }] },
  // East street (logical x = 3.5 belt) to the south bridge, then the south bank.
  { width: 24, points: [{ x: 450, y: 0 }, { x: 150, y: 180 }, { x: -150, y: 360 }, { x: -450, y: 540 }, { x: -450, y: 720 }, { x: -600, y: 810 }, { x: -750, y: 900 }] },
  // River towpath along the north bank (logical y = 6.5 belt, shared bank edge).
  { width: 22, points: [{ x: -1200, y: 90 }, { x: -900, y: 270 }, { x: -450, y: 540 }, { x: 0, y: 810 }, { x: 300, y: 990 }] },
  // East connector street to the second bridge and the south bank.
  { width: 24, points: [{ x: 900, y: 270 }, { x: 0, y: 810 }, { x: 0, y: 990 }, { x: -150, y: 1080 }, { x: -300, y: 1170 }] },
  // Mid belts between the home plot rows.
  { width: 22, points: [{ x: -300, y: -90 }, { x: 150, y: 180 }] },
  { width: 22, points: [{ x: -600, y: 90 }, { x: -150, y: 360 }] }
];

export interface SignpostAnchor { name: string; world: ScenicWorldPoint }
export const SIGNPOSTS: SignpostAnchor[] = [
  { name: '东侧田区', world: { x: 1050, y: 420 } },
  { name: '南侧田区', world: { x: -560, y: 745 } },
  { name: '河畔', world: { x: -1100, y: 80 } }
];
export const FENCES: ScenicWorldPoint[] = [{ x: -420, y: -560 }, { x: -240, y: -380 }, { x: -620, y: 400 }, { x: -380, y: 790 }];
/** Foreground trees on free unobserved cells (they merge with the unknown
 * ground and never cover an observed plot quad); depth sorting uses the
 * ground contact y. */
export const TREES: ScenicWorldPoint[] = [{ x: -700, y: -620 }, { x: -100, y: -600 }, { x: 1020, y: -420 }, { x: -1050, y: 580 }, { x: 390, y: 720 }];
/** Flower overlays on free cells outside the observed farm. */
export const FLOWER_CELLS: LogicalPoint[] = [{ x: -4, y: 3 }, { x: -4, y: 4 }, { x: -1, y: 8 }, { x: 1, y: 8 }, { x: 8, y: 3 }, { x: 5, y: -3 }];

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
