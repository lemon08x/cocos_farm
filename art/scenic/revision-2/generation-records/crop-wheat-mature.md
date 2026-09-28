# crop-wheat-mature 生成记录

日期：2026-09-28。工具：codex CLI 0.147（`codex exec --skip-git-repo-check`），内置 image_gen（gpt-image 系），node + sharp 后处理。

## 最终提示词（摘要）

> 查看 art/expansion-previews/02-district-browse.png 匹配风格：柔和田园厚涂、左上暖光。生成：金黄成熟小麦行，饱满麦穗（参考图右上麦田），密集平行行沿宽菱形水平长轴排布，整体轮廓为约 1.6:1 扁菱形（顶/右/底/左四个清晰角点，非圆丘），居中、左右角接近画幅边缘。仅植物：无土壤、无底块、无田框、无围栏、无稻草人、无文字 UI。背景为纯平 #ff00ff 品红。菱形外圈约 10% 不画植物。

## 原始文件

- `art/scenic/revision-2/generation-records/raw/crop-wheat-mature-raw.png`（1586×992，品红底原图；实际底色为接近品红的 (250,3,250) 附近色）

## 后处理

1. 按到 (250,3,250) 的颜色距离构建 alpha：`alpha = clamp((dist - 42) / 68)`。
2. 反除背景混色恢复前景色；b 通道限制在 g*0.55 去紫边。
3. 植物包围盒（源 bbox (26,92)-(1556,888)，加 6px padding）裁剪，lanczos3 缩放到 456×284。
4. 二次边缘修正：半透明红边像素（r>100 且 r>g*1.5）的绿色通道提升至 r*0.58，共修正 2759 像素。

## 验证（node + sharp）

456×284，RGBA；四角 alpha = [0,0,0,0]；平均 alpha = 148.24；不透明品红像素 = 0。通过。

## 产物

- `art/scenic/revision-2/sources/crop-wheat-mature.png`（456×284，对应显示尺寸 228×142）
