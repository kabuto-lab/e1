@echo off
setlocal
echo.
echo === Killing processes on :3001 ===
set KILLED=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
  echo   PID %%a -- taskkill /F
  taskkill /F /PID %%a >NUL 2>&1
  set KILLED=1
)
if "%KILLED%"=="0" echo   (nothing was listening on :3001)
echo.

echo === Spawning Web in new window ===
pushd "%~dp0\..\apps\web"
start "Web Next :3001" cmd /k "npm run dev"
popd

echo.
echo Web starts in window "Web Next :3001".
echo Expect: "ready" or "compiled successfully" in that window.
echo.
pause
endlocal
