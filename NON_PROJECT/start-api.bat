@echo off
echo Starting Escort Platform API...
cd /d %~dp0apps\api
npx tsx src/main.ts
pause
