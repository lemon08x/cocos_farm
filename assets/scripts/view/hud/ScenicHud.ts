import { EventTouch, Graphics, Label, Node, Sprite, UITransform } from 'cc';
import { ArtRenderer, tint, visualNode } from '../../art/ArtRenderer';
import { UiKit } from '../UiKit';
import type { HudActions } from '../FarmHud';
import type { HudViewModel } from '../../presentation/FarmViewModel';
import type { ScenicArtPack } from '../world/scenic/ScenicArtPack';

/** Scenic (田园场景) HUD after art/expansion-previews/02-district-browse.png (plan §5/§7):
 * top bar = date+solar-term card left, resource pills (钱/口粮/压力) right; bottom =
 * selected-field card (thumbnail stack + name + short condition + scoped todo badge +
 * 查看农事) above a solid four-entry navigation. Everything stays inside the 720 design
 * width; text lengths are designed with the layout instead of relying on CLAMP.
 * Display data and callbacks only; no game behavior decisions here. */
export class ScenicHud {
  private labels: Partial<Record<keyof HudViewModel, Label>> = {};
  private thumbnailParent: Node | null = null;
  private thumbnail: Node | null = null;
  private lastThumbnail = '';
  constructor(parent: Node, private art: ArtRenderer, ui: UiKit, height: number, top: number, bottom: number, actions: HudActions, private images: ScenicArtPack | null) {
    const C = art.palette;
    const card = (name: string, x: number, yFromTop: number, w: number, h: number, fill = C.paper) => {
      const n = visualNode(name, parent, x - 360, height / 2 - yFromTop, w, h);
      art.surface(n, w, h, fill, 20, C.line); return n;
    };
    const label = (key: keyof HudViewModel, n: Node, x: number, y: number, w: number, h: number, size: number, fill = C.ink, align = Label.HorizontalAlign.CENTER) =>
      this.labels[key] = ui.text(n, '', x, y, size, fill, w, h, align);
    const icon = (slot: string, n: Node, x: number, y: number, size: number) => {
      if (this.scenicImage(slot, n, x, y, size)) return;
      const dot = visualNode('Icon ' + slot, n, x, y, size, size), g = dot.addComponent(Graphics);
      g.fillColor = tint(C.green); g.roundRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 14); g.fill();
    };
    const tap = (n: Node, fn: () => void) => {
      let moved = false;
      n.on(Node.EventType.TOUCH_START, () => { moved = false; });
      n.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => { if (e.getUILocation().subtract(e.getUIStartLocation()).length() > 12) moved = true; });
      n.on(Node.EventType.TOUCH_END, (e: EventTouch) => { e.propagationStopped = true; if (!moved) fn(); });
    };
    // Top: date + solar term card on the left, three resource pills on the right.
    const date = card('Scenic date', 164, top + 56, 304, 96);
    icon('icon.date', date, -126, 0, 40);
    label('date', date, -6, 20, 236, 40, 27);
    label('term', date, -6, -22, 236, 34, 21, C.muted);
    const pills: [keyof HudViewModel, string][] = [['money', 'icon.coin'], ['food', 'icon.food'], ['pressure', 'icon.pressure']];
    pills.forEach(([key, slot], i) => {
      const n = card('Scenic resource ' + key, 386 + i * 130, top + 56, 124, 96);
      icon(slot, n, 0, 18, 34);
      label(key, n, 0, -24, 114, 34, 20);
    });
    // Bottom: solid full-width four-entry navigation (田地 is the map itself and stays marked).
    const navTop = height - bottom - 74;
    card('Scenic navigation', 360, navTop, 720, 148, C.cream);
    const nav: [string, string, () => void][] = [
      ['田地', 'nav.field', actions.plots], ['农历', 'nav.calendar', actions.calendar],
      ['仓储', 'nav.basket', actions.inventory], ['更多', 'nav.more', actions.more]
    ];
    nav.forEach(([name, slot, fn], i) => {
      const n = visualNode('Scenic nav ' + name, parent, -270 + i * 180, -height / 2 + bottom + 74, 170, 140);
      icon(slot, n, 0, 24, 54);
      ui.text(n, name, 0, -36, 24, C.ink, 130, 36);
      if (i === 0) {
        const mark = visualNode('Scenic nav active', n, 0, -58, 56, 6), g = mark.addComponent(Graphics);
        g.fillColor = tint(C.gold); g.roundRect(-28, -3, 56, 6, 3); g.fill();
      }
      tap(n, fn);
    });
    // Bottom: selected-field card above the navigation bar.
    const field = card('Scenic selected field', 360, navTop - 182, 696, 196);
    this.thumbnailParent = visualNode('Scenic field thumbnail', field, -258, 0, 148, 148);
    art.surface(this.thumbnailParent, 148, 148, C.cream, 16, C.line);
    label('field', field, -24, 62, 304, 44, 31, C.ink, Label.HorizontalAlign.LEFT);
    label('fieldShort', field, -24, 16, 304, 36, 22, C.caption, Label.HorizontalAlign.LEFT);
    icon('icon.seedling', field, -158, -40, 30);
    label('todoBadge', field, 2, -40, 280, 36, 21, C.warning, Label.HorizontalAlign.LEFT);
    ui.button(field, '查看农事', 212, 0, 196, 120, actions.farm, true);
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
      const label = this.labels[key]!, text = (model[key] as string) ?? '';
      if (label.string !== text) label.string = text;
    }
    const badge = this.labels.todoBadge;
    if (badge) badge.color = tint(model.todoBadge && model.todoBadge !== '暂无待办' ? this.art.palette.warning : this.art.palette.muted);
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
          const s = Math.min(140 / spec.width, 140 / spec.height);
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
