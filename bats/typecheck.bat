@echo off
REM Проверка TS-компиляции без сборки.

pushd "%~dp0\.."
echo.
echo === tsc --noEmit: @escort/api ===
call npm run check-types --workspace=@escort/api
set API_EXIT=%ERRORLEVEL%

echo.
echo === tsc --noEmit: @escort/bot ===
call npm run check-types --workspace=@escort/bot
set BOT_EXIT=%ERRORLEVEL%

echo.
echo === tsc --noEmit: @escort/db ===
call npm run check-types --workspace=@escort/db
set DB_EXIT=%ERRORLEVEL%

popd
echo.
echo === Results ===
echo   API check-types: %API_EXIT%
echo   BOT check-types: %BOT_EXIT%
echo   DB  check-types: %DB_EXIT%
echo.
pause
