@echo off
rem PM CONTROL TOWER — backup database + config to backups\pmct-backup-<timestamp>.zip
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\backup.ps1" %*
pause
