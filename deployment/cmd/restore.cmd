@echo off
rem PM CONTROL TOWER — restore from a backup zip
rem   restore.cmd            restore the newest backup
rem   restore.cmd -List      list available backups
rem   restore.cmd -Zip <path>
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\restore.ps1" %*
pause
