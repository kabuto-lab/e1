@echo off
setlocal enabledelayedexpansion
chcp 65001 >NUL
title Lovnge DEV

echo.
echo   ____  _____ __   __
echo  ^|  _ \^|  ___^|\ \ / /
echo  ^| ^| ^| ^| ^|_    \ V /
echo  ^| ^|_^| ^|  _^|    ^| ^|
echo  ^|____/^|___^|    ^|_^|
echo.
echo   api :3000   web :3001   bot embedded in api
echo   ---------------------------------------------
echo.

REM --- Kill stale services ---
echo [kill] :3000 / :3001 / prior bot window
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >NUL 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >NUL 2>&1
REM standalone bot removed — bot is embedded in API (BotService)
taskkill /FI "WINDOWTITLE eq API ts-node :3000"  /F >NUL 2>&1
taskkill /FI "WINDOWTITLE eq Web Next :3001"     /F >NUL 2>&1

REM --- Docker ---
echo [docker] docker-compose up -d
pushd "%~dp0\.."
docker-compose -f docker-compose.dev.yml up -d
if errorlevel 1 (
  echo.
  echo   !! Docker failed. Start Docker Desktop first:
  echo      "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  popd
  pause
  exit /b 1
)

echo [wait] 3s for Postgres
timeout /t 3 /nobreak >NUL

echo.
echo   ---------------------------------------------
echo   Starting api + web (bot embedded in api, Ctrl+C to stop all)
echo   ---------------------------------------------
echo.

set ROOT=%CD%

echo [start] API  :3000
start "API ts-node :3000" cmd /k "cd /d %ROOT% && npm run dev --workspace=@escort/api"

echo [start] Web  :3001
start "Web Next :3001" cmd /k "cd /d %ROOT% && npm run dev --workspace=@escort/web"

popd
endlocal

echo.
echo   All services launched in separate windows.
echo   Close those windows to stop.
pause
