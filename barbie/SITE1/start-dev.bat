@echo off
rem ============================================================================
rem NAS / Barbie SITE1 - local dev launcher
rem Brings up Postgres/Redis/MinIO/Mailhog, applies migrations, starts api+web.
rem
rem Design notes:
rem   - Pure ASCII. cmd.exe parses .bat in the system OEM codepage; non-ASCII
rem     box-drawing chars in comments cause spurious 'not recognized' lines.
rem   - No `setlocal EnableDelayedExpansion`. Nested parenthesized if-blocks
rem     parse unreliably with it; we use goto-based error paths instead.
rem   - No `( )` or `!` characters inside echo strings within if-blocks.
rem ============================================================================

chcp 65001 > NUL
setlocal

cd /d "%~dp0"

echo.
echo === NAS local dev startup ===
echo Working dir: %CD%
echo.

rem --- 1. Check .env -----------------------------------------------------------
if not exist ".env" goto env_missing
goto step2
:env_missing
echo Creating .env from .env.example.
copy /Y ".env.example" ".env" > NUL
echo Edit .env and re-run if you want non-default secrets.
echo.
:step2

rem --- 2. Check Docker engine --------------------------------------------------
docker info > NUL 2>&1
if errorlevel 1 goto docker_down
goto step3
:docker_down
echo [X] Docker engine is not running. Start Docker Desktop and re-run.
pause
exit /b 1
:step3

rem --- 3. Pre-flight: port conflict check --------------------------------------
rem API_PORT=5110, WEB_PORT=5111. Both must be free before dev:apps.
netstat -ano -p TCP | findstr /R /C:":5110 .*LISTENING" > NUL
if not errorlevel 1 goto port5110_busy
netstat -ano -p TCP | findstr /R /C:":5111 .*LISTENING" > NUL
if not errorlevel 1 goto port5111_busy
goto step4
:port5110_busy
echo [X] Port 5110 [API] is already in use. Inspect and kill:
echo     netstat -ano ^| findstr :5110
echo     taskkill /F /PID ^<PID^>
pause
exit /b 1
:port5111_busy
echo [X] Port 5111 [WEB] is already in use. Inspect and kill:
echo     netstat -ano ^| findstr :5111
echo     taskkill /F /PID ^<PID^>
pause
exit /b 1
:step4

rem --- 4. Bring up compose stack -----------------------------------------------
echo [*] Starting docker compose stack [barbie-site1-dev]...
docker compose -f docker-compose.dev.yml up -d
if errorlevel 1 goto compose_fail
goto step5
:compose_fail
echo [X] docker compose up failed.
pause
exit /b 1
:step5

rem --- 5. Wait for Postgres health ---------------------------------------------
echo [*] Waiting for Postgres health...
set tries=0
:wait_pg
set /a tries+=1
docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres -d barbie_site1 > NUL 2>&1
if not errorlevel 1 goto pg_ready
if %tries% GEQ 30 goto pg_timeout
timeout /t 2 /nobreak > NUL
goto wait_pg
:pg_timeout
echo [X] Postgres did not become ready in 60s.
pause
exit /b 1
:pg_ready
echo [OK] Postgres is ready.

rem --- 6. npm install (only if root node_modules missing) ----------------------
if exist "node_modules" goto step7
echo [*] Installing root workspaces [first run]...
call npm install
if errorlevel 1 goto npm_install_fail
goto step7
:npm_install_fail
echo [X] npm install failed.
pause
exit /b 1
:step7

rem --- 7. Apply DB migrations (idempotent) -------------------------------------
echo [*] Applying Drizzle migrations...
call npm run db:migrate
if errorlevel 1 goto migrate_fail
goto banner
:migrate_fail
echo [X] db:migrate failed.
pause
exit /b 1

rem --- 8. Banner ---------------------------------------------------------------
:banner
echo.
echo =============================================
echo   API:        http://localhost:5110
echo   Swagger:    http://localhost:5110/api/docs
echo   Web:        http://localhost:5111
echo   MinIO UI:   http://localhost:9012
echo   Mailhog UI: http://localhost:8025
echo   Postgres:   localhost:5442  [db: barbie_site1]
echo =============================================
echo.
echo Ctrl+C to stop api+web. Docker stack keeps running.
echo To stop docker stack, run: stop-dev.bat
echo.

rem --- 9. Start api + web concurrently [foreground] ----------------------------
call npm run dev:apps

endlocal
exit /b 0
