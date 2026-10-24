# PM CONTROL TOWER — Backup script (deployment pack).
# Backs up the database, .env and Prisma schema into backups\pmct-backup-<timestamp>.zip.
# If the app is running it is stopped for a consistent copy and restarted afterwards.
# Usage:  backup.ps1 [-RetentionDays 30]   (or via backup.cmd)

param(
  [int]$RetentionDays = 30
)

. (Join-Path $PSScriptRoot "common.ps1")

Write-Step "Backup starting — app version $(Get-AppVersion)"
$wasRunning = [bool](Test-AppRunning)
if ($wasRunning) { Stop-App | Out-Null }

try {
  $zip = New-BackupZip -Tag "backup" -RetentionDays $RetentionDays
  $size = "{0:N1} KB" -f ((Get-Item $zip).Length / 1KB)
  Write-Ok "Backup created: $zip ($size)"
} finally {
  if ($wasRunning) { Start-App }
}
