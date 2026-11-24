@echo off
setlocal
chcp 65001 >nul 2>&1
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"

echo ========================================================
echo   Ashen Bell Vow v45.3 - Level Editor Launcher
echo ========================================================
echo.

if not exist "serve_local.py" (
  echo [ERROR] serve_local.py not found in current folder.
  pause
  exit /b 1
)

py -3 -c "import sys" >nul 2>&1
if %errorlevel%==0 (
  py -3 serve_local.py --editor
  goto :after_run
)

python -c "import sys" >nul 2>&1
if %errorlevel%==0 (
  python serve_local.py --editor
  goto :after_run
)

py -c "import sys" >nul 2>&1
if %errorlevel%==0 (
  py serve_local.py --editor
  goto :after_run
)

python3 -c "import sys" >nul 2>&1
if %errorlevel%==0 (
  python3 serve_local.py --editor
  goto :after_run
)

where npx >nul 2>&1
if %errorlevel%==0 (
  echo Python not found. Starting local server via Node.js...
  start "" "http://localhost:8080/editor.html"
  npx --yes serve -l 8080 .
  goto :after_run
)

echo [ERROR] Neither Python 3 nor Node.js (npx) was detected.
pause
exit /b 1

:after_run
if not %errorlevel%==0 (
  echo.
  echo [INFO] Local server exited with code: %errorlevel%
  pause
)
endlocal
