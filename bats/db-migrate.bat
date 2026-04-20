@echo off
pushd "%~dp0\.."
echo === db:migrate (workspace @escort/db) ===
call npm run db:migrate --workspace=@escort/db
popd
echo.
pause
