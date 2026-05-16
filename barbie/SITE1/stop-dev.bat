@echo off
rem ============================================================================
rem NAS / Barbie SITE1 - stop local dev infra
rem Stops docker compose stack. Does NOT remove volumes (data is preserved).
rem ============================================================================

chcp 65001 > NUL
setlocal

cd /d "%~dp0"

echo [*] Stopping docker compose stack (barbie-site1-dev)...
docker compose -f docker-compose.dev.yml stop
if errorlevel 1 (
    echo [X] docker compose stop failed.
    pause
    exit /b 1
)

echo.
echo [OK] Stack stopped. Volumes preserved.
echo To wipe data: docker compose -f docker-compose.dev.yml down -v
echo.

endlocal
