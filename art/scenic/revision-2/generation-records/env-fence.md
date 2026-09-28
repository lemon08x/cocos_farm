# 木栅栏素材生成记录

- 工具与模型：内置 `image_gen.imagegen`；工具未返回模型标识。
- 原始图：`art/scenic/revision-2/generation-records/raw/env-fence-raw.png`，1846×852 RGBA，原样复制。
- 成品：`art/scenic/revision-2/sources/env-fence.png`，520×120 RGBA。
- 处理脚本：`art/scenic/revision-2/generation-records/process-env-fence.py`。保留原生 alpha；alpha≤3 或 G>190、R<90、B<90 的像素置透明；alpha<80 的浅绿边缘渐变降 alpha，alpha<200 的强绿边缘轻度去溢色。以 alpha≥8 检测主体框 (0,260,1846,611)，Lanczos 等比缩为 512×97，合成至透明画布 (4,2)，主体框到 (4,2,516,99)。
- 验证（node + sharp）：520×120、4 通道；四角 alpha [0,0,0,0]；alpha≥200 像素 22533，占 36.11%；全部通过。
- 已知问题：尽管提示要求纯 `#00ff00` 底，内置工具直接返回透明背景；少量极低 alpha 的纯绿边缘像素已在抠图时清除。左右轨道接近边缘（各 4 px），不保证跨实例纹理完全连续。

## 完整 image_gen 提示词英文原文

~~~text
Create ONE isolated reusable game-art asset: a rustic low wooden fence segment for a 2.5D pastoral farming game. Use the supplied images ONLY as style reference: match the wooden courtyard fence family around the homestead, with painterly soft pastoral storybook rendering, warm upper-left sunlight, soft lower-right shadows, a slightly elevated three-quarter view, and weathered chestnut-brown wood with subtle hand-painted grain.

Subject and structure: FOUR or FIVE rough round/rough-hewn short vertical wooden posts, distributed evenly INSIDE the frame, and TWO continuous horizontal wooden rails. The rails run all the way from the exact LEFT frame edge to the exact RIGHT frame edge and are cut off by the frame, so identical segments can chain seamlessly; no post exactly on either edge. The fence is one straight nearly horizontal run across the entire very wide canvas, with only a SLIGHT oblique/isometric slant: right end very slightly lower than left, not a zigzag or corner. A few very tiny olive or mid-green grass tufts and subtle compact contact shadows ONLY at the post bases. Fence top/posts occupy roughly the middle vertically, with generous empty area above and some empty area below the post bases. The whole object should remain readable at 520x120 pixels.

Background: one PERFECTLY UNIFORM FLAT PURE #00ff00 chroma-key green across every pixel outside the fence, absolutely no gradient, texture, vignette, ground plane, sky, environmental scene, or shadows extending far from the post bases. Crisp silhouette edges for clean keying. NEVER use pure #00ff00 within the wood, grass, or shadow.

Composition: panoramic extra-wide aspect ratio near 13:3, one fence segment only. No gate, scenery, dirt platform, walkway, extra props, animals, typography, text, letters, numbers, UI, logo, watermark, border, or frame.
~~~
