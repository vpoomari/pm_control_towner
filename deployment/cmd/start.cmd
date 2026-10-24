@echo off
rem PM CONTROL TOWER — start the app in the background (window minimized, logs in logs\)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ". .\scripts\common.ps1; Start-App"
pause
