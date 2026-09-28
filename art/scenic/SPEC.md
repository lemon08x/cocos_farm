# 田园场景 (Scenic) 美术与资产规格 · v1

日期：2026-09-28。本文件是后续代码阶段（投影、布局、HUD、加载器）必须遵守的**绑定规格**。
视觉基准：`art/expansion-previews/02-district-browse.png`（斜向俯视田园、左上院落、河流与桥、麦田、深绿实心 UI 图标）。

## 1. 投影与几何（绑定，原文）

- Projection: 2:1 oblique ground plane. Logical plot (x,y) → world px at zoom 1: `wx=(x−y)·130`, `wy=(x+y−4)·65`. Home plot p2q2 renders at (0,0). Plot footprint is a diamond 260 wide × 130 tall (points: top (0,−65), right (130,0), bottom (0,65), left (−130,0)).
- Light from upper-left; soft short shadows fall down-right. Verticals (house, trees, signposts, fence posts) drawn upright — only the ground plane is oblique.
- Display sizes at zoom 1; sources at 2× display size.

补充细化：

- 所有“铺满一个地块”的素材（土壤、作物、河流、花草、田埂）都以 260×130 显示菱形为基准：菱形四角恰好触及画布四边，允许边缘溢出约 4px 用于相邻地块叠合，菱形容器之外必须透明。
- 相同几何的素材（如 dry/wet/unknown 土壤）必须可以无损互换叠加；作物、田埂、花草是**透明叠加层**，叠加在土壤之上，层间不再包含土壤底色。
- 直立物（房屋、桥、树冠、栅栏、指示牌）竖直绘制，仅其落地点投影服从 2:1 斜面。

## 2. 锚点（anchor）

Manifest 中 `anchor` 为归一化 [ax, ay]，表示图片内对齐到世界落点的位置。默认 `[0.5, 0.5]`（中心对齐，用于所有地面菱形素材）。站立于地面的直立物使用 `[0.5, ~0.9]`（底部对齐），具体值见 §5 表格。代码放置时：`node.position = worldPoint − [ax·w, ay·h]`（以显示尺寸计）。

## 3. 调色板（palette，13 键，取自参考图）

| key | hex | 用途 |
| --- | --- | --- |
| ink | #213d2c | 主文字/深绿墨色 |
| muted | #75836f | 次要文字 |
| paper | #f8f3e6 | 卡片底/暖纸 |
| cream | #eee4cb | 次底/米色 |
| green | #2e5240 | 实心图标与主按钮深绿 |
| gold | #d9a441 | 金币/强调金 |
| line | #d9cfb4 | 分隔线 |
| status | #7aa95c | 状态绿（新鲜/良好） |
| caption | #8a9478 | 图注/说明文字 |
| disabled | #b9bfae | 禁用态 |
| warning | #c96f3b | 警示橙棕 |
| shade | #1c3527 | 深阴影绿 |
| base | #5f8a4e | 草地基色（ground.base 主色） |

UI 实心图标统一使用 `green` (#2e5240) 填充，透明背景。

## 4. Manifest 格式（绑定）

```json
{
  "version": 1,
  "id": "scenic",
  "name": "田园场景 · 第二版",
  "palette": { "ink": "#213d2c", "...": "..." },
  "images": {
    "<slot>": {
      "file": "kebab.png",
      "width": 260,
      "height": 130,
      "anchor": [0.5, 0.5]
    }
  }
}
```

- `width`/`height` 为 **zoom 1 显示尺寸**；磁盘上的 PNG 是其 2 倍（如 520×260）。
- 文件位于 `assets/resources/art-packs/scenic/`，由 `tools/process-scenic-art.mjs` 从 `art/scenic/sources/` 导出并生成/刷新 manifest 与 Cocos `.meta`。

## 5. 素材清单（v1，显示尺寸 → 源/导出尺寸）

| slot | 显示尺寸 | 导出 px | anchor | 透明要求 | 内容 |
| --- | --- | --- | --- | --- | --- |
| field.soil.dry | 260×130 | 520×260 | [0.5,0.5] | 菱形外透明 | 干燥翻耕土壤，浅棕，犁沟沿长轴 |
| field.soil.wet | 260×130 | 520×260 | [0.5,0.5] | 菱形外透明 | 水田湿土，深棕泥+水面反光 |
| field.unknown | 260×130 | 520×260 | [0.5,0.5] | 菱形外透明 | 未探索雾中荒地 |
| field.ridge | 260×130 | 520×260 | [0.5,0.5] | 中心+外部透明 | 草地田埂描边叠加层（仅四边条带） |
| crop.wheat.growing | 260×130 | 520×260 | [0.5,0.5] | 行间/外部透明 | 绿色幼苗麦行，裁切到菱形 |
| crop.wheat.mature | 260×130 | 520×260 | [0.5,0.5] | 行间/外部透明 | 金色成熟麦行 |
| crop.default.growing | 260×130 | 520×260 | [0.5,0.5] | 行间/外部透明 | 通用绿色幼苗（其他作物回退） |
| crop.default.mature | 260×130 | 520×260 | [0.5,0.5] | 行间/外部透明 | 通用成熟叶菜（其他作物回退） |
| env.homestead | 460×380 | 920×760 | [0.5,0.8] | 背景透明 | 农舍+小围栏院落，独立环境节点，置于 p2q2 西北 |
| env.river.straight | 260×130 | 520×260 | [0.5,0.5] | 菱形外透明 | 直河道，沿长轴贯穿左—右 |
| env.river.corner | 260×130 | 520×260 | [0.5,0.5] | 菱形外透明 | 河道转弯，左进—下出 |
| env.bridge | 260×200 | 520×400 | [0.5,0.75] | 背景透明 | 木板小桥，跨一条地块边 |
| env.tree.canopy | 180×240 | 360×480 | [0.5,0.92] | 背景透明 | 前景遮挡树冠（含短树干） |
| env.flowers | 260×130 | 520×260 | [0.5,0.5] | 草簇间/外部透明 | 花草点缀叠加层 |
| env.fence | 260×60 | 520×120 | [0.5,0.8] | 背景透明 | 木栅栏段，沿一条地块边 |
| env.signpost | 120×160 | 240×320 | [0.5,0.92] | 背景透明 | 木制分区指示牌（牌面留白） |
| ground.base | 512×512 | 1024×1024 | [0.5,0.5] | **不透明** | 草地基底，近似可平铺 |
| icon.date / icon.coin / icon.food / icon.pressure / icon.arrow / icon.todo / icon.seedling / nav.field / nav.calendar / nav.basket / nav.more | 64×64 | 128×128 | [0.5,0.5] | 背景透明 | 深绿 (#2e5240) 实心剪影字形 |

### 图标字形定义

- `icon.date`：圆角叶片标签（日期卡用）
- `icon.coin`：实心圆币+同心圆镂空
- `icon.food`：饭碗剪影（碗身+底足）
- `icon.pressure`：圆脸表情（双眼+波浪嘴镂空）
- `icon.arrow`：右向尖括号（chevron）
- `icon.todo`：圆形徽标+感叹号镂空（待办计数底）
- `icon.seedling`：双叶嫩芽
- `nav.field`：2×2 圆角方块（田地）
- `nav.calendar`：日历（挂环+格点）（农历）
- `nav.basket`：提篮（仓储）
- `nav.more`：2×2 圆点（更多）

## 6. 河流连接约定（绑定）

河道段以菱形**边的中点**为连接口，连接口处的断线（世界坐标）：

- `env.river.straight`：水带从**左边中点 (−130,0)** 直线流向**右边中点 (130,0)**（沿长轴）。水面必须触及左右两个角点，保证链式相接。
- `env.river.corner`：水带从**左边中点 (−130,0)** 进入，弯转 90° 后从**下边中点 (0,65)** 流出。使用其水平镜像可获得右进/上出等其余三种转弯变体；straight 旋转 90°（世界层做仿射旋转变换，或对调基向量）可得到沿短轴的直段。
- 水面宽度约定约 60 世界 px（源图约 120px），两岸为草坡+小石块；相邻段在共享边中点处水面、岸坡必须连续，不允许断口。
- `env.bridge` 跨过一条地块边（即两个地块的共享边），桥面方向沿该边中垂线，锚点 [0.5,0.75] 落在桥下水面中心。

## 7. 导出规则与回退（绑定）

- 禁止 `fit:'fill'` 拉伸透视素材：仅当源图构图/宽高比与目标一致（容差 ±4%）时用 cover 等比缩放；否则重新生成源图。
- 导出脚本检查：源图缺失、尺寸/宽高比不符、要求透明的素材边缘不透明、要求不透明的素材含透明像素、manifest 与实际文件不一致。
- 缺失素材规则（供后续代码）：**显式回退，绝不崩溃**。其他作物成长/成熟回退到 `crop.default.growing` / `crop.default.mature`；未知地貌回退 `field.unknown`；缺失环境件可整体省略该装饰节点。
- 各槽位的真实/占位状态记录在 `art/scenic/reviews/art-status.md`，发布说明必须区分。
