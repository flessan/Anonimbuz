@echo off
setlocal EnableDelayedExpansion

echo ========================================
echo   ANONIMBUZ - FRESH START
echo ========================================
echo.

:: [1] Hentikan proses node/wrangler yang mungkin masih berjalan
echo [1/4] Stopping existing processes...
taskkill /f /im node.exe 2>nul
timeout /t 1 /nobreak >nul
echo       Done.

:: [2] Bersihkan semua cache
echo [2/4] Nuking caches...
if exist .wrangler rmdir /s /q .wrangler
if exist web\dist rmdir /s /q web\dist
if exist web\node_modules\.vite rmdir /s /q web\node_modules\.vite
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist web\node_modules\.cache rmdir /s /q web\node_modules\.cache
echo       All caches cleared.

:: [3] Rebuild frontend dari nol
echo [3/4] Rebuilding frontend...
cd web
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ Build failed! Check the errors above.
    cd ..
    pause
    exit /b 1
)
cd ..
echo       Build successful.

:: [4] Jalankan Wrangler
echo [4/4] Starting local server...
echo.
wrangler pages dev web/dist --port 8788