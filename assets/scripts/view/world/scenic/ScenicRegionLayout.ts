import { plotIdAt } from '../../FarmDistrict';
import { LogicalPoint, ScenicWorldPoint, cellDiamond, cellEdgeMidpoint, logicalToWorld, plotQuad } from './ScenicProjection';
import * as layout from './ScenicLayout';

/** Scenic region model (plan §3.2): the map is a set of typed regions with
 * consistent-winding boundaries, not a tiled plane of identical diamonds.
 * Region types carry distinct interaction semantics — plots bind logical
 * plotIds and stay selectable per the observation rules; paths, the
 * decorative river, environment and bridges are display-only (they never
 * block map dragging). Pure data, no engine imports. */

export type ScenicRegionType = 'plot' | 'path' | 'river' | 'environment' | 'bridge';
export type ScenicDrawLayer = 'ground' | 'river' | 'plot' | 'path' | 'env' | 'overlay';
export interface ScenicRegionConnection { to?: string; port?: ScenicWorldPoint }
export interface ScenicRegion {
  regionId: string;
  type: ScenicRegionType;
  /** Boundary points in one consistent winding order (top → right → bottom → left rings). */
  boundary: ScenicWorldPoint[];
  plotId?: string;
  /** Ground material key: soil / water / earth / wood / homestead / spring. */
  ground: string;
  connections: ScenicRegionConnection[];
  layer: ScenicDrawLayer;
}

/** Every logical plot gets its display region by formula — works for ANY
 * coordinates (negative and far expansion included), so the map never runs
 * out of space. Cells reserved by the homestead or the river still map to a
 * region here; the handcrafted environment takes rendering precedence there. */
export function plotRegion(x: number, y: number): ScenicRegion {
  const center = logicalToWorld({ x, y });
  return {
    regionId: `plot.${x}.${y}`,
    type: 'plot',
    boundary: plotQuad(center),
    plotId: plotIdAt(x, y),
    ground: 'soil',
    connections: [{ to: plotIdAt(x - 1, y) }, { to: plotIdAt(x + 1, y) }, { to: plotIdAt(x, y - 1) }, { to: plotIdAt(x, y + 1) }],
    layer: 'plot'
  };
}

/** Stroked boundary of a width-owning polyline (square caps, mitered joints
 * clamped to 2× the half width): left edge forward, right edge back. */
export function strokeBoundary(points: ScenicWorldPoint[], width: number): ScenicWorldPoint[] {
  const half = width / 2, n = points.length;
  const dir = (i: number) => {
    const a = points[i], b = points[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  };
  const normalOf = (d: ScenicWorldPoint) => ({ x: d.y, y: -d.x });
  const left: ScenicWorldPoint[] = [], right: ScenicWorldPoint[] = [];
  for (let i = 0; i < n; i++) {
    let normal: ScenicWorldPoint, scale = 1;
    if (i === 0) normal = normalOf(dir(0));
    else if (i === n - 1) normal = normalOf(dir(n - 2));
    else {
      const n1 = normalOf(dir(i - 1)), n2 = normalOf(dir(i));
      const len = Math.hypot(n1.x + n2.x, n1.y + n2.y);
      if (len < 1e-6) { normal = n1; scale = 2; }
      else {
        normal = { x: (n1.x + n2.x) / len, y: (n1.y + n2.y) / len };
        // Miter: stretch the offset to the joint line, clamped so sharp bends stay near the joint.
        scale = Math.min(2, Math.SQRT2 / Math.max(.5, Math.sqrt(1 + (dir(i - 1).x * dir(i).x + dir(i - 1).y * dir(i).y))));
      }
    }
    left.push({ x: points[i].x + normal.x * half * scale, y: points[i].y + normal.y * half * scale });
    right.push({ x: points[i].x - normal.x * half * scale, y: points[i].y - normal.y * half * scale });
  }
  // Square caps extend the first/last points by half the width along the line direction.
  const d0 = dir(0), dn = dir(n - 2);
  left[0] = { x: left[0].x - d0.x * half, y: left[0].y - d0.y * half };
  right[0] = { x: right[0].x - d0.x * half, y: right[0].y - d0.y * half };
  left[n - 1] = { x: left[n - 1].x + dn.x * half, y: left[n - 1].y + dn.y * half };
  right[n - 1] = { x: right[n - 1].x + dn.x * half, y: right[n - 1].y + dn.y * half };
  return [...left, ...right.reverse()];
}

function riverRegionId(cell: LogicalPoint): string { return `river.${cell.x}.${cell.y}`; }

/** One region per river cell; consecutive segments declare their shared-edge
 * midpoint port as the connection (the water never meets at diamond corners). */
export function riverRegions(): ScenicRegion[] {
  return layout.RIVER_SEGMENTS.map((seg, i) => {
    const center = logicalToWorld(seg.cell);
    const connections: ScenicRegionConnection[] = [];
    const ports = layout.riverPorts(seg);
    if (i > 0) connections.push({ to: riverRegionId(layout.RIVER_SEGMENTS[i - 1].cell), port: ports[0] });
    if (i + 1 < layout.RIVER_SEGMENTS.length) connections.push({ to: riverRegionId(layout.RIVER_SEGMENTS[i + 1].cell), port: ports[1] });
    return { regionId: riverRegionId(seg.cell), type: 'river', boundary: cellDiamond(center), ground: 'water', connections, layer: 'river' };
  });
}

/** Width-owning street regions in the belts between plot quads. */
export function pathRegions(): ScenicRegion[] {
  return layout.PATHS.map((path, i) => ({
    regionId: `path.${i}`,
    type: 'path',
    boundary: strokeBoundary(path.points, path.width),
    ground: 'earth',
    connections: [],
    layer: 'path'
  }));
}

/** Bridge regions: the explicit path-over-river exception, anchored on
 * straight-x water cells and connected to the river region they cross. */
export function bridgeRegions(): ScenicRegion[] {
  return layout.BRIDGES.map((b, i) => {
    const w = b.width / 2, t = b.world.y - b.anchor[1] * b.height, bottom = b.world.y + (1 - b.anchor[1]) * b.height;
    return {
      regionId: `bridge.${i}`,
      type: 'bridge',
      boundary: [{ x: b.world.x - w, y: t }, { x: b.world.x + w, y: t }, { x: b.world.x + w, y: bottom }, { x: b.world.x - w, y: bottom }],
      ground: 'wood',
      connections: [{ to: riverRegionId(b.cell) }],
      layer: 'env'
    };
  });
}

/** Courtyard homestead + the river's spring pond as environment regions. */
export function environmentRegions(): ScenicRegion[] {
  const h = layout.HOMESTEAD, f = layout.homesteadFootprint();
  const s = layout.RIVER_SPRING;
  const spring: ScenicWorldPoint[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8;
    spring.push({ x: s.x + Math.cos(a) * 110, y: s.y + Math.sin(a) * 65 });
  }
  return [
    {
      regionId: 'env.homestead',
      type: 'environment',
      boundary: [{ x: f.left, y: f.top }, { x: f.right, y: f.top }, { x: f.right, y: f.bottom }, { x: f.left, y: f.bottom }],
      ground: 'homestead',
      connections: [],
      layer: 'env'
    },
    { regionId: 'env.spring', type: 'environment', boundary: spring, ground: 'water', connections: [{ to: riverRegionId({ x: -3, y: 2 }), port: s }], layer: 'env' }
  ];
}

/** The handcrafted courtyard/east/south region set (plan §3.2 layout data). */
export function courtyardRegions(): ScenicRegion[] {
  return [...riverRegions(), ...pathRegions(), ...bridgeRegions(), ...environmentRegions()];
}

/** Cells whose plot rendering is replaced by handcrafted environment. */
export function isEnvironmentReservedCell(x: number, y: number): boolean {
  return layout.isHomesteadReservedCell(x, y) || layout.isRiverCell(x, y);
}
