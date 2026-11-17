# ISLEBOUND · 手绘群岛漫游

这是星海漫游博客中的第 7 颗可交互作品星球，沿用当前用户确认的 Three.js 群岛游戏版本。

## 在线入口

- 群岛试玩：https://yixuanqi.github.io/PhotoGallery/islebound/
- 星海博客：https://yixuanqi.github.io/PhotoGallery/galaxy/
- 游戏发布文件：`docs/islebound/index.html`
- 博客项目入口：`docs/galaxy/index.html`，项目 ID：`islebound`

## 后续更新的同步约定

**发布源只有一个：本仓库 `main` 分支的 `docs/islebound/index.html`。**

1. 修改游戏源码（岛屿布局、飞机、物件、性能等），先在本地测试。
2. 把经过测试的**完整 HTML** 提交到本仓库相同路径，不要重命名，也不要改变 `docs/galaxy/index.html` 中的 `../islebound/` 链接。
3. GitHub Pages 如果配置为本仓库 `main` 分支的 `/docs`，推送后会自动重新发布内容。若 Pages 改为其他构建方式，须相应调整发布配置。
4. 访问固定试玩地址，必要时使用 `?v=提交短SHA` 避免浏览器缓存。
5. 验证开始游戏、W/S 升降、A/D 左右转、E 降落、F 起飞、四座岛、火车轨道及地形贴合效果。

> 注意：“自动同步”指 **提交/推送到 GitHub 后，Pages 自动更新**；本地修改或仅在聊天中生成新版文件，并不会自行上传到博客。后续修改应同步更新本仓库的上述固定路径。

## 首次上线验证标记

页面 `<head>` 包含 `<meta name="islebound-build" content="2026-11-17-github-pages-01">`。后续改版请更新该标记；开发者工具执行 `document.querySelector('meta[name="islebound-build"]')?.content` 可检查网页加载的是哪一版。

## 架构

单文件静态网页；Three.js 通过 CDN 加载，场景在浏览器中程序化生成，无服务器端功能。岛屿配置保留在游戏的 `ISLANDS` 数组中，可扩展第五座及更多岛屿。
