// Shared runtime geometry comes from the engine-independent scene core.
import type {LogicalPoint,ScenicWorldPoint,CellEdgeId} from './ScenicProjection';
export interface DistrictId {x:number;y:number}
export interface WorldCamera {x:number;y:number;zoom:number}
export interface HomesteadAnchor { world: ScenicWorldPoint; width: number; height: number; anchor: [number, number] }
export interface RiverSegment { cell: LogicalPoint; kind: 'straight-x' | 'straight-y' | 'corner'; rotation?: 0 | 180 }
export type RiverKind = RiverSegment['kind'];
export type RiverPort = CellEdgeId;
export interface BridgeAnchor { world: ScenicWorldPoint; width: number; height: number; anchor: [number, number]; cell: LogicalPoint }
export interface ScenicPath { points: ScenicWorldPoint[]; width: number }
export interface SignpostAnchor { name: string; world: ScenicWorldPoint }
export interface ScenicDistrict { id: string; name: string; district: DistrictId }
export { CAMERA_LIFT, DEFAULT_CAMERA, CAMERA_LIMITS, clampScenicCamera, homesteadFootprint, HOMESTEAD_RESERVED, isHomesteadReservedCell, RIVER_KIND_PORTS, riverPorts, RIVER_CELLS, isRiverCell, RIVER_SPRING, PATHS, SIGNPOSTS, FENCES, TREES, FLOWER_CELLS, SCENIC_DISTRICTS, districtCenter, zoomCameraAboutPoint } from '../../../FarmCore';

import {RIVER_SEGMENTS as CORE_RIVER_SEGMENTS} from '../../../FarmCore';
export const RIVER_SEGMENTS=CORE_RIVER_SEGMENTS as RiverSegment[];

import {BRIDGES as CORE_BRIDGES} from '../../../FarmCore';
export const BRIDGES=CORE_BRIDGES as BridgeAnchor[];

import {HOMESTEAD as CORE_HOMESTEAD} from '../../../FarmCore';
export const HOMESTEAD=CORE_HOMESTEAD as HomesteadAnchor;
