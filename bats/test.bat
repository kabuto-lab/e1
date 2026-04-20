@echo off
REM Прогон всех unit-тестов по workspace-ам. Для e2e используй test:e2e отдельно.

pushd "%~dp0\.."
echo.
echo === Unit tests: @escort/api ===
call npm test --workspace=@escort/api
set API_EXIT=%ERRORLEVEL%

echo.
echo === Unit tests: @escort/bot ===
call npm test --workspace=@escort/bot
set BOT_EXIT=%ERRORLEVEL%

popd
echo.
echo === Results ===
echo   API tests exit code: %API_EXIT%
echo   BOT tests exit code: %BOT_EXIT%
echo.
pause
