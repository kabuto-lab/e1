@echo off
chcp 65001 >nul 2>&1
REM DEV-STACK.bat - Docker (compose.dev) + API :3000 + Web :3001
REM No args: if stack is up (compose containers and/or ports 3000|3001) -> stop; else -> start.
REM Args: restart|r = full restart; start = start only; stop = stop only.
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "REPO=%CD%"
set "COMPOSE_FILE=%REPO%\docker-compose.dev.yml"

echo.
echo  ========================================
echo   Lovnge - Docker + API + Web
echo  ========================================
echo.

if /I "%~1"=="restart" goto DO_RESTART
if /I "%~1"=="r" goto DO_RESTART
if /I "%~1"=="start" goto DO_START_ONLY
if /I "%~1"=="stop" goto DO_STOP_ONLY

call :CHECK_RUNNING
if !RUNNING! equ 1 (
  echo  Something is running - stopping all...
  echo.
  call :STOP_ALL
  echo.
  echo  Done: stack stopped.
) else (
  echo  Nothing running - starting stack...
  echo.
  call :START_ALL
  echo.
  echo  Done: stack started.
)
goto FINAL_PAUSE

:DO_RESTART
echo  Mode: full restart (stop + start)
echo.
call :STOP_ALL
echo.
echo  Pause 2 sec...
timeout /t 2 /nobreak >nul
echo.
call :START_ALL
echo.
echo  Done: restart finished.
goto FINAL_PAUSE

:DO_START_ONLY
call :START_ALL
echo.
echo  Done.
goto FINAL_PAUSE

:DO_STOP_ONLY
call :STOP_ALL
echo.
echo  Done.
goto FINAL_PAUSE

:FINAL_PAUSE
echo.
pause
exit /b 0

REM ---------------------------------------------------------------------------
REM  Running if: compose has running containers OR ports 3000/3001 listening
REM  Path via LOVNGE_REPO (param at end of -Command is unreliable from cmd.exe)
REM ---------------------------------------------------------------------------
:CHECK_RUNNING
set RUNNING=0
set "LOVNGE_REPO=%REPO%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$r = $env:LOVNGE_REPO; if ([string]::IsNullOrWhiteSpace($r)) { exit 1 }; Set-Location -LiteralPath $r; $dockerUp = $false; if (Get-Command docker -ErrorAction SilentlyContinue) { docker info *>$null | Out-Null; if ($?) { $cf = Join-Path $r 'docker-compose.dev.yml'; $raw = docker compose -f $cf ps -q 2>$null; if ($raw -match '\S') { $dockerUp = $true } } }; $portUp = $false; foreach ($p in 3000,3001) { if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) { $portUp = $true; break } }; if ($dockerUp -or $portUp) { exit 0 } else { exit 1 }"
if !errorlevel! equ 0 set RUNNING=1
exit /b 0

REM ---------------------------------------------------------------------------
:STOP_ALL
echo  [stop] Closing Lovnge API / Web windows...
taskkill /F /FI "WINDOWTITLE eq Lovnge API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Lovnge Web*" >nul 2>&1

echo  [stop] Freeing ports 3000 and 3001 (if listening)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "foreach ($p in 3000,3001) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

echo  [stop] Docker Compose down...
docker info >nul 2>&1
if !errorlevel! equ 0 (
  docker compose -f "%COMPOSE_FILE%" down
  if !errorlevel! neq 0 docker-compose -f "%COMPOSE_FILE%" down
) else (
  echo        Docker is not running - skipping compose down.
)
exit /b 0

REM ---------------------------------------------------------------------------
:START_ALL
echo  [start] Docker...
REM Label inside if (...) breaks cmd.exe parsing (window may close instantly).
docker info >nul 2>&1
if !errorlevel! equ 0 (
    echo        Docker already running.
    goto docker_ready2
)
echo        Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
if !errorlevel! neq 0 start "" "%LOCALAPPDATA%\Docker\Docker Desktop.exe" 2>nul
set "retries=0"
:wait_docker2
set /a retries+=1
if !retries! gtr 60 (
    echo        [ERROR] Docker did not become ready in 60s.
    exit /b 1
)
timeout /t 2 /nobreak >nul
docker info >nul 2>&1
if !errorlevel! neq 0 goto wait_docker2
echo        Docker is ready.
:docker_ready2

echo  [start] compose down --remove-orphans + stale escort-* ...
docker compose -f "%COMPOSE_FILE%" down --remove-orphans -t 60 2>nul
docker rm -f escort-postgres escort-redis escort-minio escort-minio-init escort-mailhog 2>nul

echo  [start] docker compose up -d...
docker compose -f "%COMPOSE_FILE%" up -d
if !errorlevel! neq 0 (
  docker-compose -f "%COMPOSE_FILE%" down --remove-orphans --timeout 60 2>nul
  docker rm -f escort-postgres escort-redis escort-minio escort-minio-init escort-mailhog 2>nul
  docker-compose -f "%COMPOSE_FILE%" up -d
)
if !errorlevel! neq 0 (
    echo        [ERROR] Failed to start containers.
    exit /b 1
)

echo  [start] Waiting for PostgreSQL...
set "retries=0"
:wait_pg2
set /a retries+=1
if !retries! gtr 30 (
    echo        [WARN] pg_isready timeout, continuing...
    goto pg_ok2
)
docker exec escort-postgres pg_isready -U postgres >nul 2>&1
if !errorlevel! neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_pg2
)
echo        PostgreSQL is ready.
:pg_ok2

echo  [start] Drizzle migrate + admin + demo models...
pushd "%REPO%"
if not exist "node_modules\" call npm install
if not exist "node_modules\concurrently\" call npm install
call npm run db:migrate --workspace=@escort/db
if !errorlevel! neq 0 (
  echo        [ERROR] db:migrate failed.
  popd
  exit /b 1
)
pushd "apps\api"
call npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts
call npx ts-node -r tsconfig-paths/register src/scripts/seed-models-simple.ts
popd
popd

echo  [start] API + Web in THIS window (Ctrl+C stops both^)...
echo.
echo   API:      http://localhost:3000
echo   Swagger:  http://localhost:3000/api/docs
echo   Web:      http://localhost:3001
echo   MinIO:    http://localhost:9001
echo   Mailhog:  http://localhost:8025
echo.
echo   Test login: test@test.com / password123
echo   One-window dev: LOVNGE-DEV.bat
echo   Tip: DEV-STACK.bat restart ^| stop ^| start
echo.

pushd "%REPO%"
call npm run dev:apps
set "EC=!errorlevel!"
popd
exit /b !EC!
