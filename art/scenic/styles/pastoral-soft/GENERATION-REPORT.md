# 田园 · 柔绘：素材生成报告

日期：2026-09-29。状态：**50/50 张源图完成，已导入并发布**。本包实现用户选定的 [01 柔和水粉](../../tiles-v1/style-previews/pastoral-soft-options/01-soft-gouache.png)，作为可切换的 `pastoral-soft` 独立风格；旧 `pastoral` 包、玩法和存档均保留。

## A：素材重制

50 项包括 7 张公共母版、草地/田地/院落、15 张道路、14 张河流、2 张桥、农舍与树，以及 4 张作物。逐 ID 的正式文件、来源登记和导入输入分别位于 `sources/`、`records/`、`raw/`。50 张 AI 原稿保存在 `generation-records/originals/`；后续 40 张的实际提示词和参考输入保存在 `generation-records/prompts/`，前 10 张见 [A0 记录](generation-records/A0.md) 与 [草地记录](generation-records/A1-grass.md)。均使用 Codex 内置 `image_gen`；工具未暴露模型名。

处理过程保存在 `generation-records/processed/` 及同目录脚本中。地面源图按契约处理菱形外透明区，物件和作物按锚点、落点及根部处理。A1 检查发现草地重复草簇和明暗拼缝，随后调整草地与公共母版；A2 检查发现道路、水面和桥头接口偏窄或色调不齐，统一材质色调后用 `warp-ground-mouths.mjs` 对齐端口。正式登记采用 `*-mouth-warped.png` 处理结果；`*-edge-harmonized.png` 等保留为未采用的试验稿。

使用正式 `composeGround()` 生成了 [5×5 草地](generation-records/previews/grass-5x5-display.png)、[农舍与田地](generation-records/previews/farm-material-display.png)、[道路](generation-records/previews/road-material-display.png)、[河桥方向一](generation-records/previews/bridge-ur-ll-material-display.png)、[河桥方向二](generation-records/previews/bridge-ul-lr-material-display.png)及道路、河流联系图。它们是**素材拼接预览，非游戏截图**。端口回修后，预览中的直路、转角、桥头连接明显更连贯；草地仍有少量大范围明暗变化。

`npm run tiles:import -- --style pastoral-soft` 成功；`style.json` 已设为 `ready`；`npm run tiles:publish` 将新旧两个包发布至 `assets/resources/art-packs/`。新包 manifest revision：`cb0199bc40f32ee563d3be2d665b14c3277c9953be0a69bbf462f113e5ff0da4`。`npm run build` 成功生成 Web Mobile 构建。

### 实际游戏核对范围

在本地 Web Mobile 游戏的同一存档、同一选中地块“院前田”和未移动的镜头下，从“现有田园”切换至“田园 · 柔绘”。保存了[旧风格游戏截图](generation-records/previews/game-old-style.png)与[新风格游戏截图](generation-records/previews/game-soft-style.png)；浏览器视口为 1281×1188、设备像素比 1。旧包 revision 为 `3ff139dd4844332de285eee073727d040fc1ca65312bcd4033bd4d716ac57646`，新包 revision 如上。截图中草地由密集亮纹变为较平静色面，土路、树和田地换为新素材；浅色未知地块与顶部黑色缺口依旧可见。此处未取得镜头坐标和 zoom 数值。

应用户要求，停止进一步游戏检查。农舍完整视角、实际河桥位置和远近缩放尚未进行游戏内对比；对应素材仅完成离线拼接预览，不能视为这些场景已在游戏里验证。成熟作物也只以素材图核对，没有修改存档或推进农时。

## B：呈现修正

未知区域、文字牌、选择反馈、边缘覆盖和场景布置仍按[重制方案 §7](../../../../docs/scenic-art-refresh-plan.md)留待后续代码任务。A 项素材及游戏内风格切换不代表这些渲染问题已经解决。
