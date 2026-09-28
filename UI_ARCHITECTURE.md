# 当前 UI 架构

当前默认主场景为 scenic revision-2「田园场景」。旧用户场景偏好一次性迁移到 scenic，后续主动选择仍保留；游戏存档不变。后续地图与逻辑以此主场景为基准，实施问题及处理顺序见 [主场景后续方案](docs/scenic-main-scene-followup.md)。

本 Demo 使用运行时生成的 Cocos UI。农业规则、行动成本与存档格式保持原有接口；展示层只读取公开观察并提交行动 ID。

## 页面与交互

- 主屏四入口：农事、仓储、农历、更多。顶部展示日期、钱、口粮、压力和待办提示；底部田况卡明确显示选中田地。
- 点击地图只选田，保留场景观察；田块轮廓与名称标明选中位置。农事按钮再打开行动列表。
- 行动按当前可用性排序，每页三行，保留操作动词、耗时、压力和条件入口。
- 农历条目直接进入选中田地的作物安排；已有计划或不可安排时提供计划/选田入口。
- 待办完整分页，显示任务、日期及未到期/可执行/缺少条件/已过期。点任务选择对应田地并进入处理页。
- 所有行动仍需确认。任务入口额外验证任务日期、条件和实际操作类型，防止共享 farmplot 命令把未来收获误当成当前播种或照料。
- 执行完成显示实际日期、资源、库存与田况变化，并提供继续待办/继续操作入口。
- 返回保留页面节点、分页、滚动位置与选田上下文；关闭退出整条面板流程。成功执行后销毁旧页面，避免旧报价残留。

## 模块职责

| 模块 | 职责 |
| --- | --- |
| FarmDemo.ts | 会话协调、页面入口、读取观察、提交命令、保存与风格切换 |
| view/FarmHud.ts | 常驻 HUD；更新文字，不在每次选田或刷新时重建节点 |
| view/PanelStack.ts | 页面栈、返回、同页分页替换、选田上下文恢复与销毁 |
| view/FarmPresentation.ts | 玩家名称、行动展示、规则说明清理、待办状态与操作匹配检查 |
| view/UiKit.ts | 共用文字、按钮、拖动取消点击、可滚动长文本 |
| view/FarmWorldView.ts | 兼容入口，委托 view/world/current 实现；地图增量刷新、命中、边界与选中标签 |
| view/world/WorldViewRegistry.ts | 场景版本注册表（current=田格手账，scenic=田园场景），切换只重建视图层 |
| art/ArtRenderer.ts / ArtPack.ts | 风格资源、图片和底板渲染、资源生命周期 |
| FarmCore / core/bridge.ts | 沿用 submitCommand → transition → observeSession 的规则调用链 |

## 田园场景（scenic，第二版）

第二版地图表现经 WorldViewRegistry 注册为 `scenic`，由「更多 → 场景版本」切换；切换只重建视图层，规则、存档与页面栈不动。几何约定：逻辑坐标 → 世界像素 `wx=(x−y)·150`、`wy=(x+y−4)·90`（p2q2 在原点）；地面单元菱形 300×180，地块耕作四边形 228×142，两者之间为道路/田埂/河岸环境带；河流只经共享边中点衔接，不走角点。v1 的固定 2:1、260×130 菱形与角点连接约定已废弃。

| 模块 | 职责 |
| --- | --- |
| view/world/scenic/ScenicProjection.ts | 投影、单元菱形/地块四边形、边中点端口、线段与多边形纯几何 |
| view/world/scenic/ScenicLayout.ts | 地块排布、默认镜头、缩放/拖动约束与分区中心 |
| view/world/scenic/ScenicRegionLayout.ts | 院落、河流链、环路、树冠等环境区域的单元占用模型 |
| view/world/scenic/ScenicLayoutValidation.ts | 布局离线校验（房屋/河流/桥/道路/树冠），供回归测试使用 |
| view/world/scenic/ScenicHitTest.ts | 世界坐标 → 地块命中（四边形判定，环境带不命中） |
| view/world/scenic/ScenicWorldView.ts | 分层渲染（地面/雾/河流/地块/道路/环境/叠加）、镜头、focusPlot 与选中脉冲 |
| view/world/scenic/ScenicChunkStore.ts | 环境装饰按块确定性生成、可见性缓存与释放 |
| view/world/scenic/ScenicMinimap.ts | 分区缩略图模型与质心缩放 |
| view/world/scenic/ScenicArtPack.ts | scenic 美术包与调色板加载（assets/resources/art-packs/scenic） |
| view/hud/ScenicHud.ts | 田园 HUD：日期资源条与选中田卡 |
| view/hud/DistrictNavigator.ts | 分区导航：缩略图、分区切换与收起 |
| presentation/FarmViewModel.ts | HUD 视图模型；新增 fieldShort 与 todoBadge 供田园 HUD 使用 |

## 布局与可读性

以 720 为设计宽度，启动时按竖屏视口比例扩展设计高度；桌面横向窗口保留竖屏画幅。HUD 按顶部/底部定位，读取 Cocos 安全区并保留基础边距。手机浏览器中的系统刘海行为仍需真机确认。

主体文字使用 26–32 设计单位，辅助文字最低 24；不再靠无限缩小字体适应内容。长条件、规则说明、记事和结果放在可滚动区域。不同风格共享同一交互结构。

当前仍是代码组件，不是编辑器 Prefab。迁移 Prefab 可作为后续美术工作流改进，不是运行此版本的前置条件。尚未进行 Android/iOS 真机性能和屏幕旋转验收。

## 验证

- `npm run test:ui`：真实核心的新局计划/日期/存档往返，任务日期与操作类型保护，返回栈与分页上下文，规则文案保留。
- `tsconfig.ui.json`：面向 Cocos UI 脚本的 TypeScript 检查配置，使用 Creator 自带 TypeScript 与项目生成声明。
- `npm run build`：生成 Web Mobile 版本。
- `node tools/verify-scenic-r2.mjs`：田园场景第二版冒烟检查（需 `npm start` 运行中）；无头浏览器验证 scenic 启动、投影/镜头/命中、美术包 HTTP 200 与渲染异常，并输出 720×1280 首屏截图到 `art/scenic/revision-2/screenshots/`。

浏览器交互验证使用独立端口 4329 的测试存档，不改动常用 4328 端口的玩家存档。
