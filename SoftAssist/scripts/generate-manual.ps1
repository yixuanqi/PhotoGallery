<#
.SYNOPSIS
    根据配置生成用户操作手册

.DESCRIPTION
    该脚本读取项目配置信息，生成包含软件概述、操作指南、常见问题的用户操作手册。

.PARAMETER ConfigPath
    配置文件路径，默认为 ../config.json

.PARAMETER OutputPath
    输出文件路径，默认为 ../output/user-manual.md

.EXAMPLE
    ./generate-manual.ps1
    使用默认配置生成用户手册
#>

param(
    [string]$ConfigPath = "../config.json",
    [string]$OutputPath = "../output/user-manual.md"
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor Green
}

function Read-Config {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        throw "配置文件不存在: $Path"
    }
    
    $content = Get-Content $Path -Raw -Encoding UTF8
    return $content | ConvertFrom-Json
}

function Get-AndroidManifest {
    param([string]$ProjectRoot)
    
    $manifestPath = Join-Path $ProjectRoot "app\src\main\AndroidManifest.xml"
    
    if (-not (Test-Path $manifestPath)) {
        return $null
    }
    
    return Get-Content $manifestPath -Raw -Encoding UTF8
}

function Get-Permissions {
    param([string]$ManifestContent)
    
    if ([string]::IsNullOrEmpty($ManifestContent)) {
        return @()
    }
    
    $permissions = @()
    $matches = [regex]::Matches($ManifestContent, 'android:name="android.permission.(\w+)"')
    
    foreach ($match in $matches) {
        $permName = $match.Groups[1].Value
        $permissions += $permName
    }
    
    return $permissions | Select-Object -Unique
}

function New-UserManual {
    param(
        [object]$Config,
        [string[]]$Permissions
    )
    
    $sb = [System.Text.StringBuilder]::new()
    $softwareName = $Config.softwareCopyright.softwareName
    $version = $Config.softwareCopyright.version
    $functions = $Config.softwareCopyright.mainFunctions
    $date = $Config.softwareCopyright.developmentCompletionDate
    
    # 标题
    [void]$sb.AppendLine("# $softwareName")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## 用户操作手册")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("**软件版本**：$version  ")
    [void]$sb.AppendLine("**文档版本**：1.0  ")
    [void]$sb.AppendLine("**编写日期**：$date")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    
    # 目录
    [void]$sb.AppendLine("## 目录")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("1. 软件概述")
    [void]$sb.AppendLine("2. 运行环境")
    [void]$sb.AppendLine("3. 软件安装")
    [void]$sb.AppendLine("4. 功能说明")
    [void]$sb.AppendLine("5. 操作指南")
    [void]$sb.AppendLine("6. 常见问题")
    [void]$sb.AppendLine("7. 技术支持")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    
    # 一、软件概述
    [void]$sb.AppendLine("## 一、软件概述")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 1.1 软件简介")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("$softwareName 是一款功能实用的移动应用程序，旨在为用户提供便捷的服务体验。")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 1.2 主要特点")
    [void]$sb.AppendLine("")
    
    for ($i = 0; $i -lt $functions.Count; $i++) {
        [void]$sb.AppendLine("- **$($functions[$i])**")
    }
    [void]$sb.AppendLine("")
    
    [void]$sb.AppendLine("### 1.3 适用人群")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("- 需要使用本软件功能的用户")
    [void]$sb.AppendLine("- 追求高效操作体验的用户")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    
    # 二、运行环境
    [void]$sb.AppendLine("## 二、运行环境")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 2.1 硬件要求")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| 项目 | 最低配置 | 推荐配置 |")
    [void]$sb.AppendLine("|-----|---------|---------|")
    [void]$sb.AppendLine("| 处理器 | 四核 1.5GHz | 八核 2.0GHz |")
    [void]$sb.AppendLine("| 内存 | 2GB RAM | 4GB RAM 及以上 |")
    [void]$sb.AppendLine("| 存储空间 | 50MB | 100MB |")
    [void]$sb.AppendLine("| 屏幕 | 720×1280 | 1080×1920 及以上 |")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 2.2 软件要求")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| 项目 | 要求 |")
    [void]$sb.AppendLine("|-----|------|")
    [void]$sb.AppendLine("| 操作系统 | Android 8.0 (API 26) 及以上版本 |")
    
    if ($Permissions -contains "READ_MEDIA_IMAGES" -or $Permissions -contains "READ_EXTERNAL_STORAGE") {
        [void]$sb.AppendLine("| 照片权限 | 需要照片访问权限 |")
    }
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    
    # 三、软件安装
    [void]$sb.AppendLine("## 三、软件安装")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 3.1 从应用商店安装")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("1. 打开设备上的应用商店")
    [void]$sb.AppendLine("2. 搜索"$($Config.project.name)"")
    [void]$sb.AppendLine("3. 点击"安装"按钮")
    [void]$sb.AppendLine("4. 等待下载和安装完成")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 3.2 首次启动")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("1. 在应用列表中找到应用图标")
    [void]$sb.AppendLine("2. 点击图标启动应用")
    [void]$sb.AppendLine("3. 按照提示授予必要权限")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    
    # 四、功能说明
    [void]$sb.AppendLine("## 四、功能说明")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 4.1 功能概览")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| 功能模块 | 功能描述 |")
    [void]$sb.AppendLine("|---------|---------|")
    
    foreach ($func in $functions) {
        [void]$sb.AppendLine("| $func | 提供$func相关功能 |")
    }
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    
    # 五、操作指南
    [void]$sb.AppendLine("## 五、操作指南")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 5.1 基本操作")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| 操作 | 方法 |")
    [void]$sb.AppendLine("|-----|------|")
    [void]$sb.AppendLine("| 启动应用 | 点击应用图标 |")
    [void]$sb.AppendLine("| 退出应用 | 按返回键或主页键 |")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 5.2 权限设置")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("如需修改应用权限：")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("1. 打开系统"设置"")
    [void]$sb.AppendLine("2. 进入"应用管理"")
    [void]$sb.AppendLine("3. 找到本应用")
    [void]$sb.AppendLine("4. 点击"权限"进行设置")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    
    # 六、常见问题
    [void]$sb.AppendLine("## 六、常见问题")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### Q1：应用无法正常使用？")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("**解决方法**：")
    [void]$sb.AppendLine("1. 检查是否授予必要权限")
    [void]$sb.AppendLine("2. 重启应用")
    [void]$sb.AppendLine("3. 检查系统版本是否满足要求")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### Q2：应用闪退或卡顿？")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("**解决方法**：")
    [void]$sb.AppendLine("1. 清理后台应用")
    [void]$sb.AppendLine("2. 重启设备")
    [void]$sb.AppendLine("3. 卸载重装应用")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    
    # 七、技术支持
    [void]$sb.AppendLine("## 七、技术支持")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 7.1 联系方式")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("如遇到问题或有建议，可通过以下方式联系：")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("- **应用商店评论**：在应用商店留下您的反馈")
    [void]$sb.AppendLine("- **开发者邮箱**：（请填写实际邮箱）")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### 7.2 隐私说明")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("$softwareName 尊重用户隐私：")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("- 所有数据仅在本地处理")
    [void]$sb.AppendLine("- 不收集任何用户个人信息")
    [void]$sb.AppendLine("- 详细内容请查看隐私政策")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("*本手册由 SoftAssist 工具自动生成*")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("**版权所有 © $((Get-Date).Year) $($Config.project.name) 开发团队**")
    
    return $sb.ToString()
}

# 主执行逻辑
try {
    Write-Log "开始生成用户手册..."
    
    $scriptDir = $PSScriptRoot
    $configFullPath = Join-Path $scriptDir $ConfigPath
    $outputFullPath = Join-Path $scriptDir $OutputPath
    
    # 读取配置
    Write-Log "读取配置文件: $configFullPath"
    $config = Read-Config -Path $configFullPath
    
    # 获取项目根目录
    $projectRoot = Split-Path $scriptDir -Parent | Split-Path -Parent
    
    # 读取 AndroidManifest
    $manifest = Get-AndroidManifest -ProjectRoot $projectRoot
    $permissions = Get-Permissions -ManifestContent $manifest
    
    Write-Log "发现权限: $($permissions -join ', ')"
    
    # 生成手册
    Write-Log "生成用户手册..."
    $manual = New-UserManual -Config $config -Permissions $permissions
    
    # 确保输出目录存在
    $outputDir = Split-Path $outputFullPath -Parent
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    # 写入文件
    $manual | Out-File -FilePath $outputFullPath -Encoding UTF8 -NoNewline
    
    Write-Log "用户手册已生成: $outputFullPath"
    Write-Log "完成!"
    
} catch {
    Write-Host "错误: $_" -ForegroundColor Red
    exit 1
}
