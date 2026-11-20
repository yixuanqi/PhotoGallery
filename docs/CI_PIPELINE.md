# PhotoGallery CI 与发布约定

## 工作流职责

- **Project catalog validation**：项目目录、星海数据、静态入口和浏览器回归检查。项目页面、脚本或工作流发生变化时，在 Pull Request 和 main push 上运行。
- **pages build and deployment**：由 GitHub Pages 当前的发布源负责构建与发布。正式发布发生在代码进入 main 后。

## 新增或修改项目的最低要求

1. 在 `docs/projects.json` 中维护项目基础信息和 `galaxy` 展示元数据。
2. 对可在线运行的项目，提供 `docs/<project-id>/index.html`。
3. `galaxy.position` 和 `galaxy.radius` 是按项目 ID 保存的布局参数；星海页面运行时从项目目录加载，不再维护第二份项目数组。
4. 有航行日志的项目把文章写在对应项目的 `galaxy.journal` 中。通用文章仍可留在星海页面。
5. 运行 `node scripts/validate-project-catalog.mjs` 和 `node scripts/check-galaxy-arrival.mjs`。
6. 新增游戏或交互项目时，增加至少一个浏览器启动 Smoke Test；覆盖桌面与触屏设备的关键启动路径。

## 本地验证

```bash
node scripts/validate-project-catalog.mjs
node scripts/check-galaxy-arrival.mjs
node scripts/check-star-courier.mjs
node scripts/check-gravity-mobile.mjs
npm install --no-save --no-package-lock playwright-core@1.56.1
CHROME_BIN="$(command -v google-chrome || command -v chromium || command -v chromium-browser)"
CHROME_BIN="$CHROME_BIN" node scripts/smoke-gravity-mobile.mjs
CHROME_BIN="$CHROME_BIN" node scripts/smoke-ashen-bell-vow.mjs
CHROME_BIN="$CHROME_BIN" node scripts/smoke-galaxy-catalog.mjs
```

浏览器 Smoke Test 需要本机可用的 Chromium/Chrome。

## 启用 main 发布门禁（需要仓库设置权限）

当前 GitHub Pages 使用 GitHub 的 **pages build and deployment** 分支发布流程。该流程会在 main 更新后部署。要确保失败的项目检查不能进入 main，需要给 main 设置 Branch protection：

1. 打开 **Settings → Branches → Add branch protection rule**，规则匹配 `main`。
2. 勾选 **Require a pull request before merging**。
3. 勾选 **Require status checks to pass before merging**。
4. 选择状态检查 **Validate public project catalog and local entries**。
5. 建议勾选 **Require branches to be up to date before merging**，并禁止强制推送。
6. 不要允许普通提交绕过该规则；确认规则生效后，所有项目更新都通过 PR 合入 main。

本仓库当前 Actions 工作流已配置 Pull Request 检查，但仓库分支保护属于 GitHub 仓库设置，不能仅靠提交 YAML 自动启用。第一次 PR 检查完成后，状态检查名称即可在规则配置中选择。

## 发布链路说明

```text
feature branch
    ↓ Pull Request
Project catalog validation
    ↓ required check passes
merge to main
    ↓
GitHub Pages build and deployment
    ↓
published site
```

若以后要把 Pages 从“Deploy from a branch”迁移到“GitHub Actions”自定义部署，需要先在 **Settings → Pages → Build and deployment → Source** 将来源切换为 **GitHub Actions**，再启用依赖校验 Job 的自定义 deploy Job。当前不擅自切换发布源，避免造成线上站点中断。
