@echo off
setlocal
echo.
echo ============================================
echo   FULL STACK RESTART
echo   Docker + API (:3000) + Web (:3001) + Bot
echo ============================================
echo.

REM --- Kill API (:3000) ---
echo === Killing processes on :3000 (API) ===
set KILLED=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
  echo   PID %%a -- taskkill /F
  taskkill /F /PID %%a >NUL 2>&1
  set KILLED=1
)
if "%KILLED%"=="0" echo   (nothing was listening on :3000)
echo.

REM --- Kill Web (:3001) ---
echo === Killing processes on :3001 (Web) ===
set KILLED=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
  echo   PID %%a -- taskkill /F
  taskkill /F /PID %%a >NUL 2>&1
  set KILLED=1
)
if "%KILLED%"=="0" echo   (nothing was listening on :3001)
echo.

REM --- Kill Bot window (by title) ---
echo === Killing Bot window (Grammy polling) ===
taskkill /FI "WINDOWTITLE eq Bot Grammy*" /F >NUL 2>&1
if errorlevel 1 (echo   (no bot window found^)) else (echo   Bot window closed)
echo.

REM --- Docker ---
echo === Restarting Docker services ===
pushd "%~dp0\.."
docker-compose -f docker-compose.dev.yml up -d
if errorlevel 1 (
  echo   !! docker-compose failed -- is Docker Desktop running?
  echo   Start: "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  popd
  pause
  exit /b 1
)
popd
echo.
echo Waiting 3s for Postgres to accept connections...
timeout /t 3 /nobreak >NUL
echo.

REM --- Spawn API ---
echo === Spawning API in new window ===
pushd "%~dp0\..\apps\api"
start "API ts-node :3000" cmd /k "npx ts-node -r tsconfig-paths/register src/main.ts"
popd

REM --- Spawn Web ---
echo === Spawning Web in new window ===
pushd "%~dp0\..\apps\web"
start "Web Next :3001" cmd /k "npm run dev"
popd

REM --- Wait for API to come up, then spawn Bot ---
echo.
echo Waiting 8s for API to bootstrap before starting bot...
timeout /t 8 /nobreak >NUL

echo === Spawning Bot in new window ===
pushd "%~dp0\..\apps\bot"
start "Bot Grammy polling" cmd /k "npm run dev"
popd

echo.
echo ============================================
echo   All services spawning.
echo   Windows:
echo     "API ts-node :3000"     -- wait for "Nest application successfully started"
echo     "Web Next :3001"        -- wait for "ready" / "compiled"
echo     "Bot Grammy polling"    -- wait for "@<botname> ready"
echo.
echo   Check: bats\status.bat
echo   Smoke: bats\tg-smoke.bat
echo ============================================
echo.
pause
endlocal
