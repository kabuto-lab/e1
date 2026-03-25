@echo off
chcp 65001 >nul
echo ============================================
echo Escort Platform - Debug Script
echo ============================================
echo.

echo [1/8] Checking Docker volumes...
docker volume ls
echo.

echo [2/8] Inspecting postgres volume...
docker volume inspect es_postgres_data
echo.

echo [3/8] Stopping containers...
docker-compose -f docker-compose.dev.yml down
echo.

echo [4/8] Removing postgres volume...
docker volume rm es_postgres_data
echo.

echo [5/8] Starting fresh containers...
docker-compose -f docker-compose.dev.yml up -d
echo.

echo [6/8] Waiting 15 seconds for PostgreSQL initialization...
timeout /t 15 /nobreak
echo.

echo [7/8] Checking PostgreSQL logs...
docker logs escort-postgres --tail 50
echo.

echo [8/8] Testing connection...
docker exec -it escort-postgres psql -U postgres -c "SELECT version();"
echo.

echo ============================================
echo Debug Complete!
echo ============================================
echo.
echo Now try: cd packages\db ^&^& npx drizzle-kit push
echo.
pause
