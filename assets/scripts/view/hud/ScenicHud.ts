import { EventTouch, Graphics, Label, Node, Sprite, UITransform } from 'cc';
import { ArtRenderer, tint, visualNode } from '../../art/ArtRenderer';
import { UiKit } from '../UiKit';
import type { HudActions } from '../FarmHud';
import type { HudViewModel } from '../../presentation/FarmViewModel';
import type { ScenicArtPack } from '../world/scenic/ScenicArtPack';

/** Scenic (田园场景) HUD skeleton: date card + resource pills on top,
 * selected-field card + solid four-entry navigation at the bottom.
 * Display data and callbacks only; no game behavior decisions here. */
export class ScenicHud {
  private labels: Partial<Record<keyof HudViewModel, Label>> = {};
  private thumbnailParent: Node | null = null;
  private thumbnail: Node | null = null;
  private lastThumbnail = '';
  private todoLabel: Label | null = null;
  constructor(parent: Node, private art: ArtRenderer, ui: UiKit, height: number, top: number, bottom: number, actions: HudActions, private images: ScenicArtPack | null) {
    const C = art.palette;
    const card = (name: string, x: number, yFromTop: number, w: number, h: number) => {
      const n = visualNode(name, parent, x - 360, height / 2 - yFromTop, w, h);
      art.surface(n, w, h, C.paper, 20, C.line); return n;
    };
    const label = (key: keyof HudViewModel, n: Node, x: number, y: number, w: number, h: number, size: number, fill = C.ink) =>
      this.labels[key] = ui.text(n, '', x, y, size, fill, w, h);
    const icon = (slot: string, n: Node, x: number, y: number, size: number) => {
      if (this.scenicImage(slot, n, x, y, size)) return;
      const dot = visualNode('Icon ' + slot, n, x, y, size, size), g = dot.addComponent(Graphics);
      g.fillColor = tint(C.green); g.roundRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 14); g.fill();
    };
    // Top: date card + resource pills (~9% of a 1280 design height).
    const date = card('Scenic date', 180, top + 56, 336, 96);
    label('date', date, 0, 20, 312, 40, 29);
    label('term', date, 0, -22, 312, 36, 24, C.muted);
    const pills: [keyof HudViewModel, string][] = [['money', 'icon.coin'], ['food', 'icon.food'], ['pressure', 'icon.pressure']];
    pills.forEach(([key, slot], i) => {
      const n = card('Scenic resource ' + key, 432 + i * 122, top + 56, 112, 96);
      icon(slot, n, 0, 16, 36);
      label(key, n, 0, -26, 104, 34, 20);
    });
    // Bottom: solid four-entry navigation.
    const navTop = height - bottom - 78;
    card('Scenic navigation', 360, navTop, 700, 140);
    const nav: [string, string, () => void][] = [
      ['田地', 'nav.field', actions.plots], ['农历', 'nav.calendar', actions.calendar],
      ['仓储', 'nav.basket', actions.inventory], ['更多', 'nav.more', actions.more]
    ];
    nav.forEach(([name, slot, fn], i) => {
      const n = visualNode('Scenic nav ' + name, parent, -270 + i * 180, -height / 2 + bottom + 78, 150, 132);
      icon(slot, n, 0, 24, 58);
      ui.text(n, name, 0, -38, 24, C.ink, 120, 34);
      let moved = false;
      n.on(Node.EventType.TOUCH_START, () => { moved = false; });
      n.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => { if (e.getUILocation().subtract(e.getUIStartLocation()).length() > 12) moved = true; });
      n.on(Node.EventType.TOUCH_END, (e: EventTouch) => { e.propagationStopped = true; if (!moved) fn(); });
    });
    // Bottom: selected-field card (~28% together with the navigation bar).
    const field = card('Scenic selected field', 360, navTop - 163, 700, 186);
    this.thumbnailParent = visualNode('Scenic field thumbnail', field, -262, 0, 132, 132);
    label('field', field, -40, 52, 300, 44, 30);
    label('detail', field, -40, 4, 300, 38, 23, C.caption);
    label('water', field, -40, -42, 300, 36, 22, C.status);
    ui.button(field, '查看农事', 212, 30, 196, 80, actions.farm, true);
    const todo = visualNode('Todo badge', field, 212, -56, 196, 44);
    this.todoLabel = ui.text(todo, '', 0, 0, 22, C.warning, 190, 40);
  }
  private scenicImage(slot: string, parent: Node, x: number, y: number, size: number): Node | null {
    const spec = this.images?.spec(slot), frame = this.images?.frames.get(slot);
    if (!spec || !frame) return null;
    const n = visualNode(slot, parent, x, y, size, size);
    const sp = n.addComponent(Sprite); sp.spriteFrame = frame; sp.sizeMode = Sprite.SizeMode.CUSTOM;
    n.getComponent(UITransform)!.setContentSize(size, size);
    return n;
  }
  update(model: HudViewModel) {
    for (const key of Object.keys(this.labels) as (keyof HudViewModel)[]) {
      const label = this.labels[key]!;
      if (label.string !== model[key]) label.string = model[key] as string;
    }
    if (this.todoLabel) {
      const text = model.todoCount > 0 ? '待办 ' + model.todoCount : '暂无待办';
      if (this.todoLabel.string !== text) this.todoLabel.string = text;
    }
    if (this.thumbnailParent) {
      const slots = model.thumbnailScenic ?? [];
      const key = slots.join('|');
      if (key !== this.lastThumbnail) {
        this.thumbnail?.destroy(); this.thumbnail = null;
        const stack = visualNode('Thumbnail stack', this.thumbnailParent, 0, 0, 0, 0);
        let placed = 0;
        for (const slot of slots) {
          const spec = this.images?.spec(slot), frame = this.images?.frames.get(slot);
          if (!spec || !frame) continue;
          const s = Math.min(124 / spec.width, 118 / spec.height);
          const n = visualNode(slot, stack, 0, 0, spec.width * s, spec.height * s);
          const sp = n.addComponent(Sprite); sp.spriteFrame = frame; sp.sizeMode = Sprite.SizeMode.CUSTOM;
          n.getComponent(UITransform)!.setContentSize(spec.width * s, spec.height * s);
          placed++;
        }
        if (!placed) {
          const g = stack.addComponent(Graphics);
          g.fillColor = tint(this.art.palette.disabled);
          g.moveTo(0, -56); g.lineTo(64, 0); g.lineTo(0, 56); g.lineTo(-64, 0); g.close(); g.fill();
        }
        this.thumbnail = stack; this.lastThumbnail = key;
      }
    }
  }
}
