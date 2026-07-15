@echo off
cd /d "%~dp0"
call "%~dp0LOVNGE-DEV.bat" %*
if errorlevel 1 (
  echo.
  echo  START-DEV: failed (see above^).
  pause
)
