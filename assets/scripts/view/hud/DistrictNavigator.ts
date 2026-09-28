import { Graphics, Node } from 'cc';
import { ArtRenderer, tint, visualNode } from '../../art/ArtRenderer';
import { UiKit } from '../UiKit';
import type { DistrictId } from '../world/FarmWorldViewContract';

/** Scenic district shortcuts: 院前/东侧/南侧 move the camera only — they never
 * explore, select or run actions. The minimap area is a placeholder until P4. */
export class DistrictNavigator {
  constructor(parent: Node, art: ArtRenderer, ui: UiKit, height: number, top: number, onNavigate: (district: DistrictId) => void) {
    const C = art.palette;
    const panel = visualNode('District navigator', parent, 268, height / 2 - top - 300, 150, 340);
    art.surface(panel, 150, 340, C.paper, 18, C.line);
    const entries: [string, DistrictId][] = [['院前', { x: 0, y: 0 }], ['东侧', { x: 1, y: 0 }], ['南侧', { x: 0, y: 1 }]];
    entries.forEach(([name, district], i) => {
      ui.button(panel, name, 0, 128 - i * 72, 120, 60, () => onNavigate(district), false);
    });
    const map = visualNode('Minimap placeholder', panel, 0, -116, 124, 104), g = map.addComponent(Graphics);
    g.fillColor = tint(C.cream); g.roundRect(-62, -52, 124, 104, 10); g.fill();
    g.strokeColor = tint(C.line); g.lineWidth = 2; g.roundRect(-62, -52, 124, 104, 10); g.stroke();
    g.strokeColor = tint(C.status); g.lineWidth = 3; g.roundRect(-24, -14, 48, 36, 6); g.stroke();
    ui.text(map, '小地图', 0, 0, 20, C.muted, 100, 32);
  }
}
