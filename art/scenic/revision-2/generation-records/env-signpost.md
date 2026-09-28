# env-signpost 生成记录

日期：2026-09-28。工具：codex CLI 0.147（`codex exec --skip-git-repo-check`），内置 image_gen（gpt-image 系），Python PIL 12.1 后处理（脚本 `process-env-signpost.py`）。

- 参考图：`art/expansion-previews/02-district-browse.png`（木指示牌风格）与 `art/scenic/revision-2/sources/env-fence.png`（同族木材）。
- 原始图：`art/scenic/revision-2/generation-records/raw/env-signpost-raw.png`（941×1672 RGBA，原样保存；生成器直接输出透明底而非纯绿幕）。
- 成品：`art/scenic/revision-2/sources/env-signpost.png`（240×320 RGBA）。

## 完整 image_gen 提示词英文原文

> Create ONE isolated game-art asset for a 2.5D pastoral farming game, using the attached farm screenshot only as a painterly storybook style reference for its wooden direction signs, and the attached fence image for the matching warm-brown weathered wood material. Portrait composition. A single sturdy UPRIGHT VERTICAL wooden post planted into a tiny tuft of olive/mid-green grass, with exactly ONE blank bare-wood ARROW-SHAPED direction board nailed near the top, pointing to the RIGHT. Its entire broad face must be clean, unmarked wood with subtle natural grain and ample uninterrupted blank area for a game-engine text label. The arrow board is slightly tilted in a gently elevated three-quarter view. Soft hand-painted pastoral illustration, warm sunlight from upper left, delicate wood highlights and soft contact shadow extending lower right, crisp readable silhouette. The signpost occupies most of the vertical frame, but leave open margin above the board and around every side; base rests in lower part. Absolutely NO text, letters, numbers, Chinese characters, glyphs, symbols, icons, painted arrows, carved markings, or watermark anywhere. No second board, extra props, hanging items, people or animals. No background scenery, ground plane, horizon, sky, border, frame, or vignette. The ENTIRE background outside the sign and tiny base grass/contact shadow must be a perfectly flat, uniform, solid pure RGB #00ff00 chroma-key green, without gradient, texture, or lighting variation. Do not use #00ff00 inside the subject; grass should be darker olive/mid green. Keep anti-aliased silhouette edges clean and no green glow.

## 后处理（`generation-records/process-env-signpost.py`，PIL）

- 原图实际为 RGBA 透明背景而非纯绿色；保留原有透明度。低于 16 的微弱 alpha 清零；仅对 `G>190, R<90, B<90` 的不透明色键候选应用距离 30–100 的软 alpha 过渡（本图符合条件的有效像素为 0）；对半透明绿溢出做温和去绿，共 12534 像素。
- 按 alpha≥16 取得裁切框 `(72,148)–(902,1503)`；等比缩放 `0.211070` 至 `175×286`；放置于透明 `240×320` 画布 `(32,8)`，主体底部 y=294。
- Node + sharp：尺寸 `240×320`，RGBA 四通道；四角 alpha 均为 `0`；alpha≥160 的像素 `18221`，占画布 `23.73%`；不透明区域边界 `x=32–206, y=8–292`。人工查看：木牌无文字或符号。
- 已知问题：生成器未遵循纯绿底要求，而是直接输出透明底；无需实际移除绿色背景，成品透明度检查通过。

## 产物

- `art/scenic/revision-2/sources/env-signpost.png`（240×320，对应显示尺寸 120×160，锚点 [0.5,0.92]，柱底即地面接触点）
