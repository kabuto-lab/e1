@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "REPO=%CD%"

REM Usage:
REM   CLEAN-NEXT-WEB.bat        = full clean + next build + dev
REM   CLEAN-NEXT-WEB.bat quick  = clean .next only + dev (no production build)

echo.
echo  ========================================
echo   Next.js Web: clean cache, optional build, dev
echo  ========================================
echo   Stops "Lovnge Web" window, deletes apps\web\.next,
echo   then either "next build" ^(default^) or skip ^(quick^),
echo   then starts npm run dev on :3001
echo  ========================================
echo.

echo  [1/4] Stopping Lovnge Web (frees .next locks)...
taskkill /F /FI "WINDOWTITLE eq Lovnge Web*" >nul 2>&1
if !errorlevel! equ 0 (
    echo        Stopped Lovnge Web window.
) else (
    echo        No Lovnge Web window found ^(or already closed^).
)
timeout /t 2 /nobreak >nul
echo.

echo  [2/4] Removing apps\web\.next ...
if exist "%REPO%\apps\web\.next\" (
    rmdir /s /q "%REPO%\apps\web\.next"
    if !errorlevel! neq 0 (
        echo        [ERROR] Could not delete .next - close editors using it and retry.
        pause
        exit /b 1
    )
    echo        Removed.
) else (
    echo        No .next folder ^(already clean^).
)
echo.

if /i "%~1"=="quick" (
    echo  [3/4] Skipping production build ^(quick mode^).
    echo        Dev server will compile on demand.
    goto startdev
)

echo  [3/4] npm run build in apps\web ...
echo        NODE_OPTIONS=--max-old-space-size=8192 ^(heap^)
pushd "%REPO%\apps\web"
set "NODE_OPTIONS=--max-old-space-size=8192"
call npm run build
set "BUILD_ERR=!errorlevel!"
set "NODE_OPTIONS="
popd
if !BUILD_ERR! neq 0 (
    echo.
    echo        [ERROR] Build failed ^(exit !BUILD_ERR!^).
    echo        If you see 3221225477: Windows native worker crash. Try:
    echo          - Node LTS from nodejs.org, exclude repo from AV real-time scan
    echo          - Run: CLEAN-NEXT-WEB.bat quick   ^(clean + dev, no next build^)
    echo.
    pause
    exit /b 1
)
echo.

:startdev
echo  [4/4] Starting Next dev :3001 in new window...
start "Lovnge Web" cmd /k "cd /d "!REPO!" && cd apps\web && set NODE_OPTIONS=--max-old-space-size=8192 && npm run dev"
echo.
echo  ========================================
echo   Done - Web: http://localhost:3001
echo  ========================================
echo.
pause
