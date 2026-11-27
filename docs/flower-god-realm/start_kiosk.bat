@echo off
setlocal
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
cd /d "%APP_DIR%"

echo Starting FlowerGodRealm Exhibition Kiosk Mode...
start "FlowerGodRealm-Server" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%\tools\local_server.ps1" -Root "%APP_DIR%" -Mode "kiosk"
endlocal
