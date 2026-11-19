# Web 项目管理

本目录是 `PhotoGallery/docs/` 下网页作品的管理规范，不是项目运行时依赖。

- [项目管理规范](./PROJECT_MANAGEMENT_STANDARD.md)：仓库结构、项目身份、登记表、测试和发布标准。
- [Agent 开发指南](./AGENT_DEVELOPMENT_GUIDE.md)：Agent 接单、基线、TDD、验收和交付流程。
- [项目 README 模板](./PROJECT_README_TEMPLATE.md)：新项目和旧项目渐进补齐说明。
- [项目登记表](../projects.json)：未来独立门户读取的项目目录。
- [登记表 JSON Schema](../projects.schema.json)：字段约束。

校验命令（Node.js 22，无第三方依赖）：

```bash
node scripts/validate-project-catalog.mjs
```

当前仓库还包含 Android 原生应用。Android 专项指南仍在 `docs/AGENT_DEVELOPMENT_GUIDE.md`；网页项目不要把该 Android 指南当作自己的开发规范。
