# SoftAssist - 软著材料生成工具

## 概述

SoftAssist 是一个用于自动生成软件著作权申请材料的工具集。它可以从 Android 项目中提取源代码，生成符合软著申请要求的文档。

## 目录结构

```
SoftAssist/
├── config.json              # 配置文件
├── scripts/                 # 脚本目录
│   ├── extract-source.ps1   # 源代码提取脚本
│   ├── generate-manual.ps1  # 用户手册生成脚本
│   ├── generate-privacy.ps1 # 隐私政策生成脚本
│   └── run-all.ps1          # 主脚本（执行所有任务）
├── templates/               # 模板目录
│   ├── source-code.md       # 源代码文档模板
│   ├── user-manual.md       # 用户手册模板
│   └── privacy-policy.html  # 隐私政策模板
└── output/                  # 输出目录
    ├── source-code-document.md
    ├── user-manual.md
    └── privacy-policy.html
```

## 快速开始

### 1. 配置项目信息

编辑 `config.json` 文件，填写您的项目和软件著作权信息：

```json
{
    "project": {
        "name": "YourAppName",
        "packageName": "com.yourcompany.appname",
        "versionName": "1.0",
        "versionCode": 1
    },
    "softwareCopyright": {
        "softwareName": "您的软件全称",
        "abbreviation": "软件简称",
        "version": "V1.0",
        "category": "应用软件-分类",
        "developmentCompletionDate": "2025-01-01",
        "mainFunctions": ["功能1", "功能2"]
    },
    "author": {
        "name": "您的姓名",
        "idNumber": "",
        "nationality": "中国"
    }
}
```

### 2. 运行脚本

```powershell
# 执行所有任务
./scripts/run-all.ps1

# 或单独执行
./scripts/extract-source.ps1      # 提取源代码
./scripts/generate-manual.ps1     # 生成用户手册
./scripts/generate-privacy.ps1    # 生成隐私政策
```

### 3. 查看输出

生成的文档位于 `output/` 目录下。

## 脚本说明

### extract-source.ps1

从项目中提取源代码，生成符合软著要求的源代码文档。

**功能**：
- 扫描指定目录下的源代码文件
- 统计代码行数
- 生成格式化的源代码文档（前30页 + 后30页）

**参数**：
- `-ConfigPath`: 配置文件路径（默认：../config.json）
- `-OutputPath`: 输出文件路径（默认：../output/source-code-document.md）

### generate-manual.ps1

根据配置生成用户操作手册。

**功能**：
- 读取配置信息
- 生成包含软件概述、操作指南、常见问题的用户手册

### generate-privacy.ps1

根据应用权限生成隐私政策页面。

**功能**：
- 读取 AndroidManifest.xml 中的权限信息
- 生成符合应用商店要求的隐私政策 HTML 页面

## 自定义模板

您可以修改 `templates/` 目录下的模板文件来自定义输出格式：

- 使用 `{{variable}}` 语法引用配置中的变量
- 支持条件渲染和循环

## 注意事项

1. **代码行数要求**：软著申请通常要求源代码不少于3000行，如果代码不足，需要补充
2. **文档格式**：最终提交时可能需要转换为 Word 格式
3. **隐私政策**：需要部署到可访问的网址才能提交应用商店

## 扩展开发

如需扩展功能，可以：

1. 修改 `config.json` 添加新的配置项
2. 修改模板文件调整输出格式
3. 编写新的脚本添加功能

---

*SoftAssist v1.0*
