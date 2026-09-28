# 田园场景素材状态 · v1 首批

日期：2026-09-28。规格见 `../SPEC.md`；导出管线 `tools/process-scenic-art.mjs`（端到端通过，28 槽位）。总览图：`contact-sheet.png`。

生成方式：painterly 素材由 Grok CLI（`grok -p --always-approve`，4 路并行 + 单体重做）按统一风格提示族生成，部分由 `../key-backgrounds.mjs` 做纯色背景抠透明；UI 字形为手写 SVG（`../sources/icons/*.svg`）经 sharp 栅格化。

## 槽位状态

| slot | 状态 | 说明 |
| --- | --- | --- |
| field.soil.dry | ✅ 真实生成 | 1408×704 源，暖白背景已抠透明 |
| field.soil.wet | ✅ 真实生成 | 水面反光好，grok 直接产出透明背景 |
| field.unknown | ✅ 真实生成 | 雾中荒地，grok 直接产出透明背景 |
| field.ridge | ✅ 真实生成 | 空心田埂环；背景与中心填色已抠除 |
| crop.wheat.growing | ✅ 真实生成（偏淡） | 白底抠除后幼苗偏浅，叠在土壤上可读；后续批次可加深 |
| crop.wheat.mature | ✅ 真实生成 | 金色麦田菱形（密植表现，行间不透明） |
| crop.default.growing | ✅ 真实生成 | 通用幼苗；原图白色虚线边框已随白底一并抠除 |
| crop.default.mature | ✅ 真实生成 | 通用成熟叶菜（卷心菜表现），底部有轻微半透明水彩晕染 |
| env.homestead | ✅ 真实生成 | 农舍+围栏院落+石板路+菜畦，920×760，透明背景，anchor [0.5,0.8] |
| env.river.straight | ✅ 真实生成 | 左—右长轴直段，水面触及左右角点 |
| env.river.corner | ✅ 真实生成 | 左进—下出转弯；其余朝向按 SPEC §6 镜像/旋转获得 |
| env.bridge | ✅ 真实生成 | 木板桥 520×400，透明背景，anchor [0.5,0.75] |
| env.tree.canopy | ✅ 真实生成 | 前景树冠含短干，anchor [0.5,0.92] |
| env.flowers | ✅ 真实生成 | 花草簇叠加层，簇间为半透明水彩晕染 |
| env.fence | ✅ 真实生成 | 初版有白色纸底斑块，已重生成；anchor [0.5,0.8] |
| env.signpost | ✅ 真实生成 | 空白牌面木指示牌，anchor [0.5,0.92] |
| ground.base | ✅ 真实生成 | 1024×1024 草地，已压平为全不透明；三叶草密度偏高，平铺时可见重复感，后续可换更均匀变体 |
| icon.date / icon.coin / icon.food / icon.pressure / icon.arrow / icon.todo / icon.seedling | ✅ 手绘 SVG（有意为之） | 实心深绿 #2e5240 剪影，128×128 |
| nav.field / nav.calendar / nav.basket / nav.more | ✅ 手绘 SVG（有意为之） | 同上 |

**缺失槽位：无。** 本批 28/28 全部交付，无手绘占位图（图标 SVG 属规格内首选方案，非回退）。

## 已知限制（供后续阶段）

- `crop.wheat.growing` 幼苗偏淡，远景对比度低。
- `ground.base` 非严格无缝平铺，仅“近似可平铺”。
- 河流转弯其余三种朝向、直段短轴变体需代码层镜像/旋转，未单独出图。
- 选中描边为代码绘制（沿菱形轮廓），不在本素材包内。
