@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tg-smoke.ps1" %*
