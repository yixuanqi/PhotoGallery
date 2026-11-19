# Web 互动项目管理规范

- 文档版本：1.0
- 适用仓库：`yixuanqi/PhotoGallery`
- 生效日期：2026-11-19

## 1. 目标与适用范围

本规范管理个人作品集中的独立网页应用、Three.js/WebGL 场景、浏览器游戏、物理仿真和实验工具，使项目可以独立开发、测试、访问和迭代，同时由统一门户发现和展示。

**本规范只约束网页项目，不替代 Android 原生应用规范。**

当前 `PhotoGallery` 仓库同时包含：
- 根目录下的 Android 原生「小笨相册」应用（Kotlin / Jetpack Compose）。
- `docs/` 下的 GitHub Pages 内容与独立网页作品。
- `docs/index.html` 当前是「小笨相册 - 应用信息」页面，不是未来的个人项目门户，不得直接覆盖。

Android 代码继续遵守现有 Android 开发文档；网页项目遵守本目录下的规范和 Agent 指南。

## 2. 目标架构

采用「独立门户 + 项目仓库 + 可选独立仓库」：

| 层 | 仓库/位置 | 职责 |
|---|---|---|
| 个人项目门户 | 未来的 `yixuanqi.github.io` 仓库 | 项目展厅、分类检索、项目状态、封面和更新动态 |
| 项目目录与发布源 | 当前 `yixuanqi/PhotoGallery` 的 `docs/` | 保存网页项目、资源、测试和项目登记表 |
| 大型独立项目 | 未来按需拆出的独立仓库 | 独立依赖、复杂构建、独立 CI/CD、多人协作或单独版本发布 |

当前网页项目的公开路径保持 `https://yixuanqi.github.io/PhotoGallery/<id>/`。**不得为了建立新门户而改变现有项目 URL。**

未来门户读取 `https://yixuanqi.github.io/PhotoGallery/projects.json`。门户只消费项目登记数据，不在门户代码中维护第二份手工项目清单；项目源码和发布入口仍由项目仓库负责。

## 3. 当前仓库事实与基线

当前仓库包含 Android 应用和网页项目。网页目录基线：

```text
PhotoGallery/
├── app/                         # Android 应用源码
├── SoftAssist/                  # Android/工程相关目录
├── docs/
│   ├── index.html               # 小笨相册应用信息页，非新门户
│   ├── projects.json            # 公共项目目录
│   ├── projects.schema.json     # JSON Schema
│   ├── web-projects/            # 网页项目管理文档
│   ├── galaxy/                  # 星海漫游
│   ├── astra/
│   ├── doudou-tank/
│   ├── earthplant/
│   ├── excavator/
│   ├── gravity-lens/
│   ├── helicopter/
│   └── islebound/
└── .github/workflows/
    └── islebound-visual.yml     # Islebound 专项浏览器回归
```

初始登记表覆盖 8 个本仓库 Pages 页面（含星海入口）和 4 个指向其他仓库/Release 的公开项目，共 12 条记录。

`docs/islebound/` 已有 README、package.json、Playwright 测试和专属 CI，是复杂互动项目的参考样例。其他单文件项目不要求为了形式而强行引入 npm 或构建系统。

## 4. 项目身份与目录规则

### 4.1 稳定项目 ID
- 使用小写 kebab-case，例如 `gravity-lens`、`doudou-tank`。
- ID 创建后视为稳定标识，不因中文名称、标题或视觉设计变化而修改。
- 门户、项目登记表、目录、测试和提交记录使用同一个 ID。
- 项目改名只更新展示字段；只有项目本身发生不可兼容的身份变化才讨论新 ID。

### 4.2 一个项目一个目录

```text
docs/<project-id>/
├── index.html          # 固定入口，必需
├── README.md           # 项目说明，新项目必需
├── assets/             # 图片、模型、音频等（按需）
├── tests/              # 自动化测试（按复杂度）
├── package.json        # 仅在确实需要构建/测试依赖时添加
└── src/                # 多文件工程按需添加
```

规则：
1. `index.html` 必须位于项目目录根部，固定在线入口为 `/<project-id>/`。
2. 项目自己的资源放在自己的目录，不依赖其他项目目录中的偶然文件。
3. 简单项目可以继续保持单 HTML；不要为统一格式而无意义拆分。
4. 复杂项目可使用 `src/`、`assets/`、`tests/` 和构建脚本，但输出必须发布到该项目固定入口。
5. 新项目必须增加 README；旧项目在下次实质修改时渐进补齐，不做无收益的大批量重写。
6. 临时截图、日志、缓存、node_modules 和本地构建目录不得混入发布目录。

### 4.3 项目类型

`kind` 允许值：

| 值 | 含义 |
|---|---|
| `portal-experience` | 星海等导航/入口体验 |
| `interactive-web` | 浏览器直接运行的互动项目 |
| `desktop-app` | Windows/macOS 等桌面应用 |
| `research-project` | 研究仓库、实验记录或研究工具 |
| `android-app` | Android 原生应用 |

`category` 是门户展示分类，可按实际作品增加，例如 `simulation`、`game`、`science`、`creative-3d`、`audio`。不要把技术栈当成分类。

## 5. 项目登记表：公共目录契约

### 5.1 文件位置

- `docs/projects.json`：门户消费的公共目录数据。
- `docs/projects.schema.json`：JSON Schema 字段约束。
- `scripts/validate-project-catalog.mjs`：无第三方依赖的目录校验脚本。

门户不得维护第二份手工项目数组。新增、改名、分类、标签或入口变化时，应更新登记表。

当前星海页面仍保留自己的 3D 星球坐标和运行时展示数组。门户拆分阶段再处理星海与登记表的数据复用；在该重构完成前，修改星海展示的项目名称、描述、标签或入口时，必须同时核对 `docs/projects.json`。

### 5.2 字段说明

| 字段 | 必需 | 说明 |
|---|---:|---|
| `id` | 是 | 稳定项目 ID |
| `name` | 是 | 主显示名称 |
| `nameEn` | 否 | 英文副标题 |
| `kind` | 是 | 项目类型 |
| `category` | 是 | 门户分类 |
| `status` | 是 | idea / development / testing / published / archived |
| `summary` | 是 | 简短介绍，不夸大仿真精度 |
| `tags` | 是 | 展示标签 |
| `techStack` | 否 | 已核实的技术栈 |
| `primaryUrl` | 是 | 体验、下载或查看仓库的主入口 |
| `primaryAction` | 是 | 主按钮文案 |
| `repositoryUrl` | 是 | 源码/项目仓库 |
| `sourcePath` | 本仓库网页项目必需 | 例如 `docs/gravity-lens/index.html` |
| `sortOrder` | 是 | 唯一排序值 |
| `featured` | 否 | 是否重点展示 |
| `cover` | 否 | 封面路径或可信 URL |
| `lastUpdated` | 否 | 仅在更新时间核实后填写 |

不要编造项目版本、更新时间、测试状态、封面或性能数据。未知字段省略，不用猜测值填充。

### 5.3 登记规则
- 本仓库 Pages 项目必须有 `sourcePath`，指向真实存在的 `docs/<id>/index.html`。
- 外部仓库项目不填写本仓库的 `sourcePath`。
- 所有 `id` 和 `sortOrder` 必须唯一。
- URL 使用完整 HTTPS 地址。
- 项目迁移到独立仓库时保持 `id` 不变，只更新仓库、入口和来源字段。
- 项目下线时优先改为 `archived`，不静默删除历史记录。

## 6. 项目复杂度分级

### L1：单文件静态/互动项目
适用于小型 Shader、单场景 Three.js、轻量交互演示。
- 保留单个 `index.html`。
- README 说明用途、操作、依赖和已知限制。
- 最低验证：HTML/JS 语法、资源路径、桌面/移动端打开、关键交互冒烟。
- 不要求 npm、打包器或复杂 CI。

### L2：结构化互动项目
适用于多场景、多交互状态、物理近似或较多资源的项目。
- 按需拆分 JS/CSS/资源。
- 增加可重复逻辑回归测试。
- 对关键 UI/场景增加浏览器截图或 Playwright。
- 锁定依赖版本，避免测试和线上使用不同版本。

### L3：高复杂度/高风险项目
适用于 GPGPU、大规模粒子、物理仿真、复杂游戏循环或性能敏感项目。
- 明确数值/物理模型假设和适用边界。
- 对核心算法建立不变量、边界条件和回归样本。
- 建立固定浏览器、视口、场景和 GPU 能力验收矩阵。
- 性能指标必须注明测量环境和方法。
- CI 软件 WebGL 通过不等于真实 GPU 验收通过。

项目可从 L1 升级到 L2/L3；不因目录大小单独决定复杂度。

## 7. 依赖、资源与运行约束

1. 外部 CDN 依赖固定版本；避免 `latest`、浮动主分支和不可复现地址。
2. 关键资源优先放入项目自己的 `assets/`；外部资源失败时有提示或降级策略。
3. 使用相对路径，确保在 `/PhotoGallery/<id>/` 子路径部署时资源正常；不能默认站点根路径就是项目根路径。
4. 前端 HTML/JS 不得写入私钥、API Key、访问令牌。
5. 大型模型、视频、音频和纹理评估体积、加载时间和移动端内存。
6. WebGL/WebGPU 能力不足时提供提示，不得把初始化失败伪装成成功运行。
7. 交互考虑键盘、触屏、窗口缩放和暂停/恢复；动画合理响应页面隐藏状态。
8. 项目不得通过全局 CSS、全局变量或路径假设污染其他项目。

## 8. 测试与验收

| 级别 | 最低检查 | 推荐增强检查 |
|---|---|---|
| L1 | JS 语法、DOM 入口、资源路径、真实浏览器打开 | 关键交互、移动端视口 |
| L2 | 逻辑测试、场景初始化、交互状态 | Playwright、固定视口截图、刷新/重进 |
| L3 | 算法不变量、边界条件、资源初始化/失败路径 | 多场景浏览器测试、性能基线、真实 GPU 验收 |

通用验收：
- 固定 URL 返回正确页面，不是 404 或旧页面。
- 本地资源路径可解析；控制台无未解释的致命错误。
- 关键操作至少完成一次端到端冒烟。
- 桌面和窄屏视口均能进入并操作。
- 对原有功能列出回归清单，确认没有无意删除。
- 新增/修改的本地项目通过目录校验脚本。
- 视觉项目必须查看真实浏览器截图；只通过 JS 语法检查不算视觉验收。
- 未执行的测试明确写为「未执行」，不得写成通过。

## 9. 发布、URL 与版本

- 当前公开路径保持 `https://yixuanqi.github.io/PhotoGallery/<id>/`。
- 不随意改名目录、删除入口文件或改变大小写。
- 发布源以 Git 提交为准；聊天中生成、本地未推送不等于已发布。
- Pages 构建成功与浏览器实际运行成功是两个不同验收项，分别报告。
- 发布后用固定 URL 强制刷新或带版本参数验证；旧页面需检查部署 SHA、缓存和响应内容。
- 回滚优先 revert 对应提交或恢复已知稳定文件，不用未经验证的新补丁覆盖故障版本。

## 10. Git 与提交约定

推荐格式：

```text
feat(<project-id>): add ...
fix(<project-id>): correct ...
perf(<project-id>): optimize ...
test(<project-id>): add ...
docs(<project-id>): update ...
chore(portal): ...
```

- 单项目修改尽量只改该项目和必要登记/说明文件。
- 跨项目或门户修改说明影响范围。
- 不把无关 Android 文件、其他网页项目或缓存混入提交。
- 破坏性重构先建立稳定基线并保留回滚点。
- 提交前检查 diff、改动文件列表和敏感信息。

## 11. 未来独立门户的数据接口

门户仓库 `yixuanqi.github.io` 只负责 UI 和读取目录：
- 数据源：`https://yixuanqi.github.io/PhotoGallery/projects.json`。
- 数据格式：本仓库的 `docs/projects.schema.json`。
- 门户处理加载失败、空目录和未知字段，不能因单条记录异常整页白屏。
- 门户不修改项目源码，也不拥有项目发布权限。
- 主入口来自 `primaryUrl`，源码入口来自 `repositoryUrl`。
- 封面缺失时使用门户内置分类占位图，不生成虚构项目截图。
- 门户部署与项目仓库 Pages 发布互相独立。

## 12. 渐进迁移计划

1. **阶段一（本次）**：建立规范、Agent 指南、登记表、JSON Schema 和目录校验 CI；不移动现有项目。
2. **阶段二**：创建独立门户仓库，读取 `docs/projects.json`，实现项目展厅与分类检索。
3. **阶段三**：逐个补齐旧项目 README、封面和适当测试，不做无收益的大批量重写。
4. **阶段四**：星海页面改为复用登记表，消除重复维护。
5. **阶段五**：只有项目确实需要独立构建、版本发布、权限或协作时才拆仓库。

## 13. 明确禁止

- 不得覆盖当前 `docs/index.html` 的小笨相册应用信息页来充当新门户。
- 不得为建立门户而移动或重命名现有项目目录。
- 不得在门户里再手写一份长期维护的项目数组。
- 不得把所有单文件项目强制改成 npm 工程。
- 不得只凭 CI 绿色或 JS 语法通过就宣称 WebGL 视觉验收完成。
- 不得把近似物理模型包装成工程级精确求解器。
