param(
    [string]$RepoUrl = ""
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "  GitHub Pages 部署脚本" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$docsPath = Join-Path $projectRoot "docs"

Write-Host "[1/4] 检查 Git 状态..." -ForegroundColor Yellow

Push-Location $projectRoot

if (-not (Test-Path ".git")) {
    Write-Host "  初始化 Git 仓库..." -ForegroundColor Cyan
    git init
}

$gitStatus = git status --porcelain 2>$null
if ($gitStatus) {
    Write-Host "  发现未提交的更改" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[2/4] 同步文档文件..." -ForegroundColor Yellow

$sourceFiles = @(
    @{Src = "SoftAssist\output\privacy-policy.html"; Dest = "docs\privacy-policy.html"}
)

foreach ($file in $sourceFiles) {
    $srcPath = Join-Path $projectRoot $file.Src
    $destPath = Join-Path $projectRoot $file.Dest
    
    if (Test-Path $srcPath) {
        Copy-Item $srcPath $destPath -Force
        Write-Host "  已复制: $($file.Src) -> $($file.Dest)" -ForegroundColor Cyan
    } else {
        Write-Host "  警告: 找不到源文件 $($file.Src)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[3/4] 检查远程仓库..." -ForegroundColor Yellow

$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    if ($RepoUrl) {
        Write-Host "  添加远程仓库: $RepoUrl" -ForegroundColor Cyan
        git remote add origin $RepoUrl
    } else {
        Write-Host ""
        Write-Host "  请先创建 GitHub 仓库，然后运行:" -ForegroundColor Red
        Write-Host "  git remote add origin https://github.com/你的用户名/PhotoGallery.git" -ForegroundColor White
        Write-Host ""
        Write-Host "  或使用参数:" -ForegroundColor Red
        Write-Host "  ./deploy-pages.ps1 -RepoUrl 'https://github.com/你的用户名/PhotoGallery.git'" -ForegroundColor White
        Pop-Location
        exit 1
    }
} else {
    Write-Host "  远程仓库: $remoteUrl" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[4/4] 提交并推送..." -ForegroundColor Yellow

git add docs/
git status --short docs/

$hasChanges = git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
    $commitMsg = "docs: 更新应用文档页面 - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    git commit -m $commitMsg
    Write-Host "  已提交: $commitMsg" -ForegroundColor Cyan
    
    $branch = git branch --show-current
    if (-not $branch) { $branch = "main" }
    
    Write-Host "  推送到 $branch 分支..." -ForegroundColor Cyan
    git push -u origin $branch
} else {
    Write-Host "  没有需要提交的更改" -ForegroundColor Cyan
}

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  部署完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 访问 GitHub 仓库 Settings -> Pages" -ForegroundColor White
Write-Host "2. Source 选择 'Deploy from a branch'" -ForegroundColor White
Write-Host "3. Branch 选择 'main' (或 master) + '/docs' 文件夹" -ForegroundColor White
Write-Host "4. 等待部署完成后访问:" -ForegroundColor White
Write-Host "   https://你的用户名.github.io/PhotoGallery/" -ForegroundColor Cyan
Write-Host ""
Write-Host "隐私政策链接:" -ForegroundColor Yellow
Write-Host "   https://你的用户名.github.io/PhotoGallery/privacy-policy.html" -ForegroundColor Cyan
Write-Host ""
