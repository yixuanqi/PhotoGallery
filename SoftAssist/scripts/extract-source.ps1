<#
.SYNOPSIS
    从 Android 项目中提取源代码，生成软著申请用的源代码文档

.DESCRIPTION
    该脚本扫描指定目录下的源代码文件，统计行数，并生成符合软件著作权申请要求的源代码文档。
    文档格式为 Markdown，包含前30页和后30页的源代码。

.PARAMETER ConfigPath
    配置文件路径，默认为 ../config.json

.PARAMETER OutputPath
    输出文件路径，默认为 ../output/source-code-document.md

.EXAMPLE
    ./extract-source.ps1
    使用默认配置提取源代码

.EXAMPLE
    ./extract-source.ps1 -ConfigPath "./my-config.json" -OutputPath "./my-output.md"
    使用自定义配置提取源代码
#>

param(
    [string]$ConfigPath = "../config.json",
    [string]$OutputPath = "../output/source-code-document.md"
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor Green
}

function Get-ProjectRoot {
    $scriptDir = $PSScriptRoot
    return Split-Path $scriptDir -Parent | Split-Path -Parent
}

function Read-Config {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        throw "配置文件不存在: $Path"
    }
    
    $content = Get-Content $Path -Raw -Encoding UTF8
    return $content | ConvertFrom-Json
}

function Get-SourceFiles {
    param(
        [string]$SourceDir,
        [string[]]$Extensions = @("*.kt", "*.java")
    )
    
    $files = @()
    foreach ($ext in $Extensions) {
        $files += Get-ChildItem -Path $SourceDir -Filter $ext -Recurse -File
    }
    
    return $files | Sort-Object Name
}

function Get-CodeStatistics {
    param([object[]]$Files)
    
    $totalLines = 0
    $fileStats = @()
    
    foreach ($file in $Files) {
        $content = Get-Content $file.FullName -Encoding UTF8
        $lines = ($content | Measure-Object -Line).Lines
        $totalLines += $lines
        
        $fileStats += [PSCustomObject]@{
            Name = $file.Name
            Path = $file.FullName
            Lines = $lines
        }
    }
    
    return [PSCustomObject]@{
        TotalLines = $totalLines
        FileCount = $Files.Count
        Files = $fileStats
    }
}

function Format-CodeBlock {
    param(
        [string]$FileName,
        [string]$Content,
        [string]$Language = "kotlin"
    )
    
    $sb = [System.Text.StringBuilder]::new()
    [void]$sb.AppendLine("### 文件：$FileName")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("``````$Language")
    [void]$sb.AppendLine($Content.TrimEnd())
    [void]$sb.AppendLine("``````")
    [void]$sb.AppendLine("")
    
    return $sb.ToString()
}

function New-SourceCodeDocument {
    param(
        [object]$Config,
        [object]$Stats,
        [object[]]$Files,
        [string]$ProjectRoot
    )
    
    $sb = [System.Text.StringBuilder]::new()
    
    # 文档头部
    [void]$sb.AppendLine("# 软件著作权登记 - 源代码文档")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## 软件基本信息")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| 项目 | 内容 |")
    [void]$sb.AppendLine("|------|------|")
    [void]$sb.AppendLine("| 软件全称 | $($Config.softwareCopyright.softwareName) |")
    [void]$sb.AppendLine("| 软件简称 | $($Config.softwareCopyright.abbreviation) |")
    [void]$sb.AppendLine("| 版本号 | $($Config.softwareCopyright.version) |")
    [void]$sb.AppendLine("| 软件分类 | $($Config.softwareCopyright.category) |")
    [void]$sb.AppendLine("| 开发完成日期 | $($Config.softwareCopyright.developmentCompletionDate) |")
    [void]$sb.AppendLine("| 开发方式 | $($Config.softwareCopyright.developmentMethod) |")
    [void]$sb.AppendLine("| 源代码行数 | 约$($Stats.TotalLines)行 |")
    [void]$sb.AppendLine("")
    
    # 功能说明
    [void]$sb.AppendLine("## 软件功能说明")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("$($Config.softwareCopyright.softwareName)主要功能包括：")
    [void]$sb.AppendLine("")
    
    $functions = $Config.softwareCopyright.mainFunctions
    for ($i = 0; $i -lt $functions.Count; $i++) {
        [void]$sb.AppendLine("$($i + 1). **$($functions[$i])**")
    }
    [void]$sb.AppendLine("")
    
    # 技术特点
    [void]$sb.AppendLine("## 技术特点")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("- 采用Kotlin语言开发")
    [void]$sb.AppendLine("- 使用Jetpack Compose声明式UI框架")
    [void]$sb.AppendLine("- 支持Android 8.0（API 26）及以上版本")
    [void]$sb.AppendLine("- 采用MVVM架构模式")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    
    # 源代码部分
    [void]$sb.AppendLine("## 源代码（前30页）")
    [void]$sb.AppendLine("")
    
    # 计算前30页需要的代码（每页约50行，共1500行）
    $frontLines = 0
    $frontLimit = 1500
    
    foreach ($file in $Files) {
        if ($frontLines -ge $frontLimit) { break }
        
        $relativePath = $file.Path.Replace($ProjectRoot, "").TrimStart("\", "/")
        $content = Get-Content $file.Path -Raw -Encoding UTF8
        $lines = ($content -split "`n").Count
        
        [void]$sb.AppendLine((Format-CodeBlock -FileName $relativePath -Content $content))
        $frontLines += $lines
    }
    
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## 源代码（后30页）")
    [void]$sb.AppendLine("")
    
    # 计算后30页需要的代码
    $backLines = 0
    $backLimit = 1500
    $remainingFiles = @()
    
    # 找出剩余文件
    $frontFileCount = 0
    $tempLines = 0
    foreach ($file in $Files) {
        if ($tempLines -ge $frontLimit) {
            $remainingFiles += $file
        } else {
            $content = Get-Content $file.Path -Raw -Encoding UTF8
            $tempLines += ($content -split "`n").Count
            $frontFileCount++
        }
    }
    
    # 从剩余文件中取后30页
    $reversedFiles = @($remainingFiles | Sort-Object { $_.Name } -Descending)
    $selectedBackFiles = @()
    $tempLines = 0
    
    foreach ($file in $reversedFiles) {
        if ($tempLines -ge $backLimit) { break }
        $selectedBackFiles += $file
        $content = Get-Content $file.Path -Raw -Encoding UTF8
        $tempLines += ($content -split "`n").Count
    }
    
    # 按正常顺序输出
    [array]::Reverse($selectedBackFiles)
    foreach ($file in $selectedBackFiles) {
        $relativePath = $file.Path.Replace($ProjectRoot, "").TrimStart("\", "/")
        $content = Get-Content $file.Path -Raw -Encoding UTF8
        [void]$sb.AppendLine((Format-CodeBlock -FileName $relativePath -Content $content))
    }
    
    # 文件清单
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## 文件清单")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| 序号 | 文件名 | 路径 | 说明 |")
    [void]$sb.AppendLine("|-----|-------|------|------|")
    
    for ($i = 0; $i -lt $Stats.Files.Count; $i++) {
        $file = $Stats.Files[$i]
        $relativePath = $file.Path.Replace($ProjectRoot, "").TrimStart("\", "/")
        [void]$sb.AppendLine("| $($i + 1) | $($file.Name) | $relativePath | |")
    }
    
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("*本文档由 SoftAssist 工具自动生成*")
    
    return $sb.ToString()
}

# 主执行逻辑
try {
    Write-Log "开始提取源代码..."
    
    # 获取路径
    $scriptDir = $PSScriptRoot
    $configFullPath = Join-Path $scriptDir $ConfigPath
    $outputFullPath = Join-Path $scriptDir $OutputPath
    
    # 读取配置
    Write-Log "读取配置文件: $configFullPath"
    $config = Read-Config -Path $configFullPath
    
    # 获取项目根目录
    $projectRoot = Get-ProjectRoot
    $sourceDir = Join-Path $projectRoot "app\src\main\java"
    
    Write-Log "扫描源代码目录: $sourceDir"
    
    # 获取源文件
    $sourceFiles = Get-SourceFiles -SourceDir $sourceDir
    Write-Log "找到 $($sourceFiles.Count) 个源文件"
    
    # 统计代码
    $stats = Get-CodeStatistics -Files $sourceFiles
    Write-Log "总代码行数: $($stats.TotalLines)"
    
    # 检查代码行数是否足够
    if ($stats.TotalLines -lt 3000) {
        Write-Host "警告: 代码行数不足3000行，可能需要补充" -ForegroundColor Yellow
    }
    
    # 生成文档
    Write-Log "生成源代码文档..."
    $document = New-SourceCodeDocument -Config $config -Stats $stats -Files $sourceFiles -ProjectRoot $projectRoot
    
    # 确保输出目录存在
    $outputDir = Split-Path $outputFullPath -Parent
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    # 写入文件
    $document | Out-File -FilePath $outputFullPath -Encoding UTF8 -NoNewline
    
    Write-Log "源代码文档已生成: $outputFullPath"
    Write-Log "完成!"
    
} catch {
    Write-Host "错误: $_" -ForegroundColor Red
    exit 1
}
