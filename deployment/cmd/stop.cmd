@echo off
rem PM CONTROL TOWER — stop the running app
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ". .\scripts\common.ps1; Stop-App | Out-Null"
timeout /t 2 /nobreak >nul
