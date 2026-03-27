@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo  ========================================
echo   Lovnge Platform - RESTART
echo  ========================================
echo.

REM --- Kill app servers ---
echo  [1/6] Stopping app servers...
taskkill /F /FI "WINDOWTITLE eq Lovnge API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Lovnge Web*" >nul 2>&1
echo        Done.
echo.

REM --- Restart Docker containers ---
echo  [2/6] Restarting Docker containers...
docker-compose -f docker-compose.dev.yml down
if !errorlevel! neq 0 (
    echo        [ERROR] Failed to stop containers.
    pause
    exit /b 1
)
echo.

echo  [3/6] Starting Docker containers...
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

REM --- Push DB schema (in case of changes) ---
echo  [4/6] Syncing database schema...
cd /d "%~dp0packages\db"
call npx drizzle-kit push >nul 2>&1
if !errorlevel! neq 0 (
    echo        [WARNING] Schema push failed. May need manual intervention.
) else (
    echo        Schema synced.
)
cd /d "%~dp0"
echo.

REM --- Start API ---
echo  [5/6] Starting API server (NestJS :3000)...
start "Lovnge API" cmd /k "cd /d "%~dp0apps\api" && npm run dev"
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
echo  [6/6] Starting Web server (Next.js :3001)...
start "Lovnge Web" cmd /k "cd /d "%~dp0apps\web" && npm run dev"
echo.

echo  ========================================
echo   All services restarted!
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
