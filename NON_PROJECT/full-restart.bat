@echo off
REM ============================================
REM FULL RESTART SCRIPT - COMPLETE SYSTEM RESET
REM Escort Platform - Lovnge
REM Restarts: Docker, Backend, Frontend, Database
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║   ESCORT PLATFORM - FULL SYSTEM RESTART                ║
echo ║   Stopping everything... Cleaning... Starting fresh... ║
echo ╚════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0.."

REM --- Step 1: Kill ALL Node.js processes ---
echo [1/8] Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] No Node.js processes found
) else (
    echo [OK] Node.js processes killed
)
echo.

REM --- Step 2: Stop ALL Docker containers ---
echo [2/8] Stopping Docker containers...
docker-compose -f docker-compose.dev.yml down
if %errorlevel% neq 0 (
    echo [ERROR] Failed to stop Docker containers
    pause
    exit /b 1
)
echo [OK] Docker containers stopped
echo.

REM --- Step 3: Clean npm cache ---
echo [3/8] Cleaning npm cache...
call npm cache clean --force >nul 2>&1
echo [OK] Cache cleaned
echo.

REM --- Step 4: Remove node_modules (optional - comment out if you want to keep) ---
echo [4/8] Cleaning node_modules...
if exist "node_modules" (
    rmdir /s /q node_modules
    echo [OK] Root node_modules removed
)
if exist "apps\api\node_modules" (
    rmdir /s /q apps\api\node_modules
    echo [OK] apps/api node_modules removed
)
if exist "apps\web\node_modules" (
    rmdir /s /q apps\web\node_modules
    echo [OK] apps/web node_modules removed
)
if exist "packages\db\node_modules" (
    rmdir /s /q packages\db\node_modules
    echo [OK] packages/db node_modules removed
)
echo [OK] node_modules cleaned
echo.

REM --- Step 5: Reinstall dependencies ---
echo [5/8] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM --- Step 6: Start Docker containers ---
echo [6/8] Starting Docker containers...
docker-compose -f docker-compose.dev.yml up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Docker containers
    pause
    exit /b 1
)
echo [OK] Docker containers started
echo.

REM --- Wait for Docker to be ready ---
echo [WAIT] Waiting for Docker services (15 seconds)...
timeout /t 15 /nobreak
echo.

REM --- Step 7: Check Docker status ---
echo [7/8] Checking Docker status...
docker-compose -f docker-compose.dev.yml ps
echo.

REM --- Step 8: Apply database migrations ---
echo [8/8] Applying database migrations...
cd packages\db
call npm run db:push
if %errorlevel% neq 0 (
    echo [WARNING] Database migration failed (may need manual intervention)
) else (
    echo [OK] Database migrations applied
)
cd ..\..
echo.

REM ============================================
echo ╔════════════════════════════════════════════════════════╗
echo ║   SYSTEM RESTART COMPLETE!                             ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Docker Services:
echo   ├─ PostgreSQL:  localhost:5432
echo   ├─ Redis:       localhost:6379
echo   ├─ MinIO:       localhost:9000 (Console: 9001)
echo   └─ Mailhog:     localhost:8025
echo.
echo Next Steps:
echo   1. Run 'start-dev.bat' to start backend + frontend
echo   2. Or start them separately:
echo      - Backend:  cd apps\api ^&^& npm run start:dev
echo      - Frontend: cd apps\web ^&^& npm run dev
echo.
echo Access Points:
echo   Backend:  http://localhost:3000
echo   Swagger:  http://localhost:3000/api/docs
echo   Frontend: http://localhost:3001
echo   MinIO:    http://localhost:9001
echo   Mailhog:  http://localhost:8025
echo.

pause
