@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "REPO=%CD%"
set "NORESTART=0"
set "EXTRA="

REM Optional args (any order):
REM   force      -> --force  (перезалить stock/* даже если у модели уже есть медиа)
REM   dry        -> --dry-run (только скачать с стоков, без MinIO и БД)
REM   norestart  -> не перезапускать окна Lovnge API / Web после импорта
REM Example: INGEST-STOCK-MEDIA.bat force
REM          INGEST-STOCK-MEDIA.bat dry norestart

:parse
if "%~1"=="" goto parsed
if /i "%~1"=="force" set "EXTRA=!EXTRA! --force"
if /i "%~1"=="dry" set "EXTRA=!EXTRA! --dry-run"
if /i "%~1"=="norestart" set "NORESTART=1"
shift
goto parse
:parsed

echo.
echo  ========================================
echo   Lovnge - import stock photos to MinIO
echo  ========================================
echo   Docker + Postgres, then ingest-stock-media
echo   After success: restart Lovnge API + Web
echo   (skip restart: add argument norestart)
echo  ========================================
echo.

echo  [1/4] Docker...
docker info >nul 2>&1
if !errorlevel! equ 0 (
    echo        Docker is running.
    goto docker_ok_ingest
)
echo        Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
if !errorlevel! neq 0 start "" "%LOCALAPPDATA%\Docker\Docker Desktop.exe" 2>nul
set "retries=0"
:wait_docker_ingest
set /a retries+=1
if !retries! gtr 60 (
    echo        [ERROR] Docker did not start in time.
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
docker info >nul 2>&1
if !errorlevel! neq 0 goto wait_docker_ingest
echo        Docker is ready.
:docker_ok_ingest
echo.

echo  [2/4] docker compose up -d ...
docker compose -f docker-compose.dev.yml up -d
if !errorlevel! neq 0 docker-compose -f docker-compose.dev.yml up -d
if !errorlevel! neq 0 (
    echo        [ERROR] docker compose failed.
    pause
    exit /b 1
)
echo.

echo        Waiting for PostgreSQL...
set "retries=0"
:wait_pg
set /a retries+=1
if !retries! gtr 45 (
    echo        [WARNING] pg_isready timeout - ingest may still work if DB is up.
    goto pg_done
)
docker exec escort-postgres pg_isready -U postgres >nul 2>&1
if !errorlevel! neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_pg
)
echo        PostgreSQL is ready.
:pg_done
echo.

echo  [3/4] ingest-stock-media (apps\api^) ...
echo        Extra: !EXTRA!
pushd "%REPO%\apps\api"
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo        [ERROR] node not in PATH.
    popd
    pause
    exit /b 1
)
REM Снижает таймауты к Unsplash на Windows, если IPv6/маршрутизация кривая
if defined NODE_OPTIONS (
    set "NODE_OPTIONS=--dns-result-order=ipv4first !NODE_OPTIONS!"
) else (
    set "NODE_OPTIONS=--dns-result-order=ipv4first"
)
call npx ts-node -r tsconfig-paths/register src/scripts/ingest-stock-media.ts !EXTRA!
set "INGEST_ERR=!errorlevel!"
popd
if !INGEST_ERR! neq 0 (
    echo.
    echo        [ERROR] Ingest failed (exit !INGEST_ERR!^).
    pause
    exit /b 1
)
echo.

if "!NORESTART!"=="1" (
    echo  [4/4] Skip restart (norestart^).
    goto finish
)

echo  [4/4] Restart Lovnge API + Web (new windows^) ...
echo        Import does not require restart - data is already in DB and MinIO.
echo        Restart is optional: clean dev state / new Node processes.
taskkill /F /FI "WINDOWTITLE eq Lovnge API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Lovnge Web*" >nul 2>&1
timeout /t 2 /nobreak >nul
start "Lovnge API" cmd /k "cd /d "!REPO!" && cd apps\api && npm run dev"
timeout /t 2 /nobreak >nul
start "Lovnge Web" cmd /k "cd /d "!REPO!" && cd apps\web && set NODE_OPTIONS=--max-old-space-size=8192 && npm run dev"

:finish
echo.
echo  ========================================
echo   Done
echo  ========================================
echo   API: http://localhost:3000
echo   Web: http://localhost:3001
echo   MinIO: http://localhost:9001
echo.
pause
