# 田格手账素材

`sources/` 保存生成与选定的原始画面。`tools/process-fieldbook-art.mjs` 将其处理为 `assets/resources/art-packs/fieldbook/` 内的可替换地块、地面和水渠图片；`tools/create-fieldbook-icons.mjs` 生成同套 UI 图标，并更新图片清单。运行时使用的是 `assets/resources/art-packs/fieldbook/manifest.json` 引用的图片。

`final-preview.png` 是当前游戏运行截图。`current-game-preview.png` 和 `adjacent-unit-preview.png` 是此前版本的验证截图，保留用于对照；两组风格和扩展方向概念图分别存放在 `../style-previews/` 与 `../expansion-previews/`。
