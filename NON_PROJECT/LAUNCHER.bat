@echo off
chcp 65001 >nul
color 0B
title Lovnge Platform Launcher

cls
echo.
echo ========================================
echo    LOVNGE PLATFORM - LAUNCHER
echo ========================================
echo.
echo  [1] Full Workflow (Qwen + Servers)
echo  [2] Qwen Session Only
echo  [3] View Roadmap
echo  [4] Start Servers
echo  [5] Stop All
echo  [6] Check Status
echo  [7] Open Chrome (Clear Cache)
echo  [0] Exit
echo.
echo ========================================
echo.
set /p choice=Select (0-7): 

if "%choice%"=="1" start "" cmd /k "dev-ultimate.bat"
if "%choice%"=="2" start "" cmd /k "qwen-session.bat"
if "%choice%"=="3" start CURRENT_ROADMAP.md
if "%choice%"=="4" goto START
if "%choice%"=="5" goto STOP
if "%choice%"=="6" goto STATUS
if "%choice%"=="7" start "" cmd /k "open-chrome.bat"
if "%choice%"=="0" exit

goto END

:START
cls
echo Starting servers...
docker ps | findstr "escort-" >nul || docker-compose -f docker-compose.dev.yml up -d
netstat -nno | findstr ":3000.*LISTENING" >nul || start "API" cmd /k "cd apps/api && npm run dev"
netstat -nno | findstr ":3001.*LISTENING" >nul || start "Web" cmd /k "cd apps/web && npm run dev"
echo Servers starting...
timeout /t 3 >nul
goto END

:STOP
cls
echo Stopping...
taskkill /F /FI "WINDOWTITLE eq Lovnge*" 2>nul
docker-compose -f docker-compose.dev.yml down
echo Stopped.
timeout /t 2 >nul
goto END

:STATUS
cls
echo Status:
netstat -nno | findstr ":3000 :3001" | findstr LISTENING
docker ps --format "  {{.Names}}"
pause
goto END

:END
exit
