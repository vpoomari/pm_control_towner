@echo off
rem PM CONTROL TOWER — remove the auto-start task
schtasks /Delete /F /TN "PM-Control-Tower"
pause
