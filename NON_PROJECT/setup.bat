@echo off
chcp 65001 >nul
echo ============================================
echo Escort Platform - Setup Script
echo ============================================
echo.

echo [1/6] Stopping Docker containers...
docker-compose -f docker-compose.dev.yml down -v
echo.

echo [2/6] Cleaning Docker cache...
docker system prune -a --volumes -f
echo.

echo [3/6] Starting fresh Docker containers...
docker-compose -f docker-compose.dev.yml up -d
echo.

echo [4/6] Waiting 15 seconds for PostgreSQL to initialize...
timeout /t 15 /nobreak
echo.

echo [5/6] Testing PostgreSQL connection...
docker exec -it escort-postgres psql -U postgres -c "SELECT version();"
echo.

echo [6/6] Applying database migrations...
cd packages\db
npx drizzle-kit push
echo.

echo ============================================
echo Setup Complete!
echo ============================================
echo.
echo Next step: Run 'npm run dev' in project root
echo.
pause
