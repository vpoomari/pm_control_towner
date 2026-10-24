@echo off
rem PM CONTROL TOWER — first-run deployment: creates .env, prepares folders, starts the app.
rem Add -Fresh to start from an EMPTY database instead of the bundled data.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy.ps1" %*
pause
