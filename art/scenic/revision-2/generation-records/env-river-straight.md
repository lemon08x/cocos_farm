# env-river-straight 生成记录

日期：2026-09-28。角色：art-river（farm scene v2 recovery 并行子任务）。

## 产物

- 成品：`art/scenic/revision-2/sources/env-river-straight.png`，600×360，透明 PNG。
- 槽位：`env.river.straight`，显示 300×180（源图 2×）。
- 几何：水面直带 UL 边中点 (150,90) → LR 边中点 (450,270)，下右 31° 对角；岸草与石块在带两侧；菱形外及岸外区域透明。

## 参考与输入

- 风格参考：`art/expansion-previews/02-district-browse.png`（蓝绿水面+白色波光、草岸、左上暖光）。
- 几何模板：`art/scenic/revision-2/templates/mock-env-river-straight.png`（1200×720 全尺寸 mock，由 `make-mocks.mjs` 生成）。
- 提示词存档：`art/scenic/revision-2/generation-records/prompts/env-river-straight.txt`。
- 工具：codex CLI 0.147 内置 image_gen（edit 模式，mock 作为输入图）。

## 原稿（禁止覆盖，全部保留）

- v1（无模板直出，失败：黑底渐变、带角过陡、菱形偏小）：`raw/env-river-straight-raw.png`、`raw/env-river-straight-keyed.png`
- v2（色块 guide 编辑，失败：带角仍偏陡、菱形填充不足）：`raw/env-river-straight-raw-v2.png`、`raw/env-river-straight-keyed-v2.png`
- v3（全尺寸 mock 编辑，采用）：`raw/env-river-straight-raw-v3.png`（1619×971）、`raw/env-river-straight-keyed-v3.png`

## 处理步骤

1. codex image_gen edit 以 mock 为输入重绘（日志 `logs/env-river-straight-v3.log`）。
2. `remove_chroma_key.py --auto-key corners --soft-matte --despill` 去底。
3. `fit-canvas.mjs` 居中裁 5:3 并缩放到 600×360。
4. `clip-diamond.mjs` 将 alpha 裁到单元菱形内（清理菱形外溢出像素）。

## 偏差

- 生成器未保留纯绿幕：v3 原图背景为黑色，去底实际按键色 #000000 处理；透明结果检查通过，画面无可见缺蚀（亮绿残边像素 48/106792，可忽略）。
- 生成器输出 1619×971 而非 mock 的 1200×720；宽高比一致（均 5:3），裁切无损失。

## 验证（verify-art.mjs）

- 尺寸 600×360 ✓；四角 alpha=0 ✓；中心 alpha=251 ✓。
- 边中点 alpha：UL=113 UR=87 LL=99 LR=73（四边均有绘制到达）。
- 接缝水质检查：UL、LR 中点 19×19 区域内约一半（菱形内侧）为不透明水面，可与邻段对接。
