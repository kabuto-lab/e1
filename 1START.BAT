@echo off
echo ============================================
echo   Escort Platform - START
echo ============================================
echo.

REM Step 1: Start Docker Desktop
echo [1/4] Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo       Waiting for Docker to initialize (30 seconds)...
timeout /t 30 /nobreak >nul

REM Step 2: Start Docker containers
echo [2/4] Starting Docker containers...
docker-compose -f docker-compose.dev.yml up -d

REM Wait for PostgreSQL to be ready
echo       Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

REM Step 3: Start API (NestJS)
echo [3/4] Starting API server (NestJS)...
cd /d "%~dp0apps\api"
start "API Server" cmd /k "npx ts-node -r tsconfig-paths/register src/main.ts"

REM Step 4: Start Web (Next.js)
echo [4/4] Starting Web server (Next.js)...
cd /d "%~dp0apps\web"
start "Web Server" cmd /k "npm run dev"

echo.
echo ============================================
echo   All services started!
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
