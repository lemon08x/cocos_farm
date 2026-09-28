# 山居农事 · Cocos Demo

Cocos Creator **3.8.8** 的竖屏 2D 农业原型。当前主场景为「田园场景」（scenic revision-2），后续地图、交互和玩法空间关系以此场景为基准。新用户直接进入主场景；旧用户首次升级会切换到主场景，保留游戏进度和镜头记录。旧版「田格手账」保留在「更多 → 下一页 → 设置 → 场景版本」中，主动切换后的选择会被记住。

[旧版田格手账运行截图](art/fieldbook/final-preview.png)

该链接保留旧版实际 Web Mobile 运行画面作为历史参考。仓库目前只保存源码和美术素材；`build/` 被 Git 忽略，尚未配置 GitHub Pages，所以推送代码不会自动更新线上可玩的页面。

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

Windows 一键启动：安装 Node.js 24 LTS 后，双击根目录的 `start.cmd`。脚本在缺少构建产物或源码、配置发生变化时按需执行 `npm ci` 和 `npm run build`（首次构建还需安装 Cocos Creator 3.8.8），服务就绪后自动打开 <http://127.0.0.1:4328>。启动窗口需要保持运行，按 `Ctrl+C` 停止服务。构建成功后会记录源码与配置指纹；未发生变化时直接启动，修改后再次双击会自动重新构建。设置了 `PORT` 环境变量时，浏览器会打开对应端口。

命令行启动：

```powershell
cd cocos_farm
npm start
```

这是 Cocos 构建的 Web Mobile 版本，尚未打包 Android APK，也尚未做手机真机性能验收。

## 田园场景（主场景）

「田园场景」是默认主场景：包含农舍院落、道路、河流与桥、远景合并雾，现有地块按 150/90 斜面投影排布，耕作四边形 228×142，配分区导航与缩略图。当前与旧版共用规则和存档，切换不推进日期；后续区域与逻辑统一方案见 [主场景后续方案](docs/scenic-main-scene-followup.md)。

查看方式：双击 `start.cmd`，或在 `npm run build` 后执行 `npm start`，打开 <http://127.0.0.1:4328>即可进入主场景。如果升级后曾主动切回旧版，可在「更多 → 下一页 → 设置 → 场景版本 → 田园场景」返回。无需清除存档或新开局。启动脚本只检查本地源码与构建状态，不会自动拉取远端 Git 更新；其他环境提交的新版本需先同步到本目录。

设计依据见 `docs/farm-scene-v2-recovery-plan.md`。美术源图、画布模板与生成记录保存在 `art/scenic/revision-2/`（当前生效规格为其中的 SPEC.md）；`node tools/process-scenic-art.mjs` 校验并导出 `assets/resources/art-packs/scenic/`。

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

- 主屏四入口为「田地、农历、仓储、更多」。顶部显示日期与资源。
- 点田块只选田，轮廓和名称显示选中位置；底部田况卡可查看状态，再点「农事」查看条件和报价。
- 在地图及装饰卡片区域拖动可平移，双指张合可缩放；「田地」包含远处地块，「更多 → 回到房屋」复位。
- 「农历」点击作物，为选中田地安排计划；保存计划不扣物资、不推进日期。
- 「待办」逐项显示日期和状态，点任务查看条件，到期后手动确认执行；所有任务均可分页浏览。
- 「仓储」查看库存并进入商店；「更多」提供农业所学、静修日课、记事、帮助与设置。
- 「休养」保留原有半日休息，压力为零时不可执行。
- 面板左上图片按钮返回上一页并保留分页/滚动位置，右上图片按钮回到田院；长说明可上下滑动。
- 每次执行后显示真实资源和日期变化，自动保存。设置可手动保存、切换风格或备份后新开局。
- 「更多 → 场景版本」在「田格手账」与第二版「田园场景」之间切换地图表现，规则、资源与进度保持不变。

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
- `assets/resources/art-packs/`：运行时美术入口，包含主场景 scenic 美术包与旧版田格手账等风格。
- `assets/scripts/FarmCore.ts`：自动生成的规则包，请改源文件再运行 `npm run core`。
- `core/bridge.ts`：原规则与客户端之间的接口。
- `core/src/`、`core/rulesets/`：原项目规则快照。
- `art/*.svg`：本 Demo 的可编辑程序绘制素材源。
- `assets/resources/art/`：保留的示例背景和农舍源图，不再作为运行时入口。
- `tools/art.mjs`：导出原示例素材；不会覆盖已编辑的风格包。
- `tools/process-scenic-art.mjs`：导出田园场景美术包到 `assets/resources/art-packs/scenic/`（源图 `art/scenic/revision-2/sources/`，HUD 图标沿用 `art/scenic/sources/icons/`）。
- `tools/build.ps1`、`build-config.json`：Creator 命令行构建。
- `tools/serve.mjs`、`start.cmd`：本机浏览器运行入口。

主场景美术原稿保存在 `art/scenic/revision-2/`，通过 `tools/process-scenic-art.mjs` 导出。旧版原稿继续保存在 `art/fieldbook/sources/`，对应脚本为 `tools/process-fieldbook-art.mjs` 与 `tools/create-fieldbook-icons.mjs`。

美术替换步骤、槽位及图片规格见 [ART_GUIDE.md](ART_GUIDE.md)。现有 UI 分层、局限与优化顺序见 [UI_ARCHITECTURE.md](UI_ARCHITECTURE.md)。

「清和田院」使用 Grok Build 生成的连续场景与小麦素材。[制作记录](art/grok-qinghe/README.md) 保留首版提示词、原稿和后续连续场景改动；[首版操作实例](http://127.0.0.1:4328/art-study/case-study.html) 是历史对照，并非当前主屏布局。
