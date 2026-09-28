import { Graphics, Node } from 'cc';
import { ArtRenderer, tint, visualNode } from '../../art/ArtRenderer';
import { UiKit } from '../UiKit';
import type { DistrictId, PlotRenderModel, WorldCamera } from '../world/FarmWorldViewContract';
import { buildMinimapModel, minimapSignature } from '../world/scenic/ScenicMinimap';

/** Scenic district navigator (plan §7): 院前/东侧/南侧 locate buttons move the
 * camera only — they never explore, select or run actions — and a real minimap
 * built from observation data (known vs mist vs field/water/homestead) with a
 * viewport rectangle tracking the camera. The panel sits on the right edge so
 * it never covers the main plot tap area; it is collapsible (collapsed by
 * default on small screens) and intercepts map gestures while expanded, so
 * drags starting on the panel no longer pan the map. */
const TONES: Record<string, string> = {
  mist: '#b9bfae', field: '#9a7648', water: '#5b8fa8', green: '#5f8a4e', home: '#d9a441'
};
const MINIMAP_SIZE = 150;

export class DistrictNavigator {
  private minimap: Node;
  private lastSignature = '';
  private expandedPanel: Node;
  private collapsedHandle: Node;
  constructor(parent: Node, private art: ArtRenderer, ui: UiKit, height: number, top: number, onNavigate: (district: DistrictId) => void) {
    const C = art.palette;
    const swallow = (n: Node) => {
      for (const type of [Node.EventType.TOUCH_START, Node.EventType.TOUCH_MOVE, Node.EventType.TOUCH_END, Node.EventType.TOUCH_CANCEL])
        n.on(type, (e: any) => { e.propagationStopped = true; });
    };
    // Right edge, below the resource pills, above the field card: the panel
    // never covers the main plot tap area (center-left of the screen).
    const panelY = height / 2 - top - 375;
    const expanded = this.expandedPanel = visualNode('District navigator', parent, 262, panelY, 180, 470);
    art.surface(expanded, 180, 470, C.paper, 18, C.line);
    swallow(expanded);
    const entries: [string, DistrictId][] = [['院前', { x: 0, y: 0 }], ['东侧', { x: 1, y: 0 }], ['南侧', { x: 0, y: 1 }]];
    entries.forEach(([name, district], i) => {
      ui.button(expanded, name, 0, 176 - i * 66, 148, 56, () => onNavigate(district), false);
    });
    this.minimap = visualNode('Scenic minimap', expanded, 0, -110, MINIMAP_SIZE, MINIMAP_SIZE);
    ui.button(expanded, '收起 ›', 0, -212, 148, 40, () => this.setExpanded(false), false);
    const handle = this.collapsedHandle = visualNode('District navigator collapsed', parent, 302, panelY + 200, 100, 60);
    art.surface(handle, 100, 60, C.paper, 18, C.line);
    swallow(handle);
    ui.button(handle, '‹ 小地图', 0, 0, 92, 52, () => this.setExpanded(true), false);
    // Small screens (design height grows past 1280 on narrow devices) start collapsed.
    this.setExpanded(height <= 1400);
  }
  private setExpanded(expanded: boolean) {
    this.expandedPanel.active = expanded;
    this.collapsedHandle.active = !expanded;
  }
  /** Redraw the minimap when observation data or the camera changed. */
  update(plots: Pick<PlotRenderModel, 'id' | 'x' | 'y' | 'kind' | 'discovery' | 'reachable'>[], camera: WorldCamera | undefined, viewportHeight: number) {
    if (!camera || !this.expandedPanel.active) return;
    const sig = minimapSignature(plots, camera);
    if (sig === this.lastSignature) return;
    this.lastSignature = sig;
    const C = this.art.palette;
    for (const n of [...this.minimap.children]) { n.active = false; n.destroy(); }
    const frame = visualNode('Minimap frame', this.minimap, 0, 0, 0, 0), fg = frame.addComponent(Graphics);
    const half = MINIMAP_SIZE / 2;
    fg.fillColor = tint(C.cream); fg.roundRect(-half, -half, MINIMAP_SIZE, MINIMAP_SIZE, 10); fg.fill();
    const model = buildMinimapModel(plots, camera, { width: 720, height: viewportHeight }, MINIMAP_SIZE - 12);
    for (const cell of model.cells) {
      const size = cell.tone === 'home' ? 7 : 5;
      fg.fillColor = tint(TONES[cell.tone] ?? TONES.mist);
      fg.moveTo(cell.x, -cell.y - size); fg.lineTo(cell.x + size, -cell.y); fg.lineTo(cell.x, -cell.y + size); fg.lineTo(cell.x - size, -cell.y);
      fg.close(); fg.fill();
    }
    fg.strokeColor = tint(C.gold); fg.lineWidth = 3;
    fg.rect(model.view.x, -model.view.y - model.view.h, model.view.w, model.view.h); fg.stroke();
    fg.strokeColor = tint(C.line); fg.lineWidth = 2; fg.roundRect(-half, -half, MINIMAP_SIZE, MINIMAP_SIZE, 10); fg.stroke();
  }
}
