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


## 动态天气 V1

天气为游戏内**程序化模拟**，不依赖现实天气 API，五种预设分别为：

| 天气 | 视觉和飞行反馈 |
| --- | --- |
| ☀ 晴朗 | 明亮的天空、柔和海面、微风 |
| ☁ 多云 | 云层变密，天空、海面与阳光逐渐变灰 |
| ☂ 小雨 | 倾斜雨丝、细小海面水纹、潮湿空气感 |
| ⚡ 暴风雨 | 深色乌云、更起伏的海浪、闪电、阵风侧漂 |
| ≈ 海雾 | 降低远景能见度，轻风，无雨丝 |

点右上角的天气按钮可从天气菜单直接选择预设，按 \`T\` 顺序切换天气；切换后默认进入手动模式。菜单中的“自动变化”可重新开启自动轮换，约每 60–80 秒改变一次天气。风只影响**自由飞行**，不会改变 E 辅助降落/F 起飞的预设轨迹。

单文件实现位于 \`docs/islebound/index.html\`，实现 \`createWeatherSystem()\`、\`update()\`、\`applyWind()\` 和 \`gustRoll()\`。天气状态亦暴露在 \`window.__ISLEBOUND_DEBUG.weather\`，例如在浏览器开发者工具输入 \`window.__ISLEBOUND_DEBUG.weather.select('storm')\` 即可切换到暴风雨，\`select('fog')\` 切换海雾。

发布前可运行（仅需 Node.js）：

\`\`\`bash
node docs/islebound/tests/weather-regression.mjs
\`\`\`

**人工浏览器回归：** 启动游戏 → T 键切换五种天气 → 等待天气逐渐过渡 → 暴风雨中观察雨丝/海浪/闪电/侧风 → E 降落、F 起飞 → 查看移动端天气按钮和小地图 → 开启自动模式观察随时间变天。

本次上线版本标记：\`2026-11-17-weather-v1\`。更新博客时继续替换相同的 \`index.html\`，发布地址无需变化。

## 架构

单文件静态网页；Three.js 通过 CDN 加载，场景在浏览器中程序化生成，无服务器端功能。岛屿配置保留在游戏的 `ISLANDS` 数组中，可扩展第五座及更多岛屿。
