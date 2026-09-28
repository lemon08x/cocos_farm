# crop-default-mature 生成记录

日期：2026-09-28。工具：codex CLI 0.147（`codex exec --skip-git-repo-check`），内置 image_gen（gpt-image 系），node + sharp 后处理。

## 最终提示词（摘要）

> 查看 art/expansion-previews/02-district-browse.png 匹配风格：柔和田园厚涂、左上暖光。生成：通用成熟叶菜行（层叠大圆叶、深绿暖光、植株饱满几乎相接），平行行沿宽菱形水平长轴排布，整体轮廓为约 1.6:1 扁菱形（顶/右/底/左四个清晰角点，非圆丘），居中、左右角接近画幅边缘。仅植物：无土壤、无底块、无田框、无围栏、无文字 UI。背景为纯平 #ff00ff 品红。菱形外圈约 10% 不画植物。

注：首次出图为透明底而非品红底，已要求重新生成品红底版本（第二次出图采用）。

## 原始文件

- `art/scenic/revision-2/generation-records/raw/crop-default-mature-raw.png`（1584×993，品红底原图；底色在 (250,3,250) 附近）

## 后处理

1. 按到品红的颜色距离构建 alpha：`alpha = clamp((dist - 7) / 280)`；r>210、b>200、g<80 的像素直接判背景。
2. 反除背景混色恢复前景色。
3. 植物包围盒（源 (41,97)，1501×782）裁剪，lanczos3 缩放 453×281，补透明边至 456×284。

## 验证（node + sharp，另经独立复核）

456×284，RGBA；画布四角 alpha = [0,0,0,0]；平均 alpha = 123.68；不透明品红像素 = 0。通过。

## 产物

- `art/scenic/revision-2/sources/crop-default-mature.png`（456×284，对应显示尺寸 228×142）
