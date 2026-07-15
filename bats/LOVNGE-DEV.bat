@echo off
REM LOVNGE-DEV.bat - MUST be saved as ANSI (Windows-1252) or pure ASCII.
REM UTF-8 breaks cmd.exe line parsing on many Windows setups.
chcp 65001 >nul 2>&1
REM One window: Docker + migrations + API :3000 + Web :3001 (concurrently).
REM   (no args)  full restart: free ports, compose up, migrate, dev:apps
REM   stop       kill dev ports + docker compose down only
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "REPO=%CD%"
set "COMPOSE_FILE=%REPO%\docker-compose.dev.yml"

if /I "%~1"=="stop" goto DO_STOP_ONLY
if /I "%~1"=="down" goto DO_STOP_ONLY

echo.
echo  ========================================
echo   Lovnge dev - single terminal
echo  ========================================
echo.

echo  [1/5] Stopping listeners on :3000 / :3001...
taskkill /F /FI "WINDOWTITLE eq Lovnge API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Lovnge Web*" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "foreach ($p in 3000,3001) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
timeout /t 1 /nobreak >nul
echo        Done.
echo.

echo  [2/5] Docker...
REM Never put :labels inside IF (...). It breaks cmd and closes the window.
docker info >nul 2>&1
if !errorlevel! equ 0 (
    echo        Docker is already running.
    goto docker_ready
)
echo        Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
if !errorlevel! neq 0 start "" "%LOCALAPPDATA%\Docker\Docker Desktop.exe" 2>nul
set "retries=0"
:wait_docker
set /a retries+=1
if !retries! gtr 60 (
    echo        [ERROR] Docker not ready after 60s.
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
docker info >nul 2>&1
if !errorlevel! neq 0 goto wait_docker
echo        Docker is ready.
:docker_ready
echo.

echo  [3/5] docker compose (fresh up^)...
docker compose -f "%COMPOSE_FILE%" down --remove-orphans -t 60 2>nul
docker rm -f escort-postgres escort-redis escort-minio escort-minio-init escort-mailhog 2>nul
docker compose -f "%COMPOSE_FILE%" up -d
if !errorlevel! neq 0 (
  docker-compose -f "%COMPOSE_FILE%" down --remove-orphans --timeout 60 2>nul
  docker rm -f escort-postgres escort-redis escort-minio escort-minio-init escort-mailhog 2>nul
  docker-compose -f "%COMPOSE_FILE%" up -d
)
if !errorlevel! neq 0 (
    echo        [ERROR] docker compose up failed.
    pause
    exit /b 1
)

echo        Waiting for PostgreSQL...
set "retries=0"
:wait_pg
set /a retries+=1
if !retries! gtr 30 (
    echo        [WARN] pg_isready timeout, continuing...
    goto pg_ok
)
docker exec escort-postgres pg_isready -U postgres >nul 2>&1
if !errorlevel! neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_pg
)
echo        PostgreSQL is ready.
:pg_ok
echo.

echo  [4/5] Drizzle migrate + admin + demo models...
pushd "%REPO%"
if not exist "node_modules\" (
    echo        npm install at repo root...
    call npm install
)
if not exist "node_modules\concurrently\" (
    echo        npm install (concurrently^)...
    call npm install
)
call npm run db:migrate --workspace=@escort/db
if !errorlevel! neq 0 (
    echo        [ERROR] db:migrate
    popd
    pause
    exit /b 1
)
pushd "apps\api"
call npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts
call npx ts-node -r tsconfig-paths/register src/scripts/seed-models-simple.ts
popd
popd
echo.

echo  [5/5] API + Web in THIS window (Ctrl+C stops both^)
echo.
echo   API:      http://localhost:3000
echo   Swagger:  http://localhost:3000/api/docs
echo   Web:      http://localhost:3001
echo   MinIO:    http://localhost:9001
echo   Mailhog:  http://localhost:8025
echo   Demo:     test@test.com / password123
echo   Admin:    admin@lovnge.local / Admin123!
echo.
echo  ----------------------------------------
echo.

pushd "%REPO%"
call npm run dev:apps
set "EXITCODE=!errorlevel!"
popd

echo.
echo  dev:apps exited with code !EXITCODE!
pause
exit /b !EXITCODE!

:DO_STOP_ONLY
echo  [stop] Closing titled Lovnge API/Web windows...
taskkill /F /FI "WINDOWTITLE eq Lovnge API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Lovnge Web*" >nul 2>&1
echo  [stop] Ports 3000 / 3001...
powershell -NoProfile -ExecutionPolicy Bypass -Command "foreach ($p in 3000,3001) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
docker info >nul 2>&1
if !errorlevel! equ 0 (
  echo  [stop] docker compose down...
  docker compose -f "%COMPOSE_FILE%" down --remove-orphans -t 60 2>nul
  if !errorlevel! neq 0 docker-compose -f "%COMPOSE_FILE%" down --remove-orphans --timeout 60 2>nul
) else (
  echo  Docker not running - skipping compose down.
)
echo.
echo  Stack stopped.
pause
exit /b 0
