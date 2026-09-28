# env-tree-canopy 生成记录

日期：2026-09-28。工具：codex CLI 0.147（`codex exec --skip-git-repo-check`），内置 image_gen（gpt-image 系），node + sharp 后处理。

## 最终提示词（摘要）

> 查看 art/expansion-previews/02-district-browse.png 匹配风格：柔和田园厚涂、左上暖光、投影落向右下、略俯视 3/4 视角。生成：单棵枝繁叶茂的夏季阔叶树（橡树状），直立，饱满圆冠，底部中央露出短树干。整体孤立在纯平 #ff00ff 品红背景上：无渐变、无地面、无背景投影、无其他物体、无文字、无边框。竖幅构图，树体占满大部分画面。

## 原始文件

- `art/scenic/revision-2/generation-records/raw/env-tree-canopy-raw.png`（1145×1374，品红底原图，与生成文件逐字节一致）

## 后处理

处理脚本：`art/scenic/revision-2/generation-records/process-tree.cjs`（codex 生成，保留作处理记录）。

1. 按到品红 (255,0,255) 的距离计算 alpha（距离 60–160 渐变带），并结合 magenta-excess（min(r−g, b−g)）抑制叶缘紫边。
2. 半透明边缘去品红溢色（despill）：r、b 向 g 收拢。
3. 按 alpha>0 包围盒裁剪（源 bbox (24,27)-(1124,1318)），等比缩放到 348×408，置于 360×480 透明画布 (6,35)，树干底部落在 y≈442（锚点 [0.5,0.92]）。

## 验证（node + sharp）

360×480，RGBA；四角 alpha = [0,0,0,0]；顶部中央树冠 (180,60) alpha = 255（不透明树冠区 5772 像素）；y=440/442 行有不透明树干像素；品红占优不透明像素 = 0。通过。

## 产物

- `art/scenic/revision-2/sources/env-tree-canopy.png`（360×480，对应显示尺寸 180×240，锚点 [0.5,0.92] 树干基部）
