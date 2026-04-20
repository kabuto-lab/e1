@echo off
setlocal
if "%API%"=="" set API=http://localhost:3000

echo.
echo === API ping %API% ===
curl -s --max-time 3 -o NUL -w "  /api/docs   %%{http_code}   %%{time_total}s\n" %API%/api/docs
curl -s --max-time 3 -o NUL -w "  /health     %%{http_code}   %%{time_total}s\n" %API%/health
curl -s --max-time 3 -o NUL -w "  /auth/login %%{http_code}   %%{time_total}s\n" %API%/auth/login
echo.
echo (expected: /api/docs=200, /health=200, /auth/login=404 or 405 without POST body)
echo.
pause
endlocal
