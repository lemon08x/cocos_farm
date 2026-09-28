# crop-default-growing 生成记录

日期：2026-09-28。工具：codex CLI 0.147（`codex exec --skip-git-repo-check`），内置 image_gen（gpt-image 系），node + sharp 后处理。

## 最终提示词（摘要）

> 查看 art/expansion-previews/02-district-browse.png 匹配风格：柔和田园厚涂、左上暖光。生成：通用叶菜幼苗行（圆叶嫩苗，小而稀疏、株间留隙可透出土面），平行行沿宽菱形水平长轴排布，整体轮廓为约 1.6:1 扁菱形（顶/右/底/左四个清晰角点），居中、左右角接近画幅边缘。仅植物：无土壤、无底块、无田框、无围栏、无文字 UI。背景为纯平 #ff00ff 品红。菱形外圈约 10% 不画植物。

## 原始文件

- `art/scenic/revision-2/generation-records/raw/crop-default-growing-raw.png`（1586×992，品红底原图；底色在 (250,4,250) 附近）

## 后处理

1. 按到 (250,4,250) 的颜色距离构建 alpha：`alpha = clamp((dist - 32) / 125)`；r、b 均 >215 且 g<50 的像素直接判为背景。
2. 反除背景混色恢复前景色。
3. 植物包围盒（源 (37,32)-(1538,940)）裁剪，lanczos3 缩放 452×280，补 2px 透明边至 456×284。
4. 边缘净化：alpha<9 的残点清空；粉紫边缘像素（min(r,b) > g+45）用邻近健康绿色像素重着色（1173 像素），无法修复的移除（3534 像素）。

## 验证（node + sharp）

456×284，RGBA；四角 alpha = [0,0,0,0]；平均 alpha = 24.32；不透明品红像素 = 0；粉边像素 = 0。通过。

## 产物

- `art/scenic/revision-2/sources/crop-default-growing.png`（456×284，对应显示尺寸 228×142）
