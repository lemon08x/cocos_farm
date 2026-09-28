# 田园 · 柔绘：三种风格概念预览

根据 `docs/scenic-art-refresh-plan.md`（提交 `dfe55db`）制作，2026-09-29。三图使用同一农舍、院落、田地、道路与河流构图，比较笔触、颜色和信息密度。用户已选择 `01-soft-gouache.png`。这些图不是游戏截图、拼接样板或可导入的图块；`pastoral-soft` 已建立草稿和技术模板，尚未发布。

| 文件 | 方向 | 对应方案的观察点 |
| --- | --- | --- |
| `01-soft-gouache.png` | 柔和水粉 | 暖灰土路、橄榄绿平静草面、青绿河水，主体轮廓清楚 |
| `02-airy-watercolor.png` | 清润淡彩 | 更轻透、低对比的背景和纸面感；需核对小屏幕主体识别度 |
| `03-warm-storybook.png` | 温暖绘本 | 更明确的大形和暖光；需避免后续素材把细节加满地面 |

生成方式：Codex 内置 `image_gen`。`01` 使用 `../farmstead/03-warm-gouache.png` 作为**构图参考**；`02` 和 `03` 使用 `01` 作为构图参考进行风格变化。工具未向本次调用暴露模型名。原始生成图保留在 Codex 的 `generated_images` 目录；本目录为未经二次加工的副本。

共同提示要点：等距农场游戏概念画面；农舍与夯土院落位于左上，田地居中，土路连接，右侧青绿河水与木桥，外围成组植被。草地采用低对比连续色面，细节集中于农舍、作物和少数植被，左上光与右下短柔影。避免文字、UI、像素画、照片质感、密集细草、平均撒点、硬边接缝、悬浮厚土台。生成时要求保持相同镜头和场景布局，方便比较三种风格。

风格提示词：

- `01`：quiet soft matte gouache; sage and olive grass `#839765` / `#617650`; rounded readable shapes, grouped brushwork, moderate saturation; restrained teal creek and softly blended road shoulders.
- `02`：airy translucent watercolor, restrained dry brush, warm off-white paper texture; desaturated blue-green creek, light warm-gray soil road, sparse linework on major forms; retain enough subject contrast at mobile scale.
- `03`：warm storybook matte gouache with subtle colored-pencil contours; slightly bolder large shapes, sunny ochre earth, muted olive grass and gentle teal water; concentrate detail at subjects while keeping broad calm background areas.

生成结果保留了参考图里的四块田和两座小桥，因此画面展示构图及材质倾向，不代表新风格包最终地图布局或现有游戏状态。正式素材需按 `scenic-tiles@1` 契约单张制作、拼接及运行验证。
