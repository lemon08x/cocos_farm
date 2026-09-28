# env-river-straight-y 生成记录

日期：2026-09-28。角色：art-river（farm scene v2 recovery 并行子任务）。

## 产物

- 成品：`art/scenic/revision-2/sources/env-river-straight-y.png`，600×360，透明 PNG。
- 槽位：`env.river.straight.y`，显示 300×180（源图 2×）。
- 几何：水面直带 UR 边中点 (450,90) → LL 边中点 (150,270)，下左 31° 对角；岸草与石块在带两侧；菱形外及岸外区域透明。

## 参考与输入

- 风格参考：`art/expansion-previews/02-district-browse.png`。
- 几何模板：`art/scenic/revision-2/templates/mock-env-river-straight-y.png`（1200×720 mock，`make-mocks.mjs` 生成）。
- 提示词存档：`art/scenic/revision-2/generation-records/prompts/env-river-straight-y.txt`。
- 工具：codex CLI 0.147 内置 image_gen（edit 模式，mock 作为输入图）。一次生成通过。

## 原稿

- `raw/env-river-straight-y-raw.png`（1619×971）、`raw/env-river-straight-y-keyed.png`

## 处理步骤

1. codex image_gen edit 以 mock 为输入重绘（日志 `logs/env-river-straight-y.log`）。
2. `remove_chroma_key.py --auto-key corners --soft-matte --despill` 去底。
3. `fit-canvas.mjs` 居中裁 5:3 并缩放到 600×360。
4. `clip-diamond.mjs` 将 alpha 裁到单元菱形内（原图右上菱形外有一颗越界石块，由此步骤清除）。

## 偏差

- 背景为黑色而非纯绿幕：去底按键色 #000000 处理，透明结果检查通过。
- 生成器输出 1619×971 而非 1200×720；宽高比一致，裁切无损失。

## 验证（verify-art.mjs）

- 尺寸 600×360 ✓；四角 alpha=0 ✓；中心 alpha=251 ✓。
- 边中点 alpha：UL=113 UR=103 LL=101 LR=88。
- 接缝水质检查：UR、LL 中点区域内侧为不透明水面，可与邻段对接。
