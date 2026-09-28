# tiles-v1 图片生成报告

日期：2026-09-29。此报告对应 `docs/tile-art-generation-requirements.md` 的 50 个任务。

## 交付与导入

- 正式源图：**50/50**；43 张渲染素材与 7 张公共接缝母版齐全。
- 方式：47 张使用 Codex 内置 `image_gen` 新生成，3 张沿用 revision-2 的 AI 原稿并调整透明画布。实际模型名称未由工具暴露。
- 最终导入：`npm run tiles:import` 成功；输出 `build/tile-art/scenic-tiles-1790614039139/`，含 43 张 PNG 与 `manifest.json`。此目录被 Git 忽略；从本目录保存的源图和记录可重新导入。
- 新素材尚未替换运行时 revision-2；SceneCell 地图和渲染接入属于后续工作。
- 原始美术目标：`art/expansion-previews/02-district-browse.png`。任务几何来自各 `jobs/<id>/control.png` / `guide.png`，未把参考 UI 画入素材。
- 素材总览：[contact-sheet.png](previews/contact-sheet.png)；正式导出素材拼接预览：[assembly-preview.png](previews/assembly-preview.png)。两者都是素材预览，不是游戏运行画面。

## 来源与处理

- 每个 ID 的生成/复用原稿保存在 `generation-records/originals/<id>.png`；对应 SHA-256、具体加工和参考路径在 `generation-records/<id>.json`。
- 内置工具最终生成调用与提示词构造保存在 [generation-calls.json](generation-records/generation-calls.json)；逐任务技术提示词仍在 `jobs/<id>/prompt.txt`。重出图时应同时使用原始美术目标、control 与 guide。
- `generation-records/process-generated.mjs` 可复现等比裁剪、透明补边、图像蒙版和 AI 材质合成。所有地面彩色像素来自生成图或 AI 草地母版，代码不绘制正式材质。
- `raw/<hash>.png` 是 `tiles:normalize` 输入备份，`sources/<id>.png` 为标准源图，`records/<id>.json` 为工具哈希/规格记录。

## 逐项清单

下表路径均相对本目录。生成原图路径一律为 `generation-records/originals/<id>.png`；处理细节路径一律为 `generation-records/<id>.json`。

| ID | 方式 | 生成/复用原图 | 标准源图 | normalize 记录 | 缺失 | 已知偏差 |
|---|---|---|---|---|---|---|
| `grass.0` | 新生成 | `generation-records/originals/grass.0.png` | `sources/grass.0.png` | `records/grass.0.json` | 无 | 大面积重复铺设时草簇节奏较规律 |
| `grass.1` | 新生成 | `generation-records/originals/grass.1.png` | `sources/grass.1.png` | `records/grass.1.json` | 无 | 大面积重复铺设时草簇节奏较规律 |
| `grass.2` | 新生成 | `generation-records/originals/grass.2.png` | `sources/grass.2.png` | `records/grass.2.json` | 无 | 大面积重复铺设时草簇节奏较规律 |
| `field.dry.0` | 新生成 | `generation-records/originals/field.dry.0.png` | `sources/field.dry.0.png` | `records/field.dry.0.json` | 无 | 干湿两幅田埂和犁沟位置只近似对应 |
| `field.wet.0` | 新生成 | `generation-records/originals/field.wet.0.png` | `sources/field.wet.0.png` | `records/field.wet.0.json` | 无 | 干湿两幅田埂和犁沟位置只近似对应 |
| `courtyard.0` | 新生成 | `generation-records/originals/courtyard.0.png` | `sources/courtyard.0.png` | `records/courtyard.0.json` | 无 | 院落石土纹理与相邻草地有轻微色差 |
| `road.end.ul` | 新生成 | `generation-records/originals/road.end.ul.png` | `sources/road.end.ul.png` | `records/road.end.ul.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.end.ur` | 新生成 | `generation-records/originals/road.end.ur.png` | `sources/road.end.ur.png` | `records/road.end.ur.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.turn.ul-ur` | 新生成 | `generation-records/originals/road.turn.ul-ur.png` | `sources/road.turn.ul-ur.png` | `records/road.turn.ul-ur.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.end.lr` | 新生成 | `generation-records/originals/road.end.lr.png` | `sources/road.end.lr.png` | `records/road.end.lr.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.straight.ul-lr` | 新生成 | `generation-records/originals/road.straight.ul-lr.png` | `sources/road.straight.ul-lr.png` | `records/road.straight.ul-lr.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.turn.ur-lr` | 新生成 | `generation-records/originals/road.turn.ur-lr.png` | `sources/road.turn.ur-lr.png` | `records/road.turn.ur-lr.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.tee.ul-ur-lr` | 新生成 | `generation-records/originals/road.tee.ul-ur-lr.png` | `sources/road.tee.ul-ur-lr.png` | `records/road.tee.ul-ur-lr.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.end.ll` | 新生成 | `generation-records/originals/road.end.ll.png` | `sources/road.end.ll.png` | `records/road.end.ll.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.turn.ul-ll` | 新生成 | `generation-records/originals/road.turn.ul-ll.png` | `sources/road.turn.ul-ll.png` | `records/road.turn.ul-ll.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.straight.ur-ll` | 新生成 | `generation-records/originals/road.straight.ur-ll.png` | `sources/road.straight.ur-ll.png` | `records/road.straight.ur-ll.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.tee.ul-ur-ll` | 新生成 | `generation-records/originals/road.tee.ul-ur-ll.png` | `sources/road.tee.ul-ur-ll.png` | `records/road.tee.ul-ur-ll.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.turn.lr-ll` | 新生成 | `generation-records/originals/road.turn.lr-ll.png` | `sources/road.turn.lr-ll.png` | `records/road.turn.lr-ll.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.tee.ul-lr-ll` | 新生成 | `generation-records/originals/road.tee.ul-lr-ll.png` | `sources/road.tee.ul-lr-ll.png` | `records/road.tee.ul-lr-ll.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.tee.ur-lr-ll` | 新生成 | `generation-records/originals/road.tee.ur-lr-ll.png` | `sources/road.tee.ur-lr-ll.png` | `records/road.tee.ur-lr-ll.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `road.cross.ul-ur-lr-ll` | 新生成 | `generation-records/originals/road.cross.ul-ur-lr-ll.png` | `sources/road.cross.ul-ur-lr-ll.png` | `records/road.cross.ul-ur-lr-ll.json` | 无 | 路肩草纹与公共母版存在细微过渡 |
| `river.end.ul` | 新生成 | `generation-records/originals/river.end.ul.png` | `sources/river.end.ul.png` | `records/river.end.ul.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.end.ur` | 新生成 | `generation-records/originals/river.end.ur.png` | `sources/river.end.ur.png` | `records/river.end.ur.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.turn.ul-ur` | 新生成 | `generation-records/originals/river.turn.ul-ur.png` | `sources/river.turn.ul-ur.png` | `records/river.turn.ul-ur.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.end.lr` | 新生成 | `generation-records/originals/river.end.lr.png` | `sources/river.end.lr.png` | `records/river.end.lr.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.straight.ul-lr` | 新生成 | `generation-records/originals/river.straight.ul-lr.png` | `sources/river.straight.ul-lr.png` | `records/river.straight.ul-lr.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.turn.ur-lr` | 新生成 | `generation-records/originals/river.turn.ur-lr.png` | `sources/river.turn.ur-lr.png` | `records/river.turn.ur-lr.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.tee.ul-ur-lr` | 新生成 | `generation-records/originals/river.tee.ul-ur-lr.png` | `sources/river.tee.ul-ur-lr.png` | `records/river.tee.ul-ur-lr.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.end.ll` | 新生成 | `generation-records/originals/river.end.ll.png` | `sources/river.end.ll.png` | `records/river.end.ll.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.turn.ul-ll` | 新生成 | `generation-records/originals/river.turn.ul-ll.png` | `sources/river.turn.ul-ll.png` | `records/river.turn.ul-ll.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.straight.ur-ll` | 新生成 | `generation-records/originals/river.straight.ur-ll.png` | `sources/river.straight.ur-ll.png` | `records/river.straight.ur-ll.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.tee.ul-ur-ll` | 新生成 | `generation-records/originals/river.tee.ul-ur-ll.png` | `sources/river.tee.ul-ur-ll.png` | `records/river.tee.ul-ur-ll.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.turn.lr-ll` | 新生成 | `generation-records/originals/river.turn.lr-ll.png` | `sources/river.turn.lr-ll.png` | `records/river.turn.lr-ll.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.tee.ul-lr-ll` | 新生成 | `generation-records/originals/river.tee.ul-lr-ll.png` | `sources/river.tee.ul-lr-ll.png` | `records/river.tee.ul-lr-ll.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `river.tee.ur-lr-ll` | 新生成 | `generation-records/originals/river.tee.ur-lr-ll.png` | `sources/river.tee.ur-lr-ll.png` | `records/river.tee.ur-lr-ll.json` | 无 | 水面和河岸与公共母版存在局部亮度过渡 |
| `bridge.ul-lr` | 新生成 | `generation-records/originals/bridge.ul-lr.png` | `sources/bridge.ul-lr.png` | `records/bridge.ul-lr.json` | 无 | 桥边石块/花草偏密，水面接缝有亮度过渡 |
| `bridge.ur-ll` | 新生成 | `generation-records/originals/bridge.ur-ll.png` | `sources/bridge.ur-ll.png` | `records/bridge.ur-ll.json` | 无 | 桥边石块/花草偏密，水面接缝有亮度过渡 |
| `crop.wheat.growing` | 复用+加工 | `generation-records/originals/crop.wheat.growing.png` | `sources/crop.wheat.growing.png` | `records/crop.wheat.growing.json` | 无 | 沿用旧苗列，成熟图株位为近似对应 |
| `crop.wheat.mature` | 新生成 | `generation-records/originals/crop.wheat.mature.png` | `sources/crop.wheat.mature.png` | `records/crop.wheat.mature.json` | 无 | 麦穗略密且局部边缘偏亮；株位为近似对应 |
| `crop.default.growing` | 复用+加工 | `generation-records/originals/crop.default.growing.png` | `sources/crop.default.growing.png` | `records/crop.default.growing.json` | 无 | 沿用旧株位，成熟图为近似对应 |
| `crop.default.mature` | 新生成 | `generation-records/originals/crop.default.mature.png` | `sources/crop.default.mature.png` | `records/crop.default.mature.json` | 无 | 成熟叶菜与幼苗株位为近似对应 |
| `object.tree` | 复用+加工 | `generation-records/originals/object.tree.png` | `sources/object.tree.png` | `records/object.tree.json` | 无 | 旧树根落点按可见树干人工校正，待场景中复核 |
| `object.house` | 新生成 | `generation-records/originals/object.house.png` | `sources/object.house.png` | `records/object.house.json` | 无 | 房屋底部落点为图像位置估计，待场景中复核 |
| `edge.grass.x` | 新生成 | `generation-records/originals/edge.grass.x.png` | `sources/edge.grass.x.png` | `records/edge.grass.x.json` | 无 | 草纹重复感仍可见，需用户看拼接预览确认 |
| `edge.grass.y` | 新生成 | `generation-records/originals/edge.grass.y.png` | `sources/edge.grass.y.png` | `records/edge.grass.y.json` | 无 | 草纹重复感仍可见，需用户看拼接预览确认 |
| `edge.road.x` | 新生成 | `generation-records/originals/edge.road.x.png` | `sources/edge.road.x.png` | `records/edge.road.x.json` | 无 | 路肩与单元内部草纹并非逐像素一致 |
| `edge.road.y` | 新生成 | `generation-records/originals/edge.road.y.png` | `sources/edge.road.y.png` | `records/edge.road.y.json` | 无 | 路肩与单元内部草纹并非逐像素一致 |
| `edge.river.x` | 新生成 | `generation-records/originals/edge.river.x.png` | `sources/edge.river.x.png` | `records/edge.river.x.json` | 无 | 水纹亮度在桥接处仍可见局部过渡 |
| `edge.river.y` | 新生成 | `generation-records/originals/edge.river.y.png` | `sources/edge.river.y.png` | `records/edge.river.y.json` | 无 | 水纹亮度在桥接处仍可见局部过渡 |
| `corner.grass` | 新生成 | `generation-records/originals/corner.grass.png` | `sources/corner.grass.png` | `records/corner.grass.json` | 无 | 草纹重复感仍可见，需用户看拼接预览确认 |

## 检查边界

- `npm run tiles:status`：50/50；`npm run tiles:import`：成功，生成 43 张正式导出 PNG 和 manifest。
- 检查涵盖文件齐全、固定尺寸、地面内外透明区、母版不透明、来源哈希与规格摘要；接口语义及局部画风通过总览和拼接预览核看。
- 拼接预览中河水亮度与草地纹理仍有局部过渡；机器通过不代表画面获得用户认可。干湿田的同形程度、两阶段逐株对齐、对象落点仍需实际场景中复核。
- 未更改游戏玩法、存档、地图布局、运行时素材包，也未运行与本次图片交付无关的游戏构建。

