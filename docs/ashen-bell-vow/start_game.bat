@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Ashen Bell Vow v14 - Local Server

echo ========================================================
echo   Ashen Bell Vow v14 - Local Server Launcher
echo ========================================================
echo.

set "PY_CMD="
py -3 -c "import sys; sys.exit(0 if sys.version_info[0]>=3 else 1)" >nul 2>&1
if not errorlevel 1 set "PY_CMD=py -3"
if defined PY_CMD goto run_python

python -c "import sys; sys.exit(0 if sys.version_info[0]>=3 else 1)" >nul 2>&1
if not errorlevel 1 set "PY_CMD=python"
if defined PY_CMD goto run_python

python3 -c "import sys; sys.exit(0 if sys.version_info[0]>=3 else 1)" >nul 2>&1
if not errorlevel 1 set "PY_CMD=python3"
if defined PY_CMD goto run_python

where npx >nul 2>&1
if not errorlevel 1 goto run_npx

echo [ERROR] Python 3 or Node.js (npx) was not found.
echo.
echo Please try one of the following:
echo   1. Install Python 3 from https://www.python.org and re-run this script.
echo   2. Open this folder in VS Code and launch index.html with Live Server.
echo   3. Upload this folder to GitHub Pages (HTTPS) to play online.
echo.
pause
exit /b 1

:run_python
set PYTHONUTF8=1
echo Starting local server with %PY_CMD% serve_local.py ...
echo Game:   http://localhost:8080/
echo Editor: http://localhost:8080/editor.html
echo.
%PY_CMD% serve_local.py
pause
exit /b 0

:run_npx
echo Starting static server with npx serve on http://localhost:8080 ...
echo Note: Local editor disk-save API requires Python (serve_local.py).
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080/"
npx --yes serve -l 8080 .
pause
exit /b 0
