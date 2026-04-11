@echo off
setlocal

set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot
set ANDROID_HOME=C:\Android\android-sdk

echo ========================================
echo  PhotoGallery - Debug APK Build
echo ========================================
echo.

call "%~dp0gradlew.bat" assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  BUILD SUCCESSFUL
    echo  APK: app\build\outputs\apk\debug\app-debug.apk
    echo ========================================
) else (
    echo.
    echo ========================================
    echo  BUILD FAILED (exit code: %ERRORLEVEL%)
    echo ========================================
)

endlocal
