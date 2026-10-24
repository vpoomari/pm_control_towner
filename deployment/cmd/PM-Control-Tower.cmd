@echo off
rem PM CONTROL TOWER — fallback launcher (used when PM-Control-Tower.exe is absent).
rem Starts the bundled server in this console window. Close the window or press Ctrl+C to stop.
setlocal
cd /d "%~dp0.."
if exist ".env" for /f "usebackq tokens=1,* delims==" %%a in (".env") do if not defined %%a set "%%a=%%b"
if not defined PORT set "PORT=3000"
if not defined HOSTNAME set "HOSTNAME=127.0.0.1"
set "DATABASE_URL=file:%~dp0..\db\custom.db"
set "DATABASE_URL=%DATABASE_URL:\=/%"
echo [PMCT] Starting on port %PORT% ...
if not exist "app\server.js" (
  echo [PMCT] FATAL: app\server.js not found - re-extract the full deployment package.
  pause
  exit /b 1
)
node "app\server.js"
pause
