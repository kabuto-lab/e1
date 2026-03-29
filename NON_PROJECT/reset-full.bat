@echo off
chcp 65001 >nul
echo ============================================
echo Escort Platform - Full Reset Script
echo ============================================
echo.

echo [1/8] Going to project root...
cd /d %~dp0
echo Current directory: %CD%
echo.

echo [2/8] Stopping all Docker containers...
docker-compose -f docker-compose.dev.yml down -v
echo.

echo [3/8] Removing postgres volume forcefully...
docker volume rm es_postgres_data --force
docker volume rm escort-platform_es_postgres_data --force
echo.

echo [4/8] Checking remaining volumes...
docker volume ls
echo.

echo [5/8] Starting fresh containers...
docker-compose -f docker-compose.dev.yml up -d
echo.

echo [6/8] Waiting 15 seconds for PostgreSQL initialization...
timeout /t 15 /nobreak
echo.

echo [7/8] Checking PostgreSQL logs...
docker logs escort-postgres --tail 30
echo.

echo [8/8] Testing connection...
docker exec -it escort-postgres psql -U postgres -d companion_db -c "SELECT version();"
echo.

echo ============================================
echo Reset Complete!
echo ============================================
echo.
echo Now applying migrations...
echo.

cd packages\db
npx drizzle-kit push

echo.
echo ============================================
echo ALL DONE!
echo ============================================
echo.
echo Next: Run 'npm run dev' in project root
echo.
pause
