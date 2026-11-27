param(
  [string]$Root = ".",
  [string]$Mode = "preview",
  [int]$Port = 0
)

$ErrorActionPreference = "Stop"

try {
  $RootPath = (Resolve-Path -LiteralPath $Root).Path
} catch {
  $RootPath = (Get-Location).Path
}

$CandidatePorts = if ($Port -gt 0) { @($Port) } else { @(18765, 18766, 18768, 18770, 28765, 38765, 8765) }
$Listener = $null
$BoundPort = 0

foreach ($p in $CandidatePorts) {
  $tryListener = New-Object System.Net.HttpListener
  $prefix = "http://127.0.0.1:$p/"
  $tryListener.Prefixes.Add($prefix)
  try {
    $tryListener.Start()
    $Listener = $tryListener
    $BoundPort = $p
    break
  } catch {
    try { $tryListener.Close() } catch {}
  }
}

function Find-ChromiumBrowser {
  $paths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($exe in $paths) {
    if ($exe -and (Test-Path -LiteralPath $exe -PathType Leaf)) {
      return $exe
    }
  }
  return $null
}

if ($null -eq $Listener) {
  Write-Host "[WARN] Local HTTP port bind unavailable. Falling back to direct file launch..."
  $FallbackHtml = Join-Path $RootPath "index.html"
  Start-Process -FilePath $FallbackHtml
  exit 0
}

$BaseUrl = "http://127.0.0.1:$BoundPort/index.html"
Write-Host "=================================================="
Write-Host "FlowerGodRealm Server Ready: $BaseUrl"
Write-Host "Root Directory : $RootPath"
Write-Host "Launch Mode    : $Mode"
Write-Host "Keep this window open during exhibition. Close window or press Ctrl+C to stop."
Write-Host "=================================================="

# Launch browser ONLY AFTER HttpListener has successfully started
if ($Mode -eq "kiosk") {
  $KioskUrl = "$BaseUrl`?kiosk=1&fit=cover"
  $Browser = Find-ChromiumBrowser
  if ($Browser) {
    $ProfileDir = Join-Path $env:TEMP "FlowerGodRealm_KioskProfile"
    $ArgsList = @(
      "--user-data-dir=`"$ProfileDir`"",
      "--no-proxy-server",
      "--kiosk",
      "--autoplay-policy=no-user-gesture-required",
      "--no-first-run",
      "--disable-session-crashed-bubble",
      "`"$KioskUrl`""
    )
    Start-Process -FilePath $Browser -ArgumentList $ArgsList
  } else {
    Start-Process -FilePath $KioskUrl
  }
} else {
  Start-Process -FilePath $BaseUrl
}

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".mp4"  = "video/mp4"
  ".webm" = "video/webm"
  ".mov"  = "video/quicktime"
  ".m4v"  = "video/x-m4v"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
}

try {
  while ($Listener.IsListening) {
    $Context = $Listener.GetContext()
    $Req = $Context.Request
    $Res = $Context.Response

    try {
      $RelPath = [System.Uri]::UnescapeDataString($Req.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrWhiteSpace($RelPath)) { $RelPath = "index.html" }
      $SafeRel = $RelPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $FullPath = [System.IO.Path]::GetFullPath((Join-Path $RootPath $SafeRel))

      if (-not $FullPath.StartsWith($RootPath, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
        $Res.StatusCode = 404
        $Res.Close()
        continue
      }

      $Ext = [System.IO.Path]::GetExtension($FullPath).ToLowerInvariant()
      $Res.ContentType = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { "application/octet-stream" }
      $Res.Headers.Add("Accept-Ranges", "bytes")
      $Res.Headers.Add("Cache-Control", "no-cache")

      $FileInfo = New-Object System.IO.FileInfo($FullPath)
      $TotalLen = $FileInfo.Length
      $RangeHeader = $Req.Headers["Range"]

      $Stream = [System.IO.File]::Open($FullPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
      try {
        if ($RangeHeader -and $RangeHeader -match "bytes=(\d*)-(\d*)") {
          $Start = if ($Matches[1] -ne "") { [long]$Matches[1] } else { 0 }
          $End = if ($Matches[2] -ne "") { [long]$Matches[2] } else { $TotalLen - 1 }
          if ($End -ge $TotalLen) { $End = $TotalLen - 1 }
          if ($Start -gt $End -or $Start -lt 0) {
            $Res.StatusCode = 416
            $Res.Close()
            continue
          }
          $ChunkLen = $End - $Start + 1
          $Res.StatusCode = 206
          $Res.ContentLength64 = $ChunkLen
          $Res.Headers.Add("Content-Range", "bytes $Start-$End/$TotalLen")
          $Stream.Position = $Start

          $Buf = New-Object byte[] 65536
          $Remaining = $ChunkLen
          while ($Remaining -gt 0) {
            $ToRead = [int][Math]::Min($Buf.Length, $Remaining)
            $Read = $Stream.Read($Buf, 0, $ToRead)
            if ($Read -le 0) { break }
            $Res.OutputStream.Write($Buf, 0, $Read)
            $Remaining -= $Read
          }
        } else {
          $Res.StatusCode = 200
          $Res.ContentLength64 = $TotalLen
          $Stream.CopyTo($Res.OutputStream)
        }
      } finally {
        $Stream.Close()
      }
      $Res.OutputStream.Close()
    } catch {
      try { $Res.Abort() } catch {}
    }
  }
} finally {
  $Listener.Stop()
  $Listener.Close()
}
