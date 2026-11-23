@echo off
setlocal
cd /d "%~dp0"
title Ashen Bell Vow v44.2 - Multi-Platform Release Builder
echo ============================================================
echo   Ashen Bell Vow v44.2 - Offline Release Builder
echo   Outputs TapTap/4399 Offline ZIP + itch.io Web ZIP to dist\
echo ============================================================
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 tools\build_release.py
  goto :done
)
where python >nul 2>nul
if %errorlevel%==0 (
  python tools\build_release.py
  goto :done
)
echo [ERROR] Python 3 not found. Please install Python 3 first.
:done
echo.
pause
