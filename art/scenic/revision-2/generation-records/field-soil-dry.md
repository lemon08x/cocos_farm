# field-soil-dry 生成记录

日期：2026-09-28。素材槽位：`field.soil.dry`（456×284 源图，显示 228×142，alpha 模式 `quad`）。

- 成品：`art/scenic/revision-2/sources/field-soil-dry.png`（456×284，透明背景）
- 原始生成图：`art/scenic/revision-2/generation-records/raw/field-soil-dry.png`（1536×1024，未抠图）
- 中间产物：`art/scenic/revision-2/generation-records/field-soil-dry-keyed.png`（抠图后、裁切前）
- 工具：codex CLI 0.147（内置 image_gen + imagegen 技能），会话 01a0e7b0-1810-7fe2-85e3-4949d72be925
- 风格参考：`art/expansion-previews/02-district-browse.png`

## 生成提示词（最终）

> A single flat ISOMETRIC DIAMOND (rhombus) of DRY TILLED SOIL, seen from directly above at the isometric angle, centered in the frame. The diamond's width:height ratio must be about 1.6:1 (roughly 1.61), noticeably wider than tall but NOT a 2:1 diamond. The diamond's four corners nearly touch the midpoints of the four canvas edges. Soil content: loose crumbly tilled brown earth, warm mid-brown tone, fine parallel furrow/ridge texture running along one diagonal direction of the diamond, subtle painterly clods and small earth lumps, slightly lighter warm sunlit tone toward the upper-left, slightly darker toward the lower-right. STRICTLY NO: crops, seedlings, plants, grass tufts, stones or rock borders, fence, path, road, water, puddles, footprints, tools, text, UI, frames, borders. Everything OUTSIDE the diamond must be a perfectly flat uniform chroma-key green #00FF00: no shadows, no gradients, no texture, no vignette in the green area; the soil casts NO shadow outside the diamond; the soil itself must NOT contain any pure green pixels. Style: painterly soft pastoral illustration matching art/expansion-previews/02-district-browse.png, warm sunlight from the upper-left, soft hand-painted brush texture.

首次生成带暗角，重生成一次替换背景后通过。

## 后处理步骤

1. 抠图：`remove_chroma_key.py --auto-key border --soft-matte --transparent-threshold 30 --opaque-threshold 160 --despill --edge-contract 1`（生成图的绿色非严格 #00FF00，自动采样边框色值 #04f90b）。
2. 裁切至不透明包围盒（源图 1514×968 @ 11,19，比例 1.564）。
3. 等比缩放（`fit: inside`，lanczos3）至 438×280，居中合成到 456×284 透明画布（偏移 9,2）。未使用非等比拉伸。

## 验证（node+sharp）

- 尺寸 456×284 ✓；四角 alpha = 0（<160）✓；中心 (228,142) alpha = 255（≥128）✓
- 不透明包围盒 x=9–446, y=2–281（438×280），四角点接近模板角点 (228,2)/(454,142)/(228,282)/(2,142)，水平方向内缩约 8px，在容差内
- 可见绿色残留像素 0
