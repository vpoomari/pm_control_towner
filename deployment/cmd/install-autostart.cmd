@echo off
rem PM CONTROL TOWER — register auto-start at logon (Windows Task Scheduler)
rem The app then starts automatically when this user signs in. Remove with remove-autostart.cmd
schtasks /Create /F /SC ONLOGON /TN "PM-Control-Tower" /TR "\"%~dp0start.cmd\"" /RL LIMITED
if %errorlevel%==0 (echo [PMCT] Auto-start registered. It runs start.cmd at logon.) else (echo [PMCT] Failed to register task - try running as Administrator.)
pause
