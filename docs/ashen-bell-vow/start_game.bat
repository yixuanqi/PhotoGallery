@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel% equ 0 (
  python serve_local.py
) else (
  echo [ERROR] Python 3 not found.
  pause
)
