# 软件著作权登记 - 源代码文档

## 软件基本信息

| 项目 | 内容 |
|------|------|
| 软件全称 | {{softwareName}} |
| 软件简称 | {{abbreviation}} |
| 版本号 | {{version}} |
| 软件分类 | {{category}} |
| 开发完成日期 | {{developmentCompletionDate}} |
| 开发方式 | {{developmentMethod}} |
| 源代码行数 | 约{{linesOfCode}}行 |

## 软件功能说明

{{softwareName}}主要功能包括：

{{#each mainFunctions}}
{{@index}}. **{{this}}**
{{/each}}

## 技术特点

- 采用Kotlin语言开发
- 使用Jetpack Compose声明式UI框架
- 支持Android 8.0（API 26）及以上版本
- 采用MVVM架构模式

---

## 源代码（前30页）

{{frontSourceCode}}

---

## 源代码（后30页）

{{backSourceCode}}

---

## 文件清单

| 序号 | 文件名 | 路径 | 说明 |
|-----|-------|------|------|
{{#each files}}
| {{@index}} | {{name}} | {{path}} | {{description}} |
{{/each}}

---

*本文档由 SoftAssist 工具自动生成*
