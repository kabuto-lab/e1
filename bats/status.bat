@echo off
setlocal enabledelayedexpansion

if "%API%"=="" set API=http://localhost:3000
if "%WEB%"=="" set WEB=http://localhost:3001

echo.
echo ==========================================================
echo   Lovnge dev -- local env status
echo ==========================================================

echo.
echo [Docker]
docker ps --format "  {{.Names}} -- {{.Status}}" 2>NUL | findstr /i "escort-"
if errorlevel 1 echo   (no escort-* containers running -- start docker-compose)

echo.
echo [API %API%]
for /f "delims=" %%A in ('curl -s --max-time 3 -o NUL -w "%%{http_code}" %API%/api/docs 2^>NUL') do set API_DOCS=%%A
if "!API_DOCS!"=="200" (
  echo   /api/docs   200  OK
) else (
  echo   /api/docs   !API_DOCS!  -- API not responding, run bats\restart-api.bat
  goto :skip_api_detail
)

for /f "delims=" %%A in ('curl -s --max-time 3 -o NUL -w "%%{http_code}" %API%/health 2^>NUL') do set API_HEALTH=%%A
echo   /health     !API_HEALTH!

curl -s --max-time 3 %API%/api/docs-json 2>NUL | findstr /C:"/auth/telegram/link-token" >NUL
if not errorlevel 1 (
  echo   /auth/telegram/* endpoints present in Swagger [OK]
) else (
  echo   /auth/telegram/* endpoints NOT found -- API running OLD code, restart it
)

:skip_api_detail

echo.
echo [Web %WEB%]
for /f "delims=" %%A in ('curl -s --max-time 3 -o NUL -w "%%{http_code}" %WEB% 2^>NUL') do set WEB_CODE=%%A
if "!WEB_CODE!"=="200" (
  echo   / 200 OK
) else (
  echo   / !WEB_CODE!  -- Web not responding
)

echo.
echo [DB last migration]
docker exec escort-postgres psql -U postgres -d companion_db -t -c "SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1;" 2>NUL
if errorlevel 1 echo   (cannot query -- postgres container not running?)

echo.
echo ==========================================================
echo.
pause
endlocal
