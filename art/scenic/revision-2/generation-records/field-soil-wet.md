# field-soil-wet 生成记录

日期：2026-09-28。素材槽位：`field.soil.wet`（456×284 源图，显示 228×142，alpha 模式 `quad`）。

- 成品：`art/scenic/revision-2/sources/field-soil-wet.png`（456×284，透明背景）
- 原始生成图：`art/scenic/revision-2/generation-records/raw/field-soil-wet.png`（1591×989，未处理）
- 工具：codex CLI 0.147（内置 image_gen + imagegen 技能），会话 01a0e7b5-be45-7162-b63a-4707525d5288
- 风格参考：`art/expansion-previews/02-district-browse.png` + 同批 `field-soil-dry.png`（统一视角、垄沟方向与笔触）

## 生成提示词（最终）

> A single flat ISOMETRIC DIAMOND (rhombus) of MOIST WET TILLED SOIL, seen from directly above at the isometric angle, centered in the frame. The diamond's width:height ratio must be about 1.6:1 (roughly 1.61), noticeably wider than tall but NOT a 2:1 diamond. The diamond's four corners nearly touch the midpoints of the four canvas edges. Soil content: rich dark moist brown earth, noticeably darker than dry soil (deep umber/chocolate brown), fine parallel furrow/ridge texture running along one diagonal direction of the diamond, a soft damp sheen with a few small subtle specular highlights of moist earth catching the warm light from the upper-left, slightly darker damp patches between furrows. STRICTLY NO: standing water, puddles, water pools, flooded paddy-field look, reflective water surface covering the soil, crops, seedlings, plants, grass, stones or rock borders, fence, path, road, footprints, tools, text, UI, frames, borders. Everything OUTSIDE the diamond must be a perfectly flat uniform chroma-key green #00FF00: no shadows, no gradients, no texture, no vignette; no cast shadow; no pure green pixels inside the soil. Style: painterly soft pastoral illustration matching art/expansion-previews/02-district-browse.png and field-soil-dry.png, warm sunlight from the upper-left.

首次生成背景为棕色，重生成一次；第二次生成器返回了原生透明背景而非绿幕。

## 后处理步骤

1. 原图自带透明背景；按既定抠图流程，先用 node+sharp `flatten({background:'#00ff00'})` 合成绿幕。
2. 抠图：`remove_chroma_key.py --auto-key border --soft-matte --transparent-threshold 30 --opaque-threshold 160 --despill --edge-contract 1`（键色 #00ff00）。
3. 用原图 RGB + 抠图 alpha 重建像素，避免 despill 影响暗色湿土；裁切至包围盒（1549×965 @ 20,14，比例 1.605）。
4. 等比缩放至 449×280，居中合成到 456×284 透明画布（偏移 3,2）。未使用非等比拉伸。

## 验证（node+sharp）

- 尺寸 456×284 ✓；四角 alpha = 0（<160）✓；中心 (228,142) alpha = 255（≥128）✓
- 不透明包围盒 (3,2)–(451,281)，角点贴合模板 (228,2)/(454,142)/(228,282)/(2,142)
- 不透明像素中的可见绿色像素 0；无积水/水田观感（湿土为深棕 + 局部润泽高光）
