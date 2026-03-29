@echo off
REM ============================================
REM Lovnge Platform - Security Setup Script
REM ============================================

echo.
echo ============================================
echo  Lovnge Platform - Security Setup
echo ============================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo [!] .env file not found. Creating from .env.example...
    copy .env.example .env
    echo.
    echo [+] .env file created. Please update the following variables:
    echo.
    echo     JWT_SECRET=(run: openssl rand -hex 32)
    echo     JWT_REFRESH_SECRET=(run: openssl rand -hex 32)
    echo     ENCRYPTION_KEY=(run: openssl rand -hex 32)
    echo.
    echo Press any key to continue...
    pause >nul
)

REM Generate secrets if using defaults
findstr /C:"JWT_SECRET=escort-platform-super-secret" .env >nul 2>nul
if %errorlevel% equ 0 (
    echo [!] Default JWT_SECRET detected. Generating secure secret...
    powershell -Command "$secret = -join ((48..57 + 65..70 + 97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_}); (Get-Content .env) -replace 'JWT_SECRET=.*', \"JWT_SECRET=$secret\" | Set-Content .env"
    echo [+] JWT_SECRET generated.
)

findstr /C:"ENCRYPTION_KEY=0123456789abcdef" .env >nul 2>nul
if %errorlevel% equ 0 (
    echo [!] Default ENCRYPTION_KEY detected. Generating secure key...
    powershell -Command "$key = -join ((48..57 + 65..70 + 97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_}); (Get-Content .env) -replace 'ENCRYPTION_KEY=.*', \"ENCRYPTION_KEY=$key\" | Set-Content .env"
    echo [+] ENCRYPTION_KEY generated.
)

echo.
echo ============================================
echo  Starting Docker Services...
echo ============================================
echo.

REM Start Docker services
docker-compose -f docker-compose.dev.yml up -d

echo.
echo Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo  Running Database Migrations...
echo ============================================
echo.

REM Run migrations
cd packages\db
call npm run db:push
cd ..\..

echo.
echo ============================================
echo  Starting API Server...
echo ============================================
echo.

REM Start API in development mode
cd apps\api
start "Lovnge API" cmd /k "npm run start:dev"

echo.
echo Waiting for API to start...
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo  Starting Web Server...
echo ============================================
echo.

REM Start Web in development mode
cd apps\web
start "Lovnge Web" cmd /k "npm run dev"

echo.
echo ============================================
echo  Setup Complete!
echo ============================================
echo.
echo Services:
echo   - API:       http://localhost:3000
echo   - Swagger:   http://localhost:3000/api/docs
echo   - Web:       http://localhost:3001
echo   - MinIO:     http://localhost:9001
echo   - PostgreSQL: localhost:5432
echo   - Redis:     localhost:6379
echo.
echo Security Features Enabled:
echo   [✓] JWT Authentication Guard
echo   [✓] RBAC Roles Guard
echo   [✓] Environment Validation
echo   [✓] Rate Limiting
echo   [✓] Helmet Security Headers
echo   [✓] Audit Logging (152-ФЗ)
echo   [✓] Anti-Leak System
echo.
echo Press any key to exit...
pause >nul
