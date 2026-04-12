<#
.SYNOPSIS
    根据应用权限生成隐私政策页面

.DESCRIPTION
    该脚本读取 AndroidManifest.xml 中的权限信息，生成符合应用商店要求的隐私政策 HTML 页面。

.PARAMETER ConfigPath
    配置文件路径，默认为 ../config.json

.PARAMETER OutputPath
    输出文件路径，默认为 ../output/privacy-policy.html

.EXAMPLE
    ./generate-privacy.ps1
    使用默认配置生成隐私政策
#>

param(
    [string]$ConfigPath = "../config.json",
    [string]$OutputPath = "../output/privacy-policy.html"
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

function Get-PermissionInfo {
    param([string[]]$Permissions)
    
    $permissionMap = @{
        "READ_MEDIA_IMAGES" = @{
            Name = "读取照片权限"
            Code = "READ_MEDIA_IMAGES"
            Description = "读取相册中的照片，用于在应用内展示"
            Required = $true
        }
        "READ_MEDIA_VISUAL_USER_SELECTED" = @{
            Name = "部分照片访问权限"
            Code = "READ_MEDIA_VISUAL_USER_SELECTED"
            Description = "Android 14+ 支持用户选择部分照片授权"
            Required = $true
        }
        "READ_EXTERNAL_STORAGE" = @{
            Name = "读取外部存储权限"
            Code = "READ_EXTERNAL_STORAGE"
            Description = "Android 12及以下版本读取照片"
            Required = $true
        }
        "WRITE_EXTERNAL_STORAGE" = @{
            Name = "写入外部存储权限"
            Code = "WRITE_EXTERNAL_STORAGE"
            Description = "保存文件到外部存储"
            Required = $false
        }
        "CAMERA" = @{
            Name = "相机权限"
            Code = "CAMERA"
            Description = "使用相机拍摄照片"
            Required = $false
        }
        "INTERNET" = @{
            Name = "网络权限"
            Code = "INTERNET"
            Description = "访问网络，用于数据同步等功能"
            Required = $false
        }
        "ACCESS_FINE_LOCATION" = @{
            Name = "精确位置权限"
            Code = "ACCESS_FINE_LOCATION"
            Description = "获取精确地理位置"
            Required = $false
        }
        "ACCESS_COARSE_LOCATION" = @{
            Name = "粗略位置权限"
            Code = "ACCESS_COARSE_LOCATION"
            Description = "获取粗略地理位置"
            Required = $false
        }
    }
    
    $result = @()
    foreach ($perm in $Permissions) {
        if ($permissionMap.ContainsKey($perm)) {
            $result += $permissionMap[$perm]
        } else {
            $result += @{
                Name = $perm
                Code = $perm
                Description = "应用功能所需"
                Required = $true
            }
        }
    }
    
    return $result
}

function New-PrivacyPolicy {
    param(
        [object]$Config,
        [object[]]$PermissionInfo
    )
    
    $softwareName = $Config.softwareCopyright.softwareName
    $date = $Config.softwareCopyright.developmentCompletionDate
    $year = (Get-Date).Year
    
    $permissionRows = ""
    foreach ($perm in $PermissionInfo) {
        $required = if ($perm.Required) { "是" } else { "否" }
        $permissionRows += @"
                    <tr>
                        <td>$($perm.Name)<br>($($perm.Code))</td>
                        <td>$($perm.Description)</td>
                        <td>$required</td>
                    </tr>

"@
    }
    
    return @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$softwareName 隐私政策</title>
    <style>
        :root {
            --primary-color: #40513A;
            --secondary-color: #DCEFD2;
            --text-color: #333;
            --light-text: #666;
            --border-color: #e0e0e0;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.8;
            color: var(--text-color);
            background-color: #f9f9f9;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: linear-gradient(135deg, var(--secondary-color), #e8f4e5);
            padding: 40px 20px;
            text-align: center;
            border-bottom: 3px solid var(--primary-color);
        }
        
        header h1 {
            color: var(--primary-color);
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        header p {
            color: var(--light-text);
            font-size: 0.95em;
        }
        
        .content {
            background: white;
            padding: 40px;
            margin-top: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        h2 {
            color: var(--primary-color);
            font-size: 1.4em;
            margin: 30px 0 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--secondary-color);
        }
        
        h3 {
            color: var(--primary-color);
            font-size: 1.1em;
            margin: 20px 0 10px;
        }
        
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        ul {
            margin: 15px 0 15px 25px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        .highlight-box {
            background: var(--secondary-color);
            border-left: 4px solid var(--primary-color);
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .permission-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .permission-table th,
        .permission-table td {
            border: 1px solid var(--border-color);
            padding: 12px 15px;
            text-align: left;
        }
        
        .permission-table th {
            background: var(--secondary-color);
            color: var(--primary-color);
            font-weight: 600;
        }
        
        .permission-table tr:nth-child(even) {
            background: #fafafa;
        }
        
        .update-date {
            color: var(--light-text);
            font-size: 0.9em;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color);
        }
        
        footer {
            text-align: center;
            padding: 30px;
            color: var(--light-text);
            font-size: 0.85em;
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 20px;
            }
            
            header h1 {
                font-size: 1.6em;
            }
            
            .permission-table th,
            .permission-table td {
                padding: 8px 10px;
                font-size: 0.9em;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>$softwareName 隐私政策</h1>
        <p>隐私保护承诺</p>
    </header>
    
    <div class="container">
        <div class="content">
            <div class="highlight-box">
                <strong>重要声明：</strong>$softwareName 重视您的隐私保护。本隐私政策旨在向您说明我们如何处理与您相关的信息。
            </div>
            
            <h2>一、引言</h2>
            <p>感谢您使用 $softwareName（以下简称"本应用"）。我们深知个人隐私的重要性，并致力于保护您的个人信息安全。</p>
            
            <h2>二、信息收集</h2>
            <h3>2.1 我们不收集的信息</h3>
            <p>本应用明确承诺<strong>不收集</strong>以下信息：</p>
            <ul>
                <li>个人身份信息（姓名、邮箱、电话等）</li>
                <li>设备标识符（IMEI、设备ID等）</li>
                <li>地理位置信息</li>
                <li>使用行为数据</li>
            </ul>
            
            <h3>2.2 本地数据处理</h3>
            <p>本应用仅在您的设备本地处理数据，所有数据存储在应用私有目录中，其他应用无法访问。</p>
            
            <h2>三、权限说明</h2>
            <p>本应用请求以下权限，仅用于实现应用核心功能：</p>
            
            <table class="permission-table">
                <thead>
                    <tr>
                        <th>权限名称</th>
                        <th>用途说明</th>
                        <th>是否必须</th>
                    </tr>
                </thead>
                <tbody>
$permissionRows                </tbody>
            </table>
            
            <div class="highlight-box">
                <strong>权限使用原则：</strong>我们仅请求实现应用核心功能所必需的权限，不会请求任何与功能无关的权限。
            </div>
            
            <h2>四、数据安全</h2>
            <ul>
                <li>所有缓存数据存储在应用私有目录，其他应用无法访问</li>
                <li>应用退出后，缓存数据可被系统清理</li>
                <li>应用卸载时，所有数据将被自动删除</li>
            </ul>
            
            <h2>五、您的权利</h2>
            <p>作为用户，您拥有以下权利：</p>
            <ul>
                <li><strong>权限控制权</strong>：您可以随时在系统设置中修改或撤销授予本应用的权限</li>
                <li><strong>数据删除权</strong>：卸载应用将删除所有应用数据</li>
            </ul>
            
            <h2>六、隐私政策更新</h2>
            <p>我们可能会不时更新本隐私政策。更新后的政策将在应用内或官方渠道公布。</p>
            
            <h2>七、联系我们</h2>
            <p>如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：</p>
            <ul>
                <li>应用商店评论反馈</li>
                <li>开发者邮箱：（请填写实际邮箱）</li>
            </ul>
            
            <p class="update-date">
                <strong>最后更新日期：</strong>$date<br>
                <strong>生效日期：</strong>$date
            </p>
        </div>
    </div>
    
    <footer>
        <p>© $year $softwareName 开发团队. 保留所有权利。</p>
    </footer>
</body>
</html>
"@
}

# 主执行逻辑
try {
    Write-Log "开始生成隐私政策..."
    
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
    
    if ($null -eq $manifest) {
        Write-Host "警告: 未找到 AndroidManifest.xml" -ForegroundColor Yellow
        $permissions = @()
    } else {
        # 提取权限
        $matches = [regex]::Matches($manifest, 'android:name="android.permission.(\w+)"')
        $permissions = @($matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
    }
    
    Write-Log "发现权限: $($permissions -join ', ')"
    
    # 获取权限详情
    $permissionInfo = Get-PermissionInfo -Permissions $permissions
    
    # 生成隐私政策
    Write-Log "生成隐私政策..."
    $policy = New-PrivacyPolicy -Config $config -PermissionInfo $permissionInfo
    
    # 确保输出目录存在
    $outputDir = Split-Path $outputFullPath -Parent
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    # 写入文件
    $policy | Out-File -FilePath $outputFullPath -Encoding UTF8 -NoNewline
    
    Write-Log "隐私政策已生成: $outputFullPath"
    Write-Log "完成!"
    
} catch {
    Write-Host "错误: $_" -ForegroundColor Red
    exit 1
}
