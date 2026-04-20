@echo off
setlocal
echo.
echo === Killing processes on :3000 ===
set KILLED=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
  echo   PID %%a -- taskkill /F
  taskkill /F /PID %%a >NUL 2>&1
  set KILLED=1
)
if "%KILLED%"=="0" echo   (nothing was listening on :3000)
echo.

echo === Spawning API in new window ===
pushd "%~dp0\..\apps\api"
start "API ts-node :3000" cmd /k "npx ts-node -r tsconfig-paths/register src/main.ts"
popd

echo.
echo API starts in window "API ts-node :3000".
echo When you see "Nest application successfully started" there, run:
echo   bats\status.bat      (check everything)
echo   bats\tg-smoke.bat    (TG link flow test)
echo.
pause
endlocal
