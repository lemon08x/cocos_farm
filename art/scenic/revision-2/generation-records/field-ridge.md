# field-ridge 生成记录

日期：2026-09-28。素材槽位：`field.ridge`（456×284 源图，显示 228×142，alpha 模式 `quad-hollow`，仅四边条带，中心透明）。

- 成品：`art/scenic/revision-2/sources/field-ridge.png`（456×284，透明背景，空心田埂环带）
- 原始生成图：`art/scenic/revision-2/generation-records/raw/field-ridge.png`（1254×1254，未处理）
- 工具：codex CLI 0.147（内置 image_gen + imagegen 技能），会话 01a0e7bc-4842-7fb1-ad70-1e390d786c55
- 风格参考：`art/expansion-previews/02-district-browse.png` + 同批 `field-soil-dry.png`（共用同一菱形模板，将叠加在土壤之上）

## 生成提示词（最终）

> A single ISOMETRIC DIAMOND-SHAPED RING (a rhombus picture-frame / hollow border band) representing a raised grassy earthen field ridge (tian geng / farm bund between paddies), seen from directly above at the isometric angle, centered in the frame. The ring's OUTER diamond has width:height ratio about 1.6:1 (roughly 1.61), and its four outer corners nearly touch the midpoints of the four canvas edges. The band: a low raised earthen ridge strip of roughly uniform width (strip width about 8-10% of the outer diamond's height), soft painterly GREEN GRASS and tiny meadow texture on its top surface, warm brown earth on its inner and outer side faces, gentle hand-painted tufts; warm light from the upper-left so the upper-left faces are slightly lighter and the lower-right faces slightly shaded; the strip follows the diamond outline continuously around all four sides with neat mitered corners. THE INTERIOR OF THE RING MUST BE COMPLETELY EMPTY: the whole inner diamond area inside the band is the SAME perfectly flat uniform chroma-key green #00FF00 as the exterior background — nothing drawn inside: no soil, no grass, no water, no shadow. Exterior also flat #00FF00 with no shadows/gradients/texture/vignette; the ridge casts NO shadow; the band itself must NOT contain any pure green pixels. STRICTLY NO: crops, flowers, trees, fences, paths, roads, water, rock piles, text, UI, frames, borders other than the ridge band itself. Style: painterly soft pastoral illustration matching art/expansion-previews/02-district-browse.png, warm sunlight from the upper-left.

## 后处理步骤

1. 生成器返回原生透明背景；按流程用 node+sharp `flatten({background:'#00ff00'})` 合成绿幕。
2. 抠图：`remove_chroma_key.py --key-color #00ff00 --soft-matte --transparent-threshold 30 --opaque-threshold 160 --despill`（显式指定键色而非 auto-key，保证外部背景与空心内部同时抠除）。
3. 裁切至环带外包围盒（1220×790 @ 17,238，比例 1.544）。
4. 等比缩放至 432×280，居中合成到 456×284 透明画布（偏移 12,2）。未使用非等比拉伸。

## 验证（node+sharp）

- 尺寸 456×284 ✓；四角 alpha = 0（<160）✓；中心 (228,142) alpha = 0（<128，空心）✓
- 条带存在：顶边 (228,16) alpha = 224、左边 (16,142) alpha = 255 ✓
- 不透明包围盒 (12,2)–(443,281)（432×280）；外轮廓左右角点较模板内缩约 10px（源比例 1.544 vs 模板 1.614，等比适配所致，在容差内）
- 不透明像素中的色键绿残留 0
