@echo off
pushd "%~dp0\.."
echo.
echo === Docker Compose ===
docker compose -f docker-compose.dev.yml ps
echo.
echo === Everything running ===
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
popd
echo.
pause
