import { EventTouch, Graphics, Label, Node } from 'cc';
import { ArtRenderer, tint, visualNode } from '../../art/ArtRenderer';
import { UiKit } from '../UiKit';
import type { DistrictId, PlotRenderModel, SceneSnapshot, WorldCamera } from '../world/FarmWorldViewContract';
import { buildMinimapModel, minimapSignature } from '../world/scenic/ScenicMinimap';
import { worldToLogical } from '../world/scenic/ScenicProjection';
import { CAMERA_LIFT } from '../world/scenic/ScenicLayout';
import { districtOf } from '../FarmDistrict';

/** Scenic district navigator (plan §7): a compact collapsible panel on the right edge.
 * 院前/东侧/南侧 buttons only move the camera — they never explore, select or run
 * actions — and show a recognizable selected state for the district under the camera.
 * The minimap is built from real observation data (known vs mist vs field/water/
 * homestead), clips the viewport rect to the map bounds (裁切视窗框) and marks home
 * (gold) and the selected plot (ink ring) distinctly. Collapsed by default on small
 * screens so it never eats the main plot tap area; while expanded it intercepts map
 * gestures so drags starting on the panel no longer pan the map. */
const TONES: Record<string, string> = {
  mist: '#b9bfae', field: '#9a7648', water: '#5b8fa8', green: '#5f8a4e', home: '#d9a441',facility:'#8a6a44',path:'#c2a26e',bridge:'#80633e'
};
const MINIMAP_SIZE = 168;
const DISTRICTS: [string, DistrictId][] = [['院前', { x: 0, y: 0 }], ['东侧', { x: 1, y: 0 }], ['南侧', { x: 0, y: 1 }]];
type MinimapPlots = PlotRenderModel[];

export class DistrictNavigator {
  private minimap: Node;
  private lastSignature = '';
  private expandedPanel: Node;
  private collapsedHandle: Node;
  private districtButtons: { key: string; bg: Graphics; label: Label }[] = [];
  private activeKey = '';
  private lastPlots: MinimapPlots | null = null;
  private lastCamera: WorldCamera | undefined;
  private lastHeight = 1280;
  private selected = '';
  private scene:SceneSnapshot|undefined;
  constructor(parent: Node, private art: ArtRenderer, ui: UiKit, height: number, top: number, onNavigate: (district: DistrictId) => void) {
    const C = art.palette;
    const swallow = (n: Node) => {
      for (const type of [Node.EventType.TOUCH_START, Node.EventType.TOUCH_MOVE, Node.EventType.TOUCH_END, Node.EventType.TOUCH_CANCEL])
        n.on(type, (e: any) => { e.propagationStopped = true; });
    };
    // Right edge, below the resource pills, clear of the bottom field card: the panel
    // never covers the main plot tap area (center-left of the screen).
    const expanded = this.expandedPanel = visualNode('District navigator', parent, 244, height / 2 - top - 284, 208, 336);
    art.surface(expanded, 208, 336, C.paper, 18, C.line);
    swallow(expanded);
    DISTRICTS.forEach(([name, district], i) => {
      const n = visualNode('District ' + name, expanded, -68 + i * 68, 128, 60, 52);
      const bg = n.addComponent(Graphics);
      const label = ui.text(n, name, 0, 0, 22, C.ink, 56, 46);
      this.districtButtons.push({ key: district.x + ',' + district.y, bg, label });
      let moved = false;
      n.on(Node.EventType.TOUCH_START, () => { moved = false; });
      n.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => { if (e.getUILocation().subtract(e.getUIStartLocation()).length() > 12) moved = true; });
      n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
        e.propagationStopped = true;
        if (moved) return;
        this.activeKey = district.x + ',' + district.y;
        this.drawDistricts();
        onNavigate(district);
      });
    });
    this.drawDistricts();
    this.minimap = visualNode('Scenic minimap', expanded, 0, -30, MINIMAP_SIZE, MINIMAP_SIZE);
    ui.button(expanded, '收起 ›', 0, -140, 148, 40, () => this.setExpanded(false), false);
    const handle = this.collapsedHandle = visualNode('District navigator collapsed', parent, 298, height / 2 - top - 144, 104, 60);
    art.surface(handle, 104, 60, C.paper, 18, C.line);
    swallow(handle);
    ui.button(handle, '‹ 小地图', 0, 0, 96, 52, () => this.setExpanded(true), false);
    // Small screens (design height grows past 1280 on narrow devices) start collapsed.
    this.setExpanded(height <= 1400);
  }
  private setExpanded(expanded: boolean) {
    this.expandedPanel.active = expanded;
    this.collapsedHandle.active = !expanded;
    if (expanded) { this.lastSignature = ''; this.redraw(); }
  }
  private drawDistricts() {
    const C = this.art.palette;
    for (const b of this.districtButtons) {
      const active = b.key === this.activeKey;
      b.bg.clear();
      b.bg.fillColor = tint(active ? C.green : C.cream);
      b.bg.roundRect(-30, -26, 60, 52, 14); b.bg.fill();
      b.bg.strokeColor = tint(active ? C.gold : C.line); b.bg.lineWidth = 2; b.bg.stroke();
      b.label.color = tint(active ? C.cream : C.ink);
    }
  }
  /** Redraw when observation data, the camera or the selection changed. */
  update(plots: MinimapPlots, camera: WorldCamera | undefined, viewportHeight: number, selected = '',scene?:SceneSnapshot) {
    this.scene=scene;this.lastPlots = plots; this.lastCamera = camera; this.lastHeight = viewportHeight; this.selected = selected;
    if (!camera) return;
    const at = worldToLogical({ x: camera.x, y: camera.y + CAMERA_LIFT });
    const district = districtOf(at.x, at.y), key = district.x + ',' + district.y;
    if (key !== this.activeKey) { this.activeKey = key; this.drawDistricts(); }
    this.redraw();
  }
  private redraw() {
    const plots = this.lastPlots, camera = this.lastCamera;
    if (!plots || !camera || !this.expandedPanel.active) return;
    const sig = minimapSignature(plots, camera) + '|' + this.selected+'|'+this.lastHeight+'|'+JSON.stringify(this.scene?.bounds);
    if (sig === this.lastSignature) return;
    this.lastSignature = sig;
    const C = this.art.palette;
    for (const n of [...this.minimap.children]) { n.active = false; n.destroy(); }
    const frame = visualNode('Minimap frame', this.minimap, 0, 0, 0, 0), fg = frame.addComponent(Graphics);
    const half = MINIMAP_SIZE / 2, inner = half - 4;
    fg.fillColor = tint(C.cream); fg.roundRect(-half, -half, MINIMAP_SIZE, MINIMAP_SIZE, 10); fg.fill();
    const model = buildMinimapModel(plots, camera, { width: 720, height: this.lastHeight }, MINIMAP_SIZE - 12,this.scene);
    for(const region of model.environment){
      fg.fillColor=tint(TONES[region.tone]);region.boundary.forEach((p,i)=>i?fg.lineTo(p.x,-p.y):fg.moveTo(p.x,-p.y));fg.close();fg.fill();
    }
    model.cells.forEach((cell, i) => {
      const marked = cell.id === this.selected;
      const size = cell.tone === 'home' || marked ? 7 : 5;
      fg.fillColor = tint(TONES[cell.tone] ?? TONES.mist);
      cell.boundary.forEach((p,i)=>i?fg.lineTo(p.x,-p.y):fg.moveTo(p.x,-p.y));
      fg.close(); fg.fill();
      if (marked) {
        fg.strokeColor = tint(C.ink); fg.lineWidth = 2.5;
        fg.moveTo(cell.x, -cell.y - 11); fg.lineTo(cell.x + 11, -cell.y); fg.lineTo(cell.x, -cell.y + 11); fg.lineTo(cell.x - 11, -cell.y);
        fg.close(); fg.stroke();
      }
    });
    // Viewport rect follows the camera but is clipped to the minimap bounds.
    const rx = model.view.x, ry = -model.view.y - model.view.h;
    const x0 = Math.max(rx, -inner), y0 = Math.max(ry, -inner);
    const x1 = Math.min(rx + model.view.w, inner), y1 = Math.min(ry + model.view.h, inner);
    if (x1 > x0 && y1 > y0) {
      fg.strokeColor = tint(C.gold); fg.lineWidth = 3;
      fg.rect(x0, y0, x1 - x0, y1 - y0); fg.stroke();
    }
    fg.strokeColor = tint(C.line); fg.lineWidth = 2; fg.roundRect(-half, -half, MINIMAP_SIZE, MINIMAP_SIZE, 10); fg.stroke();
  }
}
