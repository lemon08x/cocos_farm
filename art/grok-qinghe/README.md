# 清和田院：Grok Build 生图接入 Cocos 的操作实例

## 后续修改：连续地面与图标主屏

按用户意见，当前版本取消主屏地块的独立底板与常驻文字标签。新增 Grok 原稿 `sources/integrated-scene.jpg`（720 × 1280，会话 `01a0e00c-5ce2-7171-b036-1d3718ae5237`），完整提示词为 `prompts/integrated-scene.txt`。农舍、路径、山水、地面在同一幅画中；仅实际耕作痕迹、物件及作物叠加。地块的点击区域仍由原观察数据决定。

`tools/integrate-qinghe.py` 生成无底板的柔边状态素材，耕田保留犁沟笔触而移除菱形土块；场景与区域同步小范围平移，避免二者滑开。扩大地图后也可从图标帮助内的「田地总览」访问远处地块。

主屏只显示日期、节气和资源数字，功能用图标表示。去掉标题口号、按钮名称、选中地块编号和底部操作句；长按图标可显示名称，详情保留成本、条件和确认信息。下一节起为第一版的历史制作过程，不代表当前布局。

这次不是把一张 AI 界面概念图放到游戏里：背景、农舍、地块、小麦分别生成并处理，再通过已有风格包装配成真实可点击的 Cocos 场景。无人物，功能仍在边缘，游戏结算保持原样。

打开游戏「设置 → 美术风格 → 清和田院 · Grok 水彩」。本机地址：http://127.0.0.1:4328/ 。[可视化操作实例](case-study.html) 提供替换前后对照、原稿和修正稿。

## 1. 先按界面职责拆素材

| 素材 | 给 AI 的任务 | 接入约束 |
| --- | --- | --- |
| 背景 | 暖纸、水彩青绿山野，溪流与小路沿两侧 | 上方状态栏留白，中央留给可交互田块；没有房屋、地块、人物、文字和按钮 |
| 农舍 | 一栋青瓦、米色墙的门派农舍 | 白底独立，完整轮廓；抠图后才能调整位置而不重画背景 |
| 地块图集 | 草地、旱田、湿田、水面、树、石六种 | 同视角、同光源；几何尺寸必须匹配原地图 |
| 小麦 | 生长期与成熟期外观 | 单独透明层；仅映射 wheat，不把麦穗套给其他作物 |
| 按钮、文字、功能图标 | 继续使用代码设计的 UI | 文字不烘焙进图，图标保持原含义；调整颜色和纸纹以统一视觉 |

美术方向统一为：水彩与不透明水粉、青绿/鼠尾草绿、麦金、暖米纸、上左光源、轻松山门田院。不要求 AI 一次画一张包含所有界面的整图。

## 2. 实际调用方式

使用用户指定的本机 **Grok Build CLI 的 `image_gen`**，没有调用 OpenAI 图片 API。共生成 6 张：4 张首稿，2 张针对性修正稿；没有启动子代理或自动持续生图循环。

每个提示词保存在 [prompts](prompts) 内，可以直接复用。示例：

```powershell
cd C:\Users\94202\Desktop\daily\cocos_farm
grok --tools image_gen --no-subagents --disable-web-search --max-turns 3 --allow image_gen --prompt-file art/grok-qinghe/prompts/background.txt --output-format plain
```

这台机器的系统 Clash 代理为 `127.0.0.1:7897`；调用进程检查系统现有 ProxyServer 后，将其赋给本进程 HTTP_PROXY、HTTPS_PROXY、ALL_PROXY，并保留 NO_PROXY 为 localhost、127.0.0.1、::1。没有修改全局代理，其他机器不要照抄端口。

Grok 返回路径时，背景那次把已编码的 Windows 目录写得不准确。实际按文件存在情况核对并复制原稿，不能只相信最终文字。源文件全部保存在本目录 `sources/`，不依赖 Grok 会话缓存。

## 3. 对照原稿，做具体修正

### 地块透视

首稿 `terrain.jpg` 把地块画得接近旋转正方形，无法直接匹配现有 58 × 31 间距的等距网格。修正提示词明确写入宽高 2:1，并给出单元格内四个顶点的坐标，而不是笼统要求“等距风格”。

修正稿 `terrain-corrected.jpg` 已明显变扁，但仍没有精确达到要求。因此继续做确定性的图像尺寸归一，不能假设 AI 能精确遵守几何数字。按已检查的源图坐标，分别校准地表上顶点、中线与底边；树木图块使用更高透明画布及独立偏移，保留顶部空间。

### 小麦形态

首稿 `crops.jpg` 左侧本应无麦穗的幼株长出了麦穗，背景还出现灰色矩形。重生成一张仅有窄长草叶、没有花穗的幼株 `seedling-corrected.jpg`；成熟期仍采用首稿右侧。没有为了迁就图片改变生长规则。

## 4. JPG 变成可用的透明 PNG

Grok 实际输出均为 JPG，**没有原生透明通道**。处理程序：

1. 按格裁切图集，对浅色中性背景估计透明度。
2. 清除微小孤立背景残点，处理白色边缘污染。
3. 农舍裁去多余白边，装入统一透明画布。
4. 地块统一到固定菱形尺寸及落脚中线；作物按根部落点排列。
5. 导出 PNG；背景保留完整画面。

处理脚本：[tools/process-grok-qinghe.py](../../tools/process-grok-qinghe.py)。使用 Pillow、numpy、scipy，重跑不请求模型或消耗生图额度：

```powershell
python tools/process-grok-qinghe.py
node tools/export-art-packs.mjs
```

脚本会**重新生成 qinghe 风格的派生图片与 manifest**，手动修改这些派生文件前应复制为新的风格。原 JPG 和提示词不被覆盖。纸纹底板采样自背景天空并与 UI 配色合成；边缘图标沿用原矢量线稿重新着色，这些不是额外 AI 生成的图标。

## 5. 接入界面，再做最后一轮调整

最终素材位于 `assets/resources/art-packs/qinghe/`，入口为 `manifest.json`；`index.json` 注册了新风格。浏览器使用已有风格加载器，无需改游戏核心。

首次接入后发现农舍下沿与田块重叠，将其 scene 的 y 从 62 调整为 142，保持大小不变，并在农舍下面增加程序合成的柔和接地阴影。底部操作提示在浅草地上不够清晰，将文字由 `paper` 色改为语义上的 `caption` 色；其他风格也会使用自己的 caption 配色。没有改动功能入口、田块命中区域、行动消耗或存档结构。

保留 `before.png` 与 `after.png` 作为本次美术前后对照；这两张是实际游戏截图，原稿和素材联系表不应冒充游戏截图。未种植状态下不会为截图虚构成熟小麦；小麦外观在素材联系表单独展示。

## 交付清单与来源

| 本地原稿 | 像素 | Grok 会话 ID | 用途 |
| --- | --- | --- | --- |
| `sources/background.jpg` | 720 × 1280 | `01a0dff8-327b-7720-9a02-fade50d92734` | 已接入背景 |
| `sources/cottage.jpg` | 1024 × 1024 | `01a0dff8-9b8b-77c3-9055-1dc0437b8089` | 已抠图接入农舍 |
| `sources/terrain.jpg` | 1248 × 832 | `01a0dff8-9d3c-7682-a760-3d518c7e63b9` | 保留首稿对照，不接入 |
| `sources/crops.jpg` | 1408 × 704 | `01a0dff8-9e8b-7e22-8b03-a6c8eb174e36` | 右侧用于成熟小麦，左侧未采用 |
| `sources/terrain-corrected.jpg` | 1248 × 832 | `01a0dffa-dc27-70f1-95b4-03d7500a5a6d` | 六种地块经归一后接入 |
| `sources/seedling-corrected.jpg` | 1024 × 1024 | `01a0dffa-ddd9-7d40-aa07-ba6be16291c5` | 生长期小麦 |

所有会话原图均为 `images/1.jpg`，所在 Grok 路径的项目段是 `C%3A%5CUsers%5C94202%5CDesktop%5Cdaily%5Ccocos_farm`。

这是一版可用的美术方向样板。部分细麦芒和小尺寸边缘仍可继续精修；背景分辨率为 720 × 1280，尚未做高清终稿或手机 GPU/内存验收。其他作物保留原通用素材，不把小麦样板描述为全作物美术已完成。


## 2026-09-27：参考布局与彩绘图标

主屏采用左上日期牌、右上资源胶囊、侧边工具、田况浮条和底部六入口。底部仅保留两字标签，其余图标支持长按提示。清和风格的入口和天气改用 Grok 生成的彩色图片，仍由 manifest 语义槽位加载；连续背景与农田呈现不变。

- `sources/painted-ui-icons.jpg`：4×4 原图，Grok 会话 `01a0e026-020b-7291-a527-31b30f0e983f`。
- `sources/painted-weather-icons.jpg`：2×2 原图，Grok 会话 `01a0e027-43c0-76c2-ad03-4af70f89e38f`。
- 提示词：`prompts/painted-ui-icons.txt` 与 `prompts/painted-weather-icons.txt`。
- 处理：`python tools/process-painted-icons.py`，等分裁切、去背景、保留浅色内部、统一透明画布并注册槽位。输出 `painted-*.png`，图标联系表为 `painted-icons-contact.png`。
- 实际运行截图：`painted-ui-preview.png`。菜单底板仍为已有 UI 资源，不属于本次模型生成图标。

旧版 process-grok-qinghe.py 与 ui-icons.mjs 会重置 manifest 的图标映射；如需重跑，应最后运行 process-painted-icons.py 恢复彩绘图标。

## 二级菜单作物与农具图标（2026-09-27）

Grok Build `image_gen` 会话：`01a0e032-59ce-72c2-94a2-aa94f99bc865`。CLI 达到 max-turns 后退出，但已生成图片原文件，经检查后接入。

- 提示词：`prompts/painted-farm-icons.txt`。
- 原图：`sources/painted-farm-icons.jpg`，1024×1024，4×4。
- 内容：八种作物、种袋、镰刀、堆肥、铲子、木材、黏土、面粉、秸秆。
- 处理脚本：`tools/process-painted-icons.py`，输出独立透明 PNG 并注册 manifest 图片槽位；联系表 `painted-icons-contact.png`。
- 图标用于播种/农事卡片、仓库、农历，规则和作物场景外观未改动。
