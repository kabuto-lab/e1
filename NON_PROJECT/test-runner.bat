@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: LOVNGE PLATFORM - QUICK TEST RUNNER
:: ============================================================================
:: Simple script to start all services for testing progress
:: ============================================================================

color 0B
title Lovnge Platform - Test Runner

set "PROJECT_DIR=%~dp0"
set "API_PORT=3000"
set "WEB_PORT=3001"

cls
echo.
echo ============================================================================
echo                  LOVNGE PLATFORM - QUICK TEST RUNNER
echo ============================================================================
echo.
echo   Starting all services for testing...
echo   Directory: %PROJECT_DIR%
echo   Date: %DATE%
echo   Time: %TIME%
echo.
echo ============================================================================
echo.

:: ============================================================================
:: STEP 1: CHECK & START DOCKER
:: ============================================================================
echo [1/4] CHECKING DOCKER CONTAINERS...
echo.

docker ps 2>nul | findstr "escort-" >nul
if errorlevel 1 (
    echo   [!] Docker containers not running. Starting...
    cd /d "%PROJECT_DIR%"
    
    echo   Starting Docker Compose...
    docker-compose -f docker-compose.dev.yml up -d
    
    echo   Waiting for containers to initialize...
    timeout /t 10 /nobreak >nul
    
    echo   [✓] Docker containers started
) else (
    echo   [✓] Docker containers already running
    docker ps --format "  - {{.Names}}: {{.Status}}"
)
echo.

:: ============================================================================
:: STEP 2: CHECK & START API SERVER
:: ============================================================================
echo [2/4] CHECKING API SERVER...
echo.

netstat -nno 2>nul | findstr ":%API_PORT%.*LISTENING" >nul
if errorlevel 1 (
    echo   [!] API server not running. Starting...
    cd /d "%PROJECT_DIR%\apps\api"
    
    start "Lovnge API" cmd /k "echo Starting API on port %API_PORT%... && npm run dev"
    
    echo   [✓] API server launching in new window
    timeout /t 3 /nobreak >nul
) else (
    echo   [✓] API server already running on port %API_PORT%
)
echo.

:: ============================================================================
:: STEP 3: CHECK & START WEB SERVER
:: ============================================================================
echo [3/4] CHECKING WEB SERVER...
echo.

netstat -nno 2>nul | findstr ":%WEB_PORT%.*LISTENING" >nul
if errorlevel 1 (
    echo   [!] Web server not running. Starting...
    cd /d "%PROJECT_DIR%\apps\web"
    
    start "Lovnge Web" cmd /k "echo Starting Web on port %WEB_PORT%... && npm run dev"
    
    echo   [✓] Web server launching in new window
    timeout /t 3 /nobreak >nul
) else (
    echo   [✓] Web server already running on port %WEB_PORT%
)
echo.

:: ============================================================================
:: STEP 4: WAIT & SHOW STATUS
:: ============================================================================
echo [4/4] WAITING FOR SERVICES TO INITIALIZE...
echo.
echo   Please wait 15-20 seconds for servers to fully start...
timeout /t 5 /nobreak >nul

echo.
echo ============================================================================
echo                      ALL SERVICES STARTED
echo ============================================================================
echo.
echo   🖥️  SERVERS:
echo     API Server:  http://localhost:%API_PORT%
echo     Web App:     http://localhost:%WEB_PORT%
echo.
echo   📊 MONITORING:
echo     Swagger Docs:    http://localhost:%API_PORT%/api/docs
echo     Health Check:    http://localhost:%API_PORT%/health
echo.
echo   🐳 DOCKER SERVICES:
echo     PostgreSQL:  localhost:5432 (postgres:postgres)
echo     Redis:       localhost:6379
echo     MinIO:       http://localhost:9001 (admin:companion_minio_admin)
echo     Mailhog:     http://localhost:8025
echo.
echo   🔐 TEST LOGIN:
echo     URL:         http://localhost:%WEB_PORT%/admin-login
echo     Email:       admin@lovnge.local
echo     Password:    Admin123!
echo.
echo   📋 TESTING CHECKLIST:
echo     [ ] API Swagger loads (/api/docs)
echo     [ ] Web app loads (/)
echo     [ ] Admin login works
echo     [ ] Dashboard accessible
echo     [ ] Models list shows data
echo     [ ] Profile edit works
echo     [ ] Image upload works
echo.
echo ============================================================================
echo.
echo   Windows with servers are running in background.
echo   Check "Lovnge API" and "Lovnge Web" windows for logs.
echo.
echo   Press any key to close this window...
pause >nul
