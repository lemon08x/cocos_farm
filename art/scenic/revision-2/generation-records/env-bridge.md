# env-bridge 生成记录

日期：2026-09-28。角色：art-river（farm scene v2 recovery 并行子任务）。

## 产物

- 成品：`art/scenic/revision-2/sources/env-bridge.png`，520×400，透明 PNG。
- 槽位：`env.bridge`，显示 260×200（源图 2×），锚点 [0.5,0.75]。
- 几何：木板人行桥（带双侧扶手与立柱），桥面自右上延伸至左下（与 env-river-straight 的下右水带垂直跨越）；桥及柔和投影之外全透明；桥下无水面。

## 参考与输入

- 风格参考：`art/expansion-previews/02-district-browse.png` 中的两座木板桥。
- 几何模板：`art/scenic/revision-2/templates/mock-env-bridge.png`（1040×800 mock，`make-mocks.mjs` 生成）。
- 提示词存档：`art/scenic/revision-2/generation-records/prompts/env-bridge.txt`。
- 工具：codex CLI 0.147 内置 image_gen（edit 模式，mock 作为输入图）。

## 原稿（禁止覆盖，全部保留）

- v1（失败：桥沿红色杂边、绿色投影团）：`raw/env-bridge-raw.png`（1430×1100）、`raw/env-bridge-keyed.png`
- v2（修正 mock 投影为中性灰并禁红色后重跑，采用）：`raw/env-bridge-raw-v2.png`（1430×1100）、`raw/env-bridge-keyed-v2.png`

## 处理步骤

1. codex image_gen edit 以 mock 为输入重绘（日志 `logs/env-bridge.log`、`logs/env-bridge-v2.log`）。
2. `remove_chroma_key.py --auto-key corners --soft-matte --despill` 去底。
3. `fit-canvas.mjs` 居中裁 13:10 并缩放到 520×400。
4. `fix-bridge-shadow.mjs` 手工后修：绿色投影像素（9338 px）改为中性暖灰并保留 alpha；少量残留纯红像素（670 px）改为木棕。

## 偏差

- 两次生成背景均为黑色而非纯绿幕：去底按键色 #000000 处理，透明结果检查通过。
- 生成器输出 1430×1100 而非 1040×800；宽高比一致（均 13:10），裁切无损失。
- 模型始终将投影画成绿色，最终以确定性的后修步骤替换为中性投影；桥体木纹未受影响。

## 验证（verify-art.mjs）

- 尺寸 520×400 ✓；四角 alpha=0 ✓；锚点 (0.5,0.75) 区域 alpha=191 ✓。
- 桥面方向右上→左下，符合跨越 env-river-straight 水带的要求。
