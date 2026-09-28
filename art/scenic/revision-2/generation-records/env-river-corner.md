# env-river-corner 生成记录

日期：2026-09-28。角色：art-river（farm scene v2 recovery 并行子任务）。

## 产物

- 成品：`art/scenic/revision-2/sources/env-river-corner.png`，600×360，透明 PNG。
- 槽位：`env.river.corner`，显示 300×180（源图 2×）。
- 几何：水面为绕左侧的光滑弯段——以菱形左顶点 (0,180) 为圆心、半径 175 的圆弧，从 UL 边中点 (150,90) 弯到 LL 边中点 (150,270)，进出水方向均垂直于所在边；左顶点处为草楔；右半菱形及上/右/下角区透明。

## 参考与输入

- 风格参考：`art/expansion-previews/02-district-browse.png`。
- 几何模板：`art/scenic/revision-2/templates/mock-env-river-corner.png`（1200×720 mock，`make-mocks.mjs` 生成；环形扇形弯，非贝塞尔，保证带宽通过两端中点）。
- 提示词存档：`art/scenic/revision-2/generation-records/prompts/env-river-corner.txt`。
- 工具：codex CLI 0.147 内置 image_gen（edit 模式，mock 作为输入图）。一次生成通过。

## 原稿

- `raw/env-river-corner-raw.png`（1619×971）、`raw/env-river-corner-keyed.png`

## 处理步骤

1. codex image_gen edit 以 mock 为输入重绘（日志 `logs/env-river-corner.log`）。
2. `remove_chroma_key.py --auto-key corners --soft-matte --despill` 去底。
3. `fit-canvas.mjs` 居中裁 5:3 并缩放到 600×360。
4. `clip-diamond.mjs` 将 alpha 裁到单元菱形内。

## 偏差

- 背景为黑色而非纯绿幕：去底按键色 #000000 处理，透明结果检查通过。
- 生成器输出 1619×971 而非 1200×720；宽高比一致，裁切无损失。

## 验证（verify-art.mjs）

- 尺寸 600×360 ✓；四角 alpha=0 ✓；中心 alpha=243 ✓。
- 边中点 alpha：UL=123 UR=0 LL=106 LR=0（UR/LR 为 0 符合左弯设计——右侧保持透明）。
- 接缝水质检查：UL、LL 中点区域内侧为不透明水面，可与直段对接。
