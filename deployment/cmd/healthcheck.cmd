@echo off
rem PM CONTROL TOWER — quick health probe of the running app
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$r = try { Invoke-WebRequest -UseBasicParsing -Uri ('http://localhost:' + (if (Test-Path .env) { ((Get-Content .env | Select-String '^PORT=' ) -replace 'PORT=','') } else { '3000' }) + '/api/health') -TimeoutSec 5 } catch { $_.Exception.Response }; if ($r -and $r.StatusCode) { Write-Host ('HTTP ' + $r.StatusCode + ' - app is responding') } else { Write-Host 'App is NOT responding' }"
pause
