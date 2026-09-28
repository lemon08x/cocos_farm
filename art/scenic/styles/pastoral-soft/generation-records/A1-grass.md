# A1 草地三变体生成记录

日期：2026-09-29。工具：Codex 内置 `image_gen`（模型名未暴露）。三张正式地面图由 AI 独立生成/修订。参考 `target-scene.png`、已接受的草地母版、同组草地变体，以及每个 ID 的 `control.png` / `guide.png`；guide 仅用于理解几何，成品不使用其标注颜色。完整输入顺序见各提示词及下文；实际生成时引用图已作为 `referenced_image_paths` 传入，不只是写在提示词中。

AI 原稿：`generation-records/originals/grass.<n>.png`；废弃初稿保留在 `generation-records/drafts/`。原稿均为 1619×971 RGBA。处理时明确裁剪 `2,1,1615,969`，等比缩到 600×360；`prepare-ground-input.mjs` 只按契约修复菱形透明区与几像素宽的绿色边缘杂色，不重画内部。`tone-align-grass.mjs` 将三张新画的平均 RGB 对齐到 `122,141,84`，局部对比系数 `.75`，无模糊处理。最终登记输入为 `generation-records/processed/grass.<n>-final.png`，正式源图为 `sources/grass.<n>.png`；`records/` 与 `raw/` 保留登记哈希及处理后输入。

重复铺排预览由 `make-preview.mjs` 复用 `tools/tile-art-lib.mjs` 的 `validateSource()` 与 `composeGround()` 生成，输出 `generation-records/previews/grass-5x5-source.png`（3000×1800）和 `grass-5x5-display.png`（1500×900，地面一格 300×180）。**这是素材拼接预览，非游戏截图。** 初稿可见重复草簇与斜向色带；最终回修去掉重复草簇，并降低了公共草地母版的局部对比。当前预览仍保留少量大色块差异，待 A1 其他素材同屏组合时继续观察。

## grass.0

- 参考输入：目标场景参考、edge.grass.x/y、grass.0 control/guide；修订时输入本 ID 先前原稿与已接受母版。
- 最终原稿：`generation-records/originals/grass.0.png`；技术处理：`generation-records/processed/grass.0-final.png`；正式源图：`sources/grass.0.png`。

### 初次生成：grass.0

> Use case: stylized-concept. Generate ONE production source image for Cocos Farm scenic-tiles@1 asset ID grass.0, an isometric GROUND TILE source with exact 5:3 canvas ratio (600×360 target). Image 1 is the selected quiet soft-gouache farm scene for palette and brushwork only. Images 2 and 3 are accepted grass seam masters; their olive/sage material, average tone and low texture density must be matched, especially around the tile perimeter. Image 4 is the flat control image: preserve the exact diamond footprint touching canvas at top midpoint, right midpoint, bottom midpoint and left midpoint. Image 5 is technical guide only; do not reproduce its red edges, labels or dots. Paint a low-contrast continuous olive/sage grass surface throughout the COMPLETE diamond, with broad very soft tonal changes and only 2 or 3 tiny grouped broad-brush grass hints well INSIDE the diamond. Keep the outer seam band quiet, no emblem, no border, no bright rim, no stones, no flowers, no dense individual blades or yellow-white speckles. The diamond is flat on the ground with no side wall, no shadow outside. Outside the diamond must be GENUINELY TRANSPARENT alpha, including all four triangular corners, not black/white/checkerboard. Uniform upper-left soft light without vignette. No text, UI, photo sharpness, pixel art or guide markings. This is a tile material, not a scene illustration.

### 针对性修订：grass.0.final

> Use case: precise-object-edit. Image 1 is the EDIT TARGET: an isometric grass ground-tile diamond on a genuinely transparent background. Image 2 and Image 3 are accepted quiet olive/sage grass seam masters to match texture and average color. Image 4 is a FLAT GEOMETRY CONTROL only: the final diamond must touch top midpoint, right midpoint, bottom midpoint, left midpoint of its 5:3 canvas. Keep the target's calm matte soft-gouache grass design, three sparse broad grass hints and overall low contrast. Repair only technical artifacts: REMOVE every neon/bright green pixel or thin line at the diamond perimeter, fill any faint or transparent holes inside the diamond so it is fully opaque throughout, and retain true transparency outside the diamond. Extend the same painted grass all the way to the diamond edges, with no border or rim. Preserve the exact diamond footprint and flat ground perspective; do not add soil sidewalls, objects, flowers, stones, shadows outside, text, UI, guide marks or checkerboard. Output a 5:3 transparent PNG image.

### 针对性修订：grass.0.quiet

> Use case: precise-object-edit. Image 1 is the EDIT TARGET transparent 5:3 isometric grass diamond. Image 2 and Image 3 are the accepted corner and edge grass masters, definitive quiet matte olive/sage palette and low texture density. Preserve Image 1's exact diamond geometry, full opaque ground inside, genuinely transparent outside, no floating sidewall, and its hand-painted gouache character. REDUCE DETAIL SUBSTANTIALLY throughout the diamond: remove all recognizable upright grass tufts, leaf silhouettes and repeated little plant marks. Replace them with a broad continuous low-contrast olive/sage color plane with only very soft large irregular gouache tonal changes; at mobile tile size the surface should appear calm and almost plain. Match the accepted masters' average color near RGB 121,144,80, especially in the entire outer 10% diamond band, so there is no darker or brighter edge ring. Avoid any central motif, sharp texture, yellow speckles, visible noise, border, neon line, text or UI. Keep the exact 5:3 framing and transparent outer corners.

## grass.1

- 参考输入：grass.0、edge.grass.x/y、grass.1 control/guide；回修时输入草地 0 与 edge.grass.y。
- 最终原稿：`generation-records/originals/grass.1.png`；技术处理：`generation-records/processed/grass.1-final.png`；正式源图：`sources/grass.1.png`。

### 初次生成：grass.1

> Use case: stylized-concept. Generate ONE new Cocos Farm scenic-tiles@1 isometric ground source, asset ID grass.1, transparent PNG with exact 5:3 canvas and diamond footprint touching canvas midpoints. Image 1 is accepted grass.0 tile, material/palette/scale reference ONLY: create a compatible but distinct interior arrangement, not a clone or rotation. Images 2 and 3 are accepted grass interface masters; match their low-contrast olive/sage edge color. Image 4 is flat diamond control for footprint; Image 5 is technical guide only, do not reproduce guide marks or flat colors. Fill the whole flat diamond with quiet matte soft-gouache grass, same average brightness and temperature as grass.0, but change broad gentle patches and place 1 or 2 sparse grouped brushstroke grass hints at different interior positions. Keep perimeter simple and uniform for seam blending. No central emblem, busy tiny blades, evenly scattered flowers, yellow speckles, dark vignette, tile border or floating soil sidewall. Outside the diamond must be genuinely transparent alpha; inside fully opaque and colored all the way to the edge. No text, UI, photo texture, pixel art or checkerboard. Designed to mix with grass.0 without checkerboard brightness.

### 针对性修订：grass.1.quiet

> Use case: precise-object-edit. Image 1 is the EDIT TARGET transparent grass.1 diamond. Image 2 is the newly accepted quiet grass.0 diamond, definitive material and visual density reference. Image 3 is accepted grass edge master, definitive perimeter palette. Preserve Image 1's 5:3 canvas, exact flat diamond geometry, full painted inside / genuine transparent outside, and distinct broad irregular tonal patch arrangement. Substantially REDUCE detail to match Image 2: remove both recognizable upright grass tufts, little leaf silhouettes and fine decorative texture. Replace with broad low-contrast matte gouache olive/sage color planes, only subtle soft mottling. Keep average color and brightness close to Image 2 and the edge master, no center emblem, no bright edge ring, no checkerboard variation, no sidewall, text, UI, photo sharpness or pixel art. Keep this variant's internal patches different from grass.0 without making a recognisable repeated motif.

## grass.2

- 参考输入：grass.0/1、edge.grass.x、grass.2 control/guide；回修时输入草地 0/1。最后一次过暗的调色候选未采用，保存在 drafts/grass.2-too-dark.png。
- 最终原稿：`generation-records/originals/grass.2.png`；技术处理：`generation-records/processed/grass.2-final.png`；正式源图：`sources/grass.2.png`。

### 初次生成：grass.2

> Use case: stylized-concept. Generate ONE new Cocos Farm scenic-tiles@1 isometric ground source, asset ID grass.2, transparent PNG on exact 5:3 canvas with a flat diamond touching all four canvas midpoints. Image 1 is accepted grass.0; Image 2 accepted grass.1; both are palette, brush scale, alpha-footprint and brightness references, but this third tile needs a distinct quieter arrangement rather than a copy/rotation. Image 3 is accepted grass edge master, match the grass color at the perimeter. Image 4 is geometric control only; Image 5 technical guide only, no visible marks. Fill COMPLETE diamond with calm matte soft-gouache olive/sage grass at same average tone and color temperature as grass.0 and grass.1. Use broad subtle low-contrast patches and at most one or two very small clustered broad-brush grass hints placed differently from the first two tiles; no central emblem. Preserve simple consistent edges for seam blending. Genuinely transparent outside the diamond, fully opaque painted surface inside, no bright outline, no side wall. Avoid dense individual blades, evenly scattered flowers, yellow-white highlights, stones, shadow outside, words, UI, guide marks, checkerboard, photo sharpness or pixel art.

### 针对性修订：grass.2.final

> Use case: precise-object-edit. Image 1 is the EDIT TARGET, grass.2 transparent diamond ground tile. Images 2 and 3 are grass.0 and grass.1 companions for matching average olive/sage tone and brush scale. Keep Image 1's exact 5:3 canvas, flat isometric diamond touching four midpoints, genuine transparent outside, painted grass inside, matte soft-gouache palette and broad low-contrast texture. Change ONLY the interior motif: remove the two distinct upright grass tufts so this third variant has NO recognizable tuft at those same positions as the companions. Replace them with very subtle broad irregular color patches and perhaps one tiny indistinct low-contrast cluster well away from the center. The tile must look calm when repeated and mixed with the other two, with similar average brightness, no central emblem or busy details. Keep the entire inner diamond opaque and the outer region transparent; no green rim, border, sidewall, text, UI or photo sharpness.

### 针对性修订：grass.2.quiet

> Use case: precise-object-edit. Image 1 is the EDIT TARGET grass.2 transparent isometric diamond. Images 2 and 3 are the newly accepted quiet grass.0 and grass.1 variants; match their muted olive/sage average color, soft gouache brushwork, very low information density and exact 5:3 diamond geometry. Keep Image 1's broad patch arrangement distinct but REDUCE the small leafy motifs and bright flecks until nearly all of the tile reads as a continuous calm color plane. Remove the visible small clump near the upper-left interior. Preserve gentle large-scale color variation and the same average brightness as the accepted two variants; do not become a flat digital fill. Fully opaque grass inside the diamond, truly transparent outside, quiet matching outer band, no bright outline, border, central emblem, sidewall, text, UI, photo look or pixel art. Do not clone either companion variant.

### 未采用的调色候选：grass.2.palette

> Use case: precise-object-edit. Image 1 is the EDIT TARGET grass.2 quiet olive/sage diamond. Image 2 is accepted grass.0 diamond and the DEFINITIVE color/brightness reference. Preserve Image 1's 5:3 transparent diamond, broad subtle patch layout, soft matte gouache paint and no visible plant objects. Change ONLY overall grass palette: Image 1 is currently too light and yellow-gray; gently darken its red and blue components and match Image 2's average ground tone (approximately RGB 122,139,82), across the center and especially the interior near all four diamond edges. Keep broad low contrast and distinct patch arrangement. Do not add texture, tufts, plants, flowers, vignette, dark rim, border, text, UI or sidewall. Maintain fully opaque painted diamond interior and transparent outer corners.
