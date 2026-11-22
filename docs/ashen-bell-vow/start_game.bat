@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 serve_local.py
  goto :done
)
where python3 >nul 2>nul
if %errorlevel%==0 (
  python3 serve_local.py
  goto :done
)
python serve_local.py
:done
pause
