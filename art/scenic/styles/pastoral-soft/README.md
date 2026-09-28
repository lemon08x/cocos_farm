# 田园 · 柔绘：按 01 柔和水粉执行

用户于 2026-09-29 选择 [01 柔和水粉](../../tiles-v1/style-previews/pastoral-soft-options/01-soft-gouache.png)。本目录为 `pastoral-soft` 独立风格草稿，`style.json` 固定色板、笔触与排除项；`generation-records/references/target-scene.png` 是概念参考副本。它只指导色彩、形体和细节疏密，不定义地图布局，也不是可直接导入的图块。

完整制作与验证依据：[田园场景美术重制方案](../../../../docs/scenic-art-refresh-plan.md)；几何、四边接口、占地和落点以 `core/src/game/scene/tile-art.ts` 和本目录 `jobs/<素材ID>/job.json` 为准。`index.html` 可浏览全部 50 个任务的技术模板与提示词。实际生成工具必须收到参考图片、当前 ID 的 `control.png` 和 `guide.png`；提示词里写出路径不能代替传图。

## 固定的美术判断

- 背景草地是连续、低对比的橄榄绿与鼠尾草绿色面；只在少数局部画宽笔触草簇。三张变体同一底色与明暗范围，不出现重复徽记或棋盘格。
- 农舍、田、作物是画面主体。树叶按叶团组织，土路为暖灰土色，河水为克制青绿面；统一左上光和右下短柔影。
- 参考图中的四块田、两座桥和远山只说明画风。正式图片按任务模板分别生成，不把整张概念图裁切成图块。
- 界面雾、文字牌、边缘覆盖和场景布置属于方案 B 项；独立图片包完成后仍须单独实施。

## 制作顺序

1. 用选定参考做草地与路面小型材质研究。确认正常游戏缩放下背景平静、田地和农舍先被看见。研究图不计入正式 50 项。
2. A0：先生成 `edge.grass.x/y`、`edge.road.x/y`、`edge.river.x/y`、`corner.grass` 七张公共母版，检查色温、中心贯通和边角材质一致。
3. A1：生成三张草地、干湿田、院落、直路/转弯/十字路口、房屋、树与小麦幼苗，共 12 张。用本风格母版和现有合成函数制作草地连续铺排、道路连接、院前局部组合预览；发现噪点、亮环或不接地即修正。此时保持 `draft`，不导入或发布半包。
4. A2：按任务目录补齐其余 31 项，逐项保留原始 AI 图、实际提示词、输入参考、裁剪/抠图步骤和登记记录。相邻道路、河流、桥梁须在同一缩放下检查端口。
5. 50 项齐全后执行 `npm run tiles:import -- --style pastoral-soft`。通过后才将 `status` 设为 `ready`，运行 `npm run tiles:publish`，并在同一游戏状态与镜头下核对旧包和新包。

当前进度：风格选择、概念参考、配色及 50 份技术任务已准备；A0 七张公共母版及 A1 三张草地变体已生成并登记，正式源图 `10/50`。见 [A0 来源记录](generation-records/A0.md)、[草地来源记录](generation-records/A1-grass.md) 与 [阶段报告](GENERATION-REPORT.md)。A1 其余样板和 A2 尚未制作，尚未完整导入、发布或进行游戏视觉核对。

常用命令：

```powershell
npm run tiles:status -- --style pastoral-soft
npm run tiles:normalize -- <素材ID> <图片路径> --style pastoral-soft --generator "实际工具及模型"
npm run tiles:import -- --style pastoral-soft
npm run tiles:publish
```

每次 `normalize`、`import` 都显式指定 `--style pastoral-soft`。修改 `generation.description`、参考或排除项后，先重新执行 `npm run tiles:prepare -- --style pastoral-soft`，并按工具要求重新登记受影响素材。
