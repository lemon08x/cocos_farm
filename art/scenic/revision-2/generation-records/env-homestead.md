# env-homestead 生成记录

日期：2026-09-28。工具：codex CLI 0.147（`codex exec --skip-git-repo-check`），内置 imagegen（gpt-image 系，两次调用：初稿 + 背景替换编辑），Python PIL 12.1 后处理（脚本 `process-homestead.py`）。

## 最终提示词（imagegen 英文原文）

第一次（初稿，附参考图 `art/expansion-previews/02-district-browse.png`）：

> Use case: stylized-concept. Asset type: isolated 2.5D pastoral farming-game environment sprite. Use the attached screenshot ONLY as a reference for the top-left homestead's painterly soft pastoral storybook style, slightly elevated three-quarter camera, dark charcoal-grey tiled roof, warm upper-left sunlight and gentle lower-right shadows, wooden architecture and fencing, lush muted olive/sage greenery, and small white wildflowers. DO NOT copy the screenshot's UI, crops, rivers, roads, fields, signs, or any other content. Create ONE cohesive compact homestead island that nearly fills a landscape-aspect canvas, with a crisp, clean silhouette. A single wooden cottage stands in the upper-left/center of the island; its dark grey tile roof and wooden facade are clearly legible. In front, extending right and lower-right, is a small enclosed courtyard of packed bare earth. Rustic wooden fence wraps the courtyard with a CLEAR WOODEN GATE OPENING at the BOTTOM-RIGHT edge, open to empty background so external farm paths could connect later. Include exactly ONE small leafy tree by a courtyard edge, a couple of shrubs, sparse white wildflowers at the edges, a few stones and grass tufts, and optionally one small wooden bucket at the cottage door. A soft irregular painted grassy earth edge defines the island, front edge of the yard visible in the lower part of the frame; do not paint any exterior ground. Composition should have enough empty color padding to preserve every silhouette edge and no cropping. No tilled field plots, no farmland, no crop rows, no rivers, no roads, no paths outside the courtyard, no extra houses, no people, no animals. ABSOLUTELY NO text, letters, numbers, UI, watermark, border, or frame anywhere. BACKGROUND REQUIREMENT: the ENTIRE canvas outside the compact homestead island is exactly ONE perfectly flat, solid, uniform pure RGB #00ff00 chroma-key green, without gradient, vignette, texture, scenery, painted sky, distant land, external shadows, or color variations. Avoid #00ff00 anywhere within the subject; foliage must remain olive/sage/mid green instead. The green background must meet the subject with crisp edges for later keying. High-quality painterly game asset, detailed but readable at small scale.

第二次（背景替换编辑，输入为初稿图，因初稿背景带暗橄榄色渐晕而非纯绿幕）：

> Precise-object-edit / background replacement of the provided homestead illustration. Preserve the farmhouse, the exactly one tree, the shrubs, fence, wooden gate, bare-earth courtyard, rocks, grass, and flowers EXACTLY as they are, with no modifications or additions to the illustrated island. Replace EVERY pixel outside the island silhouette, including all dark olive/black atmospheric vignette and glow, with one uniform perfectly flat solid electric chroma green RGB(0,255,0), hex #00FF00. This is a mechanical green-screen backdrop, not scenery: no shadow, no glow, no gradient, no painted texture, no vignette, no olive haze, no black anywhere on the background. Green must extend to all four corners and canvas edges. Maintain a clean crisp, precise silhouette border between island and green screen. Do not include any words, symbols, UI, paths, crops, fields, river, or additional objects. Output a landscape composition with padding around the island.

## 原始文件

- `art/scenic/revision-2/generation-records/raw/env-homestead-raw.png`（1536×1024，绿幕原图，背景替换后版本）

## 后处理（`generation-records/process-homestead.py`，PIL）

1. 绿幕判定：`g>190 且 r<90 且 b<90` → alpha 蒙版，0.6px 高斯羽化取暗部平滑边缘。
2. 边缘带去绿溢色（despill）：边缘带内偏绿像素 `g` 压到 `max(r,b)+55`，alpha 上限 230。
3. 按蒙版 bbox 裁剪，等比 lanczos 缩放到宽 890，合成到 920×760 透明画布，位置 (15, 128)，主体横向居中。

## 验证（node + sharp）

920×760，RGBA；四角 alpha = [0,0,0,0]；不透明覆盖率 47.3%；可见 bbox = (15,128)-(904,715)；锚点行 (460,608) alpha = 255。通过。

## 产物

- `art/scenic/revision-2/sources/env-homestead.png`（920×760，对应显示尺寸 460×380，锚点 [0.5,0.8]）

## 已知问题

- 无文字/UI、无农田地块；院门开向右下，可供道路衔接。初稿背景非纯绿幕，已经第二次 imagegen 背景替换修正。
- 后补边缘检查（灰底合成目检 + 连通域扫描）：主体为单一连通域；已清除 47 个孤立低 alpha 尘点（alpha≤16，最大 8px），清除后复验尺寸/四角/覆盖率不变，残留尘点 0。
