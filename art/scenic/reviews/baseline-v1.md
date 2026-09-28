# 农场场景第一版（田格手账 fieldbook）基线记录

日期：2026-09-28。用途：`docs/farm-scene-v2-plan.md` P0 阶段基线，供第二版整改后按同一输入复核旧版表现。

## 截图清单

| 文件 | 视口（CSS px，deviceScaleFactor=1） | 状态 |
| --- | --- | --- |
| `baseline-v1-390x844.png` | 390×844（移动仿真） | 已捕获，390×844，约 643 KB |
| `baseline-v1-430x932.png` | 430×932（移动仿真） | 已捕获，430×932，约 732 KB |
| `baseline-v1-desktop-720x1280.png` | 720×1280（桌面竖屏，设计尺寸） | 已捕获，720×1280，约 1.5 MB |

三张截图均为同一新局首屏，内容一致：顶部日期卡与三个资源胶囊、矩形田格地图、底部田况卡与四入口导航。无待补视口。

## 基线状态

- 构建：`build/web-mobile/` 与当前源码一致（`node tools/build-state.mjs` 指纹匹配，未重新构建）。
- 存档：全新浏览器档案（localStorage 为空）开局，游戏自动创建并保存新局。
- 选中地块：`p2q2`（`HOME_PLOT_ID`，kind=`field`），首屏以绿色描边框显示，但贴图被房屋图覆盖（`boardTileSlot()` 将 p2q2 映射为房屋，即方案 §1 记录的已知问题）。
- 镜头默认值（`assets/scripts/FarmDemo.ts:22`）：`panX=0`、`panY=0`、`zoom=.82`、`district={x:0,y:0}`；双指缩放时围绕 +80 的纵向地图偏移做比例换算（`FarmDemo.ts:70`：`this.panY=(this.panY+80)*ratio-80`）。缩放范围 0.65～1.8。
- 美术风格：未设置偏好，默认 `fieldbook`。

## 复现步骤

1. `node tools/serve.mjs`（或 `npm start`），确认 http://127.0.0.1:4328/ 返回 200。
2. 使用全新浏览器档案打开页面，或在 DevTools 执行
   `localStorage.removeItem('shanju.cocos.farm.v1'); localStorage.removeItem('shanju.cocos.art.v2'); location.reload();`
3. 等待约 10 秒让资源加载与首帧稳定，不做任何拖动/缩放/点击，即为基线首屏。
4. 一键复现截图：`node tools/screenshot-baseline.mjs`（无头 Chrome/Edge + CDP，每次运行使用临时全新档案；可用 `CHROME_PATH`、`BASELINE_URL`、`BASELINE_SETTLE_MS` 覆盖）。

无需手动播种 localStorage：新局由 `FarmCore.start(undefined)` 确定性生成（核心随机状态存于存档内），同一版本代码下同一输入得到同一田况。

## localStorage 键与偏好

| 键 | 含义 | 基线值 |
| --- | --- | --- |
| `shanju.cocos.farm.v1` | 游戏存档（`FarmDemo.ts:12` 的 `SAVE`） | 新局 JSON，见下节 |
| `shanju.cocos.art.v2` | 美术风格偏好（`STYLE`） | 未设置 → 默认 `fieldbook` |
| `shanju.cocos.farm.v1.backup.<时间戳>` | 「备份并新开」留下的旧档备份 | 基线无 |

第二版规划的新键 `shanju.cocos.world.v1`（地图版本偏好）尚未实现，基线中不存在。

## 美术资源包

`assets/resources/art-packs/index.json` 目录（`ArtPack.catalog()`）：

| id | 名称 |
| --- | --- |
| `fieldbook` | 田格手账 · 新版（基线默认） |
| `qinghe` | 清和田院 · 连续场景 |
| `paper` | 田园 · 浅纸 |
| `dusk` | 暮色 · 配色示意 |
| `custom` | 自定义 · 替换这里 |

`art-packs/scenic/` 目录已存在但为空（第二版专用图集尚未制作）。fieldbook 清单含 `board.home`（board-home.png）及 icon 组：`field calendar basket more back close next leaf coin food pressure`（见 `tools/test-ui.mjs` 断言）。

## 存档 JSON 结构

`core.save()` 顶层键：`state`、`record`。

- `state`：`story, schemaVersion, clock, status, ap, world, location, household, persons, assets, projects, knowledge, randomState, production, economy, life, socialFood, electric, sect, era`
- `record`：`format, formatVersion, manifest, entries`

观察对象（`FarmCore.start()` 返回值）顶层键：`runId, revision, game, recentEvents, eraSettlements`。新局 `revision=0`，`game.rulesVersion=0.27.0`。

## 行为事实（供 parity 测试依赖，经 `core/bridge.ts` 实测）

- 新局地块总数 **63**（7 个 3×3 单元 × 9；含中心单元与四向边界单元）。
- 中心单元九块：`p1q1 wild`、`p2q1 wild`、`p3q1 wild`、`p1q2 story`、`p2q2 field`、`p3q2 story`、`p1q3 wild`、`p2q3 story`、`p3q3 wild`；其余 54 块为 `unknown`。
- 初始资源：`game.family.money=8`（钱）、`game.economy.foodTotal=6`（口粮）、`game.life.person.pressure=0`（压力）。
- 初始日期：`第1年 · 甲辰年正月初一 · 上午`，节气 `立春`，天气 `晴和`，`absoluteDay=0`。
- 新局存在启用的计划行动 `economy:plotplan:p2q2-add-2024-wheat0`；执行后不推进日期，待办数 **2**（`sow` + `harvest`）。
- 西向边界行动 `economy:farmexplore:p0q2` 新局可用；探索后生成 `p-1q2` 所在单元的 9 块新田。

## 首屏观察内容（三张截图一致）

- 顶部：日期卡「正月初一 · 立春」（带农历按钮），右侧三个资源胶囊「钱 8」「口粮 6」「压力 0」。
- 地图：正向矩形田格，中心为覆盖 p2q2 的房屋贴图（带绿色选中描边）；房屋左侧一块水面/溪涧贴图，下方一块树木贴图；其余可见为草地/荒地纹理；横向水渠与桥在画面上部，纵向水渠在右侧，渠上有小木桥。
- 底部田况卡：缩略图（房屋图，即 p2q2 槽位贴图）+「院前田 / 空田 · 水分适宜」+「查看农事」主按钮。
- 底部导航四入口：田地、农历、仓储、更多（细线图标 + 文字）。

## 备注

- 截图使用桌面 Chrome 无头模式（SwiftShader 软件渲染 WebGL），画面与真机可能存在抗锯齿/字体细节差异；构图、布局和内容一致。
- 复核旧版时须使用同一构建状态的源码；若源码已变更，先按 `node tools/build-state.mjs` 检查并重建，再按上节步骤截图对比。
