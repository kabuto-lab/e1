@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."
set "REPO=%CD%"

echo.
echo  ========================================
echo   Lovnge Platform - START
echo  ========================================
echo.

REM --- Kill stale Node processes from previous runs ---
echo  [1/5] Cleaning up stale processes...
taskkill /F /FI "WINDOWTITLE eq Lovnge API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Lovnge Web*" >nul 2>&1
echo        Done.
echo.

REM --- Start Docker Desktop if not running ---
echo  [2/5] Checking Docker...
docker info >nul 2>&1
if !errorlevel! neq 0 (
    echo        Docker not running. Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
    if !errorlevel! neq 0 (
        start "" "%LOCALAPPDATA%\Docker\Docker Desktop.exe" 2>nul
    )
    echo        Waiting for Docker daemon...
    set "retries=0"
    :wait_docker
    set /a retries+=1
    if !retries! gtr 60 (
        echo        [ERROR] Docker did not start after 60 seconds.
        pause
        exit /b 1
    )
    timeout /t 2 /nobreak >nul
    docker info >nul 2>&1
    if !errorlevel! neq 0 goto wait_docker
    echo        Docker is ready.
) else (
    echo        Docker is already running.
)
echo.

REM --- Stop native PostgreSQL if running (conflicts with Docker on port 5432) ---
echo        Checking for native PostgreSQL...
sc query postgresql-x64-18 | find "RUNNING" >nul 2>&1
if !errorlevel! equ 0 (
    echo        Stopping native PostgreSQL 18 ^(port conflict^)...
    net stop postgresql-x64-18 >nul 2>&1
    timeout /t 2 /nobreak >nul
)
sc query postgresql-x64-17 | find "RUNNING" >nul 2>&1
if !errorlevel! equ 0 (
    echo        Stopping native PostgreSQL 17 ^(port conflict^)...
    net stop postgresql-x64-17 >nul 2>&1
    timeout /t 2 /nobreak >nul
)
echo.

REM --- Start containers ---
echo  [3/5] Starting Docker containers...
docker-compose -f docker-compose.dev.yml up -d
if !errorlevel! neq 0 (
    echo        [ERROR] Failed to start containers.
    pause
    exit /b 1
)
echo.

REM --- Wait for PostgreSQL health check ---
echo        Waiting for PostgreSQL...
set "retries=0"
:wait_pg
set /a retries+=1
if !retries! gtr 30 (
    echo        [WARNING] PostgreSQL health check timed out. Continuing anyway...
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

REM --- Start API ---
echo  [4/5] Starting API server (NestJS :3000)...
start "Lovnge API" cmd /k "cd /d "!REPO!" && cd apps\api && npm run dev"
echo        Waiting for API...
set "retries=0"
:wait_api
set /a retries+=1
if !retries! gtr 60 (
    echo        [WARNING] API health check timed out. Continuing anyway...
    goto api_done
)
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000/health >nul 2>&1
if !errorlevel! neq 0 goto wait_api
echo        API is ready.
:api_done
echo.

REM --- Start Web ---
echo  [5/5] Starting Web server (Next.js :3001)...
start "Lovnge Web" cmd /k "cd /d "!REPO!" && cd apps\web && npm run dev"
echo.

echo  ========================================
echo   All services started!
echo  ========================================
echo.
echo   API:      http://localhost:3000
echo   Swagger:  http://localhost:3000/api/docs
echo   Web:      http://localhost:3001
echo   MinIO:    http://localhost:9001
echo   Mailhog:  http://localhost:8025
echo.
echo   Login:    test@test.com / password123
echo.
pause
