# crop-wheat-growing 生成记录

日期：2026-09-28。工具：codex CLI 0.147（`codex exec --skip-git-repo-check`），内置 image_gen（gpt-image 系），node + sharp 后处理。

## 最终提示词（摘要）

> 查看 art/expansion-previews/02-district-browse.png 匹配风格：柔和田园厚涂、左上暖光、等距农场视角。生成：幼年绿色小麦苗行，等距田块覆盖层，平行苗行沿宽菱形水平长轴排布，整体轮廓为约 1.6:1 的扁菱形（顶/右/底/左四个清晰角点），居中、左右角接近画幅边缘。仅植物：无土壤、无底块、无田框、无围栏、无文字 UI。背景为纯平 #ff00ff 品红。菱形外圈约 10% 不画植物。

## 原始文件

- `art/scenic/revision-2/generation-records/raw/crop-wheat-growing-raw.png`（1586×992，品红底原图）

## 后处理

1. 绿色主体 alpha 提取：`alpha = clamp((g - 0.14*min(r,b) - 2) / 45)`，按品红距离去背景。
2. 去品红溢色（despill）：r 限制在 g*1.16+8、b 限制在 g*0.64+3，消除叶缘粉边。
3. 按 alpha>32 的植物包围盒裁剪（源 bbox (34,130)-(1549,863)），lanczos3 缩放到 452×280，四周补 2px 透明边至 456×284。

## 验证（node + sharp）

456×284，RGBA；四角 alpha = [0,0,0,0]；平均 alpha = 60.52；残留品红像素 = 0。通过。

## 产物

- `art/scenic/revision-2/sources/crop-wheat-growing.png`（456×284，对应显示尺寸 228×142）
