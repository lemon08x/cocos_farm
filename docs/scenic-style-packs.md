# 地图美术风格包：图片 agent 的执行入口

## 当前状态与边界

游戏支持在「设置 → 美术风格」选择已经发布的地图包，或重新加载当前包。切换会更新完整地面、作物、建筑、缩略图、地图标识与界面配色，保留游戏存档、选中地块和镜头。新包加载失败时保持旧画面；风格偏好单独保存在 `shanju.cocos.scenic-style.v1`，不写入游戏进度。

当前仅有 `pastoral`（现有田园）这一套正式图片。架构不会替用户决定第二种风格，也不会把同图改名当作新风格交付。

所有风格共用 `scenic-tiles@1` 的尺寸、接口、占地和素材 ID。美术可以改变配色、笔触、材质与细节密度，但不能改变地块边界、道路端口、房屋占地或锚点。改变这些属于场景规范升级，不能伪装成换皮肤。

## 文件结构

```text
core/src/game/scene/tile-art.ts       共用图块契约，不随风格复制
art/scenic/styles/
  pastoral/style.json                现有田园的风格配置
  <新风格ID>/
    style.json                      名称、生成要求、参考图、配色、过滤方式、发布状态
    jobs/<素材ID>/                  此风格的模板、提示词与任务记录
    catalog.json / index.html        自动生成的任务目录
    raw/                            normalize 输入备份
    sources/                        50 张标准源图
    records/                        按 ID 的来源、几何和风格摘要
    generation-records/             AI 原图、实际提示词与加工记录
    GENERATION-REPORT.md             生成方式、缺失项和已知偏差
assets/resources/art-packs/
  scenic-tiles/                     保留的 pastoral 运行时包
  scenic-styles/index.json          已发布风格目录，由工具生成
  scenic-styles/<新风格ID>/         发布后的图片和 manifest
```

共用 UI 图标和 Cocos 导入配置模板位于 `art/scenic/shared-ui/`，发布器不再依赖已删除的旧 `scenic` 运行时包。

为避免复制和破坏原稿，`pastoral` 的实际图片与原生成记录仍位于 `art/scenic/tiles-v1/`。新风格必须使用新 ID 和独立目录，不能覆盖它。UI 图标目前共用已有剪影并按各包的 green 配色导出，尚不提供任意重排 UI 或更换整套 UI 布局。

## 第一步：创建风格，填写用户决定的要求

```powershell
npm run tiles:style -- init <风格ID> --name "用户决定的名称"
```

ID 用小写字母开头，可含数字和短横线，最长 40 字符；`pastoral` 为保留 ID。初始化只建立 `draft` 草稿，不生成图片、不显示在游戏菜单。

编辑该目录的 `style.json`：

- `name`：游戏中显示的名称。
- `generation.description`：用户指定的风格，具体说明笔触、明暗、纹理密度、轮廓、材质与各元素的细节尺度。不能为空，未定风格不能直接批量出图。
- `generation.references`：项目内参考图片路径；必须实际给生成工具提供这些图片。
- `generation.negative`：本风格排除项。
- `palette`：保留全部 22 个颜色键；前 13 项用于地图标识、HUD 和菜单，`fog` 控制地图雾层，8 个 `map.*` 分别控制小地图的未知、田地、水域、绿地、院落、设施、道路和桥梁颜色。初始化会带上完整字段，再按新风格调整。
- `textureFilter`：`linear` 或 `nearest`，控制导入缩放与显示过滤。选择 nearest 不会自动把图片变成像素画，也不会自动改变现有接缝合成算法。
- `status`：先保持 `draft`，全部素材完成并导入成功后才改为 `ready`。
- `version: 1` 和 `contract: "scenic-tiles@1"`：不要为了绕过校验修改。

## 第二步：生成本风格的模板和全部素材

```powershell
npm run tiles:prepare -- --style <风格ID>
npm run tiles:status -- --style <风格ID>
```

prepare 复用共用几何，写入本风格自己的参考和描述。不得继续使用其他风格的旧 prompt，也不要手改生成的 job 几何来迁就不合格图片。

仍是 **50 个任务：43 张渲染图片 + 7 张公共接缝母版**。数量、尺寸、四边接口与叠层要求详见 [图块规格](../art/scenic/tiles-v1/SPEC.md)。每张 AI 任务使用本目录中的 control、guide、prompt 和本风格参考。

先完成本风格的草地、道路、河流边缘母版与顶点母版，然后生成单元内部，使材质自然接近母版。所有 7 张母版必须属于本风格；不能混用旧田园边缘来补新风格。作物、树、房屋同样需要符合新画风，复用只在画风相容且如实记录时进行。

## 第三步：登记与导入

```powershell
npm run tiles:normalize -- grass.0 "C:\art\generated.png" --style <风格ID> --generator "实际工具/模型"
# 需要裁剪时提供明确矩形，不会自动猜测裁剪或非等比拉伸。
npm run tiles:normalize -- edge.road.x "C:\art\edge.png" --style <风格ID> --generator "实际工具/模型" --crop 0,0,704,192
npm run tiles:import -- --style <风格ID>
```

省略 `--style` 默认操作 pastoral，所以新风格生成必须每次显式指定。直接调用 JS 的 agent 使用 `prepare({style:id})`、`normalize(assetId,input,{style:id,generator:...})` 和 `importPack({style:id})`，不要修改全局目录常量。

新记录包含 styleId 和生成要求摘要，不允许把另一个包的 records 原样复制过来。改变生成描述/参考配置后需要重新 prepare 并核对、重新登记该批素材；只修改界面 palette 或包的显示名称不会强迫重新生成图片。修改 textureFilter 后如需改变图片缩放结果，应从保留原稿重新 normalize。

保留真实生成原图、实际生成调用、参考列表和可复现的抠图/补边步骤。normalize 的 raw 只是其输入备份；若输入已加工，还要另外保存加工前 AI 原稿及完整来源链。

## 第四步：发布并在游戏内选择

导入成功后，将本风格的 `status` 改成 `ready`，运行：

```powershell
npm run tiles:publish
```

发布器验证所有 ready 风格，编译素材、生成各自的 manifest，最后更新风格目录。缺图或来源错误会终止发布，不能把不完整包登记到菜单。图片文件名含内容哈希，重新发布时旧 manifest 引用的图片仍然可用，避免运行中的浏览器读取到混合版本。

对当前 `npm start` / `start.cmd` 启动的本机游戏，发布后**不必重启游戏或重新编译代码**：关闭并重新打开「设置 → 美术风格」，选择新包；已经选中的包更新后点「重新加载当前风格」。工具也会同步复制到已有 Web 输出目录。

新包加载并在隐藏容器中完成节点创建后才替换原画面。失败不会保存新偏好，原地图继续可用；重启后会恢复已成功选择的风格。若该包后来丢失，启动会提示并回到现有田园包。

离线打包版或远端部署仍需要把新资源/目录一起发布到对应客户端。游戏菜单负责选择已发布图片，不会在浏览器里调用 AI，也不会自动访问另一个 agent 的临时文件夹。

`npm run build` 同样会发布所有 ready 包。草稿源图不影响正式构建；ready 配置和源图会参与构建指纹检查。发布后的历史内容哈希图片暂不自动删除，防止破坏仍在使用旧清单的页面。

## 交付与必要检查

交付本风格的 `style.json`、50 张 sources、raw、records、生成原稿/处理脚本及逐图报告。不要只交付 Git 忽略的 build 目录。首次正式接入和工具改动才做相关功能检查；纯新增图片无需反复跑游戏逻辑测试。

不安排阶段截图评分或逐图验收，用户在完成后亲自看效果。风格生成 agent 不改玩法、不重排地图、不修改公共几何、不删除旧包；是否提交/推送遵循该会话用户指示。

可直接交给图片 agent：

> 按 docs/scenic-style-packs.md 为我指定的画风创建独立风格包。先 init 新 ID，填写用户决定的风格描述和参考，再用该风格自己的模板、提示词和母版完成 50 张素材。每次 prepare/normalize/import 都指定 --style。保留原稿与来源记录，导入成功后设为 ready 并运行 tiles:publish，交付生成报告。不要覆盖 pastoral，不改地图或玩法，不做阶段视觉验收。
