<#
.SYNOPSIS
    SoftAssist 主脚本 - 执行所有软著材料生成任务

.DESCRIPTION
    该脚本依次执行源代码提取、用户手册生成、隐私政策生成，一次性生成所有软著申请所需的材料。

.PARAMETER SkipSource
    跳过源代码文档生成

.PARAMETER SkipManual
    跳过用户手册生成

.PARAMETER SkipPrivacy
    跳过隐私政策生成

.EXAMPLE
    ./run-all.ps1
    执行所有任务

.EXAMPLE
    ./run-all.ps1 -SkipPrivacy
    跳过隐私政策生成
#>

param(
    [switch]$SkipSource,
    [switch]$SkipManual,
    [switch]$SkipPrivacy,
    [switch]$Deploy,
    [string]$RepoUrl = ""
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Title)
    
    $width = 60
    $line = "=" * $width
    
    Write-Host ""
    Write-Host $line -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host $line -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param(
        [int]$Step,
        [int]$Total,
        [string]$Message
    )
    
    Write-Host "[$Step/$Total] $Message" -ForegroundColor Yellow
}

function Invoke-Script {
    param([string]$ScriptPath)
    
    $scriptDir = $PSScriptRoot
    $fullPath = Join-Path $scriptDir $ScriptPath
    
    if (-not (Test-Path $fullPath)) {
        throw "脚本不存在: $fullPath"
    }
    
    & $fullPath
    if ($LASTEXITCODE -ne 0) {
        throw "脚本执行失败: $ScriptPath"
    }
}

# 主执行逻辑
try {
    $startTime = Get-Date
    
    Write-Header "SoftAssist - 软著材料生成工具"
    
    Write-Host "本工具将自动生成以下材料：" -ForegroundColor White
    Write-Host "  1. 源代码文档（source-code-document.md）" -ForegroundColor White
    Write-Host "  2. 用户操作手册" -ForegroundColor White
    Write-Host "  3. 隐私政策页面" -ForegroundColor White
    Write-Host ""
    
    $totalSteps = 3
    $currentStep = 0
    
    # 步骤1：源代码文档
    if (-not $SkipSource) {
        $currentStep++
        Write-Step -Step $currentStep -Total $totalSteps -Message "提取源代码..."
        Invoke-Script "extract-source.ps1"
    } else {
        Write-Host "[跳过] 源代码文档生成" -ForegroundColor Gray
    }
    
    # 步骤2：用户手册
    if (-not $SkipManual) {
        $currentStep++
        Write-Step -Step $currentStep -Total $totalSteps -Message "生成用户手册..."
        Invoke-Script "generate-manual.ps1"
    } else {
        Write-Host "[跳过] 用户手册生成" -ForegroundColor Gray
    }
    
    # 步骤3：隐私政策
    if (-not $SkipPrivacy) {
        $currentStep++
        Write-Step -Step $currentStep -Total $totalSteps -Message "生成隐私政策..."
        Invoke-Script "generate-privacy.ps1"
    } else {
        Write-Host "[跳过] 隐私政策生成" -ForegroundColor Gray
    }
    
    # 完成
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Header "生成完成"
    
    Write-Host "输出文件位置：" -ForegroundColor Green
    Write-Host "  - output/source-code-document.md" -ForegroundColor White
    Write-Host "  - output/user-manual.md" -ForegroundColor White
    Write-Host "  - output/privacy-policy.html" -ForegroundColor White
    Write-Host ""
    Write-Host "耗时: $($duration.TotalSeconds.ToString('F2')) 秒" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "后续步骤：" -ForegroundColor Yellow
    Write-Host "  1. 检查生成的文档内容" -ForegroundColor White
    Write-Host "  2. 补充个人信息（姓名、身份证号等）" -ForegroundColor White
    Write-Host "  3. 将隐私政策部署到可访问的网址" -ForegroundColor White
    Write-Host "  4. 准备软著申请材料提交" -ForegroundColor White
    
    if ($Deploy) {
        Write-Host ""
        Write-Step -Step 4 -Total 4 -Message "部署到 GitHub Pages..."
        $deployScript = Join-Path $PSScriptRoot "deploy-pages.ps1"
        if ($RepoUrl) {
            & $deployScript -RepoUrl $RepoUrl
        } else {
            & $deployScript
        }
    }
    
} catch {
    Write-Host ""
    Write-Host "执行失败: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}
