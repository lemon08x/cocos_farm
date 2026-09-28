# 共用 UI 资源

当前地图风格发布器从此目录读取 11 张图标剪影，按风格的 `palette.green` 配色导出。`manifest.json` 保存尺寸和锚点，`image-meta-template.json` 是 Cocos 图片导入配置模板，不是游戏图片。

这些 PNG 提取自原 `assets/resources/art-packs/scenic` 包，SVG 原稿仍在 `art/scenic/sources/icons/`。原包中其余旧地面、河流、桥和建筑运行时图片已经退出使用并删除；新主场景图片来自 `tiles-v1` 或各独立风格目录。
