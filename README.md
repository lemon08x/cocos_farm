# 山居农事 · Cocos Demo

Cocos Creator **3.8.8** 的竖屏 2D 农业原型。当前「清和田院 · 连续场景」将房屋、山路和地面画进同一张场景图，地块使用隐形点击区域，耕作痕迹与作物随真实状态显示。主屏采用四入口、资源状态与选中田况卡，没有人物。

## 立即运行

首次从仓库下载后，先安装 Node.js 与 Cocos Creator 3.8.8，再执行：

```powershell
git clone https://github.com/lemon08x/cocos_farm.git
cd cocos_farm
npm ci
npm run build
npm start
```

仓库不包含依赖、编辑器缓存和 `build/` 构建产物；首次运行需要完成构建。UI 回归检查可执行 `npm run test:ui`。

本机已构建的浏览器版本：双击 `start.cmd`，打开 <http://127.0.0.1:4328>。启动窗口需要保持运行。本机需安装 Node.js（当前使用 24）。

命令行启动：

```powershell
cd cocos_farm
npm start
```

这是 Cocos 构建的 Web Mobile 版本，尚未打包 Android APK，也尚未做手机真机性能验收。

## 在 Cocos 中打开

1. 在 Cocos Dashboard 中导入本文件夹，选择 Creator 3.8.8。
2. 打开 `assets/scenes/Farm.scene`。
3. 使用编辑器的浏览器预览，或构建 Web Mobile。

如果重新安装依赖或构建：

```powershell
npm ci
npm run build
npm start
```

`tools/build.ps1` 默认使用本机 `C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe`。其他机器可执行 `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Editor "实际的 CocosCreator.exe 路径"`。

## 操作

- 主屏四入口为「农事、仓储、农历、更多」。顶部待办提示说明下一步，资源带有文字名称。
- 点田块只选田，轮廓和名称显示选中位置；底部田况卡可查看状态，再点「农事」查看条件和报价。
- 拖动地图可平移；「选田」包含远处田地，「更多 → 场景居中」复位。
- 「农历」点击作物，为选中田地安排计划；保存计划不扣物资、不推进日期。
- 「待办」逐项显示日期和状态，点任务查看条件，到期后手动确认执行；所有任务均可分页浏览。
- 「仓储」查看库存并进入商店；「更多」提供农业所学、静修日课、记事、帮助与设置。
- 「休养」保留原有半日休息，压力为零时不可执行。
- 面板左上箭头返回上一页并保留分页/滚动位置，右上 × 回到田院；长说明可上下滑动。
- 每次执行后显示真实资源和日期变化，自动保存。设置可手动保存、切换风格或备份后新开局。

新局从正月初一开始，起始田为空田。小麦在惊蛰才可播种；可以先安排计划、开垦、整治或学习，不绕开农时、材料、知识与时间条件。

## 规则与存档

`core/src/game`、`core/src/runtime/session.ts`、`records.ts` 以及 `core/rulesets` 保存了 `civilizationMini` 的 0.27.0 核心快照（来源提交 `704b8f6eb61d25320b272a5e30cdb6f408d40231`）。没有改写原农业公式。

界面通过 `FarmCore` 调用原 `submitCommand()`，最终经 `game.ts` 的 `transition()` 改变世界；只读取 `observeSession()` 的公开观察。该工程可以独立运行，不依赖旁边的原仓库、原 Web 服务或其存档。

浏览器存档键为 `shanju.cocos.farm.v1`。每次行动后保存。读取失败保留原存档，进入不覆盖原档的临时新局；「新开一局」先备份旧内容，再新建。浏览器地址或端口变化会使用不同的存储空间，请勿清理网站数据。

本 Demo 只展示农业相关入口，但核心仍含原有生活、寿命和时代结算。农业独立终局、完整师徒交接界面、全年自动执行、稳定循环与新评分尚未接入，不把隐藏后续时代菜单视为已完成规则拆分。

## 文件组织

- `assets/scenes/Farm.scene`：入口场景。
- `assets/scripts/FarmDemo.ts`：会话协调、地图交互和边缘业务面板。
- `assets/scripts/art/`：独立的风格配置加载与图片呈现。
- `assets/scripts/view/`：HUD、返回栈、展示适配、地图与共用 UI 组件。
- `assets/resources/art-packs/`：运行时美术入口，包含浅纸、暮色配色示意与自定义包。
- `assets/scripts/FarmCore.ts`：自动生成的规则包，请改源文件再运行 `npm run core`。
- `core/bridge.ts`：原规则与客户端之间的接口。
- `core/src/`、`core/rulesets/`：原项目规则快照。
- `art/*.svg`：本 Demo 的可编辑程序绘制素材源。
- `assets/resources/art/`：保留的示例背景和农舍源图，不再作为运行时入口。
- `tools/art.mjs`：导出原示例素材；不会覆盖已编辑的风格包。
- `tools/build.ps1`、`build-config.json`：Creator 命令行构建。
- `tools/serve.mjs`、`start.cmd`：本机浏览器运行入口。

当前美术是原创的简化分层示意素材，可替换为后续手绘或生成的同规格素材。没有直接使用对话参考图或调用付费生图服务。

美术替换步骤、槽位及图片规格见 [ART_GUIDE.md](ART_GUIDE.md)。现有 UI 分层、局限与优化顺序见 [UI_ARCHITECTURE.md](UI_ARCHITECTURE.md)。

「清和田院」使用 Grok Build 生成的连续场景与小麦素材。[制作记录](art/grok-qinghe/README.md) 保留首版提示词、原稿和后续连续场景改动；[首版操作实例](http://127.0.0.1:4328/art-study/case-study.html) 是历史对照，并非当前主屏布局。
