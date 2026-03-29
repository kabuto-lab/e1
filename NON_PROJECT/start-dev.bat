@echo off
REM ============================================
REM START DEVELOPMENT SERVERS
REM Escort Platform - Lovnge
REM Starts: Backend (NestJS) + Frontend (Next.js)
REM ============================================

echo.
echo ╔════════════════════════════════════════╗
echo ║   STARTING DEVELOPMENT SERVERS         ║
echo ╚════════════════════════════════════════╝
echo.

cd /d "%~dp0.."

REM --- Check if Docker is running ---
echo [1/3] Checking Docker status...
docker-compose -f docker-compose.dev.yml ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker containers not running!
    echo [INFO] Please run 'full-restart.bat' first
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

REM --- Check if node_modules exist ---
echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo [INSTALL] Installing dependencies...
    call npm install
) else (
    echo [OK] Dependencies installed
)
echo.

REM --- Start both servers ---
echo [3/3] Starting development servers...
echo.
echo ════════════════════════════════════════════
echo   Starting Backend (NestJS) on :3000
echo   Starting Frontend (Next.js) on :3001
echo ════════════════════════════════════════════
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Start backend and frontend in parallel
start "NestJS Backend" cmd /k "cd apps\api && npm run start:dev"
timeout /t 2 /nobreak >nul
start "Next.js Frontend" cmd /k "cd apps\web && npm run dev"

echo.
echo ════════════════════════════════════════════
echo   Servers starting...
echo ════════════════════════════════════════════
echo.
echo Backend:  http://localhost:3000
echo Swagger:  http://localhost:3000/api/docs
echo Frontend: http://localhost:3001
echo.
echo Dashboard: http://localhost:3001/dashboard
echo Models:    http://localhost:3001/dashboard/models
echo.
echo MinIO Console: http://localhost:9001
echo Mailhog:       http://localhost:8025
echo.
echo Windows are opening in new tabs...
echo Close those tabs to stop the servers
echo.

pause
