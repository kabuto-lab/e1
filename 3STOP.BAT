@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo  ========================================
echo   Lovnge Platform - STOP
echo  ========================================
echo.

echo  [1/2] Stopping app servers...
taskkill /F /FI "WINDOWTITLE eq Lovnge API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Lovnge Web*" >nul 2>&1
echo        Done.
echo.

echo  [2/2] Stopping Docker containers...
docker-compose -f docker-compose.dev.yml down
echo        Done.
echo.

echo  ========================================
echo   All services stopped.
echo  ========================================
echo.
pause
