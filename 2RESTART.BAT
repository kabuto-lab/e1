@echo off
echo ============================================
echo   Escort Platform - RESTART
echo ============================================
echo.

REM Step 1: Stop Docker containers
echo [1/5] Stopping Docker containers...
docker-compose -f docker-compose.dev.yml down

REM Step 2: Restart Docker Desktop
echo [2/5] Restarting Docker Desktop...
taskkill /F /IM "Docker Desktop.exe" >nul 2>&1
timeout /t 3 /nobreak >nul
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo       Waiting for Docker to initialize (30 seconds)...
timeout /t 30 /nobreak >nul

REM Step 3: Start Docker containers
echo [3/5] Starting Docker containers...
docker-compose -f docker-compose.dev.yml up -d

REM Wait for PostgreSQL to be ready
echo       Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

REM Step 4: Restart API (NestJS)
echo [4/5] Restarting API server (NestJS)...
taskkill /F /FI "WINDOWTITLE eq API Server*" >nul 2>&1
cd /d "%~dp0apps\api"
start "API Server" cmd /k "npx ts-node -r tsconfig-paths/register src/main.ts"

REM Step 5: Restart Web (Next.js)
echo [5/5] Restarting Web server (Next.js)...
taskkill /F /FI "WINDOWTITLE eq Web Server*" >nul 2>&1
cd /d "%~dp0apps\web"
start "Web Server" cmd /k "npm run dev"

echo.
echo ============================================
echo   All services restarted!
echo ============================================
echo.
echo   API:     http://localhost:3000
echo   Swagger: http://localhost:3000/api/docs
echo   Web:     http://localhost:3001
echo   MinIO:   http://localhost:9000
echo   Mailhog: http://localhost:8025
echo.
echo   Login: test@test.com / password123
echo.
pause
