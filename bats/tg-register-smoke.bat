@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tg-register-smoke.ps1" %*
