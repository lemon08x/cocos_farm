// Shared runtime geometry comes from the engine-independent scene core.
export interface LogicalPoint { x: number; y: number }
export interface ScenicWorldPoint { x: number; y: number }
export interface ScenicCamera { x: number; y: number; zoom: number }
export type CellEdgeId = 'ul' | 'ur' | 'll' | 'lr';
export { SCENIC_STEP_X, SCENIC_STEP_Y, SCENIC_ORIGIN_SUM, CELL_HALF_WIDTH, CELL_HALF_HEIGHT, QUAD_HALF_WIDTH, QUAD_HALF_HEIGHT, logicalToWorld, worldToLogical, plotQuad, pointInQuad, cellDiamond, pointInCellDiamond, CELL_EDGE_NEIGHBOR, cellEdgeMidpoint, worldToScreen, screenToWorld, segmentsCross, pointInPolygon } from '../../../FarmCore';
