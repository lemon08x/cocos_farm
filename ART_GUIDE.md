# 美术替换与风格对比

当前清和包采用 `groundMode: "continuous"`：替换 `qinghe/landscape-continuous.png` 即替换含房屋和地面的整景。scene 仅一层；耕作、积水等公开状态通过 `surface.*` 无底板贴花显示，作物保持独立。草地和未探索地块不画菱形底板，只保留点击区域。图像留有四周余量，并由世界视口裁切；拖动背景与区域同步，最大横移 72、纵移 110 设计单位。远处田地可在图标说明内的田地总览操作。

首版清和素材处理脚本输出旧的分层方案。要复现当前方案，依次执行 `python tools/process-grok-qinghe.py`、`python tools/integrate-qinghe.py`、`node tools/ui-icons.mjs`，然后构建。仅改当前风格图片仍可直接重新加载。以下通用槽位约定也继续适用于其他风格。

美术入口为 `assets/resources/art-packs/`。游戏规则与存档不在这个目录；换风格不会调用行动接口或推进日期。

## 最快尝试一张新图

1. 双击 `start.cmd`，打开 http://127.0.0.1:4328 。
2. 用新图替换 `assets/resources/art-packs/custom/landscape.png`；农舍换 `cottage.png`，农舍保留透明背景。
3. 游戏右侧「设置 → 美术风格 → 自定义 · 替换这里」。
4. 此后每次替换图片或修改配置，点「重新加载当前风格」。本机服务直接读取源目录，不必重新构建。请先保存完图片文件，再点加载。

内置 `paper` 为浅纸田园；`dusk` 为暮色配色示意；`custom` 初始与浅纸一致，专供替换。暮色只用于验证换肤能力，不是另一套完成的手绘美术。

## 一个风格包

```text
assets/resources/art-packs/
  index.json                 # 风格列表，id 与文件夹名一致
  custom/
    manifest.json            # 图片槽位、大小、偏移、颜色、背景层顺序
    landscape.png
    cottage.png
    terrain-fieldDry.png
    crop-default-growing.png
    icon-calendar.png
    ui-panel.png
    ...
```

文件名可自行更改，同时更新 manifest 中的 `file`。路径相对当前风格目录，可使用子目录；使用英文、数字、下划线或连字符。支持 PNG、JPG/JPEG、WebP；需要透明的对象推荐 PNG。

复制 `custom` 为一个新目录，修改 manifest 的 `id`、`name`，再向 `index.json` 的 `packs` 数组追加 `{ "id": "新目录名", "name": "显示名称" }`。重新打开风格面板即可读取新列表，超过三个自动分页。id 使用小写英文、数字、下划线或连字符。

## 可替换槽位

| 槽位 | 初始显示尺寸 | 说明 |
| --- | --- | --- |
| `landscape` | 720 × 1280 | 完整背景，不画人物与可交互田块 |
| `cottage` | 310 × 272 | 透明农舍，独立摆放 |
| `cloud` | 180 × 70 | 透明云，`clouds: false` 可关闭 |
| `terrain.wild/unknown/fieldDry/fieldWet/water/story/rock/tree` | 116 × 72 | 各地貌一张，不把作物画进田地 |
| `selection` | 116 × 64 | 透明选中边框 |
| `crop.default.growing/mature` | 116 × 100 | 通用生长/成熟作物；初始向上偏移 20 |
| `icon.background` | 76 × 76 | 边缘入口底座 |
| `icon.calendar/book/basket/leaf/rest/home/more` | 48 × 48 | 透明功能图标 |
| `ui.panel/card/primary/disabled/status` | 源图 64 × 64 | 可选九宫格底图，随面板或按钮拉伸 |

显示尺寸是设计坐标单位，不要求原图像素完全相同。可以提供 2 倍清晰度图片，manifest 仍填原显示尺寸。所有核心槽位必须保留；可选 `ui.*` 删除后使用 palette 颜色绘制圆角底板。

图片配置示例：

```json
"cottage": {
  "file": "cottage.png",
  "width": 310,
  "height": 272,
  "x": 0,
  "y": 0,
  "fit": "contain"
}
```

`fit: "contain"` 保持比例居中，默认 `stretch` 填满尺寸；图片中心为锚点，`x` 向右、`y` 向上。改变外轮廓时尽量保持相同透明画布与落脚位置。场景图片在 `scene` 数组按前后顺序绘制，元素可设置位置及尺寸；scene 中的 width/height 优先于槽位尺寸。

地块点击范围与图片大小分开：当前地块是横向间距 58、纵向间距 31 的等距网格，命中区域保持菱形。因此换更高的树、作物不会扩大点击区域。切换到完全不同的视角（例如俯视方格）需要同时修改 `FarmWorldView.ts` 的地图布局，单换图不能改变透视几何。

可增加特定作物图片，例如 `crop.wheat.growing`、`crop.wheat.mature`。找到匹配槽位就使用它，否则回落到 `crop.default.*`。目前只映射原规则公开的生长与成熟两种外观，不虚构更多生长期。

九宫格底图使用 `borders: [左, 上, 右, 下]`，单位是**原图像素**，初始为 `[16,16,16,16]`。换高分辨率底图时同步调整边距。图片不要烘焙按钮文字、资源值、日期；文字仍由界面绘制。palette 控制文字、底色、遮罩等颜色；字体和排版当前仍在界面代码里。

## 加载和发布

- 新风格的全部图片加载成功后才替换当前画面。缺槽位、无效颜色、损坏图片或错误路径会提示失败并保留当前风格。加载期间不重复触发切换。
- 风格偏好存入 `shanju.cocos.art.v1`，与游戏存档 `shanju.cocos.farm.v1` 独立。
- 本机 `npm start` 直接读取源目录；构建脚本会把风格包复制到 `build/web-mobile/art-packs/`，普通静态部署读取此副本。
- Cocos 编辑器预览没有上述静态路径时，回退读取 `resources` 中的工程资源。编辑器模式修改素材需等待导入并重新预览；当前没有原生端热更新下载器。
- `tools/create-art-packs.mjs` 仅生成缺失的示例风格目录，不覆盖已有风格，也不在每次构建时运行。原 `tools/art.mjs` 输出保留为示例源，不再是运行时美术入口。
- 当前逐张加载图片，未做图集或纹理压缩优化。先确定视觉风格，再依据手机实测合批与内存；不把换肤能力等同于手机性能优化完成。
