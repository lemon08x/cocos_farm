# field-unknown 生成记录

日期：2026-09-28。素材槽位：`field.unknown`（456×284 源图，显示 228×142，alpha 模式 `quad`，未探索晨雾）。

- 成品：`art/scenic/revision-2/sources/field-unknown.png`（456×284，半透明雾团）
- 原始生成图：`art/scenic/revision-2/generation-records/raw/field-unknown.png`（1591×989，未处理）
- 转换脚本：`art/scenic/revision-2/generation-records/convert-field-unknown.mjs`（亮度→alpha，可重跑）
- 工具：codex CLI 0.147（内置 image_gen + imagegen 技能），会话 01a0e7c1-a60a-7290-a1f6-cc864572af23
- 风格参考：`art/expansion-previews/02-district-browse.png` + 同批 `field-soil-dry.png`（同一菱形模板）

## 抠图方式说明（与绿幕流程的差异）

本素材要求边缘有真正半透明的羽化雾丝；绿幕抠图会让半透明白雾带绿色残边，因此按计划 §6.4「半透明边缘不能无条件阈值抠除」的要求，改用**黑底 + 亮度转 alpha**：雾画在纯黑背景上，黑→雾的灰度过渡直接映射为透明度。这是烟雾类主体的标准做法，其余 3 张土壤/田埂仍走 #00FF00 绿幕流程。

## 生成提示词（最终）

> A soft bank of white-to-light-grey MORNING MIST / LOW CLOUD, seen from directly above, shaped as an ISOMETRIC DIAMOND (rhombus) with width:height ratio about 1.6:1 (roughly 1.61), centered in the frame, its four corners nearly touching the midpoints of the four canvas edges. The mist is DENSEST and most opaque white toward the CENTER of the diamond, progressively thinner, wispier and more translucent toward the diamond's edges, with soft feathered painterly wisps and gentle swirling vapor texture; soft whites (#ffffff) in the dense core, light warm greys (#d8d8d4-#e8e8e4) in thinner regions, hints of very soft cool shadow inside the vapor for depth. The background is PURE SOLID BLACK #000000 everywhere the mist is absent: perfectly flat, no gradient, no vignette, no stars, no texture; the mist fades smoothly into the black background at its outer edges. STRICTLY NO: terrain, soil, grass, trees, plants, water, paths, buildings, birds, sun, moon, text, UI, frames, borders. Only vapor. No hints of what lies beneath. Style: painterly soft pastoral feel matching art/expansion-previews/02-district-browse.png, soft morning light.

## 后处理步骤

1. 生成器返回黑底雾图（自带部分 alpha，先 `flatten({background:'#000000'})` 归一到纯黑底）。
2. 亮度→alpha（`convert-field-unknown.mjs`）：alpha = max(r,g,b) × 1.15（截断至 255），颜色按 alpha 反预乘（channel×255/alpha），消除黑边；alpha=0 全透明。
3. 裁切至 alpha>6 包围盒（1554×953 @ 19,17，比例 1.631）。
4. 等比缩放至 456×280，居中合成到 456×284 透明画布（偏移 0,2）。未使用非等比拉伸。

## 验证（node+sharp）

- 尺寸 456×284 ✓；四角 alpha = 0（<160）✓；中心 (228,142) alpha = 255（≥128，雾核浓密）✓
- 边缘半透明雾丝存在：44,496 个半透明像素；顶缘 (228,40) alpha = 233、左缘 (40,142) alpha = 199
- alpha>6 包围盒 (0,3)–(455,281)，覆盖整个模板菱形
- 黑边检查：alpha>128 且 RGB 均 <40 的像素 0 个
