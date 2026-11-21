@echo off
setlocal
cd /d "%~dp0"
title Ashen Bell Vow v19.0 Local Server
echo ========================================================
echo   Ashen Bell Vow v19.0 - Local Launcher
echo ========================================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    echo [INFO] Starting local server with Python Launcher ^(py -3^)...
    py -3 serve_local.py
    goto :done
)

where python >nul 2>nul
if %errorlevel%==0 (
    echo [INFO] Starting local server with python...
    python serve_local.py
    goto :done
)

where python3 >nul 2>nul
if %errorlevel%==0 (
    echo [INFO] Starting local server with python3...
    python3 serve_local.py
    goto :done
)

where npx >nul 2>nul
if %errorlevel%==0 (
    echo [INFO] Python not found. Starting local server with npx serve on port 8080...
    start "" "http://localhost:8080/"
    npx --yes serve -l 8080 .
    goto :done
)

echo [ERROR] Neither Python 3 nor Node.js ^(npx^) was found in PATH.
echo Please install Python 3 from https://www.python.org/ and try again.
echo.

:done
if not %errorlevel%==0 (
    echo.
    echo [INFO] Server exited with code %errorlevel%.
)
pause
endlocal
