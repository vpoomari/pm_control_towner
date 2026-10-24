# PM CONTROL TOWER — Restore script (deployment pack).
# Restores the database / .env / schema from a backup zip made by backup.ps1.
# A safety backup of the current state is taken first (tag: pre-restore).
# Usage:
#   restore.ps1 -List                      show available backups
#   restore.ps1                            restore the newest backup
#   restore.ps1 -Zip <path-to-zip>         restore a specific backup
#   restore.ps1 -DataOnly                  restore only db\ + .env (keep current schema)

param(
  [string]$Zip = "",
  [switch]$List,
  [switch]$DataOnly,
  [switch]$NoRestart
)

. (Join-Path $PSScriptRoot "common.ps1")

$backupDir = Join-Path $PackRoot "backups"

if ($List) {
  $zips = Get-ChildItem $backupDir -Filter "pmct-*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  if (-not $zips) { Write-Warn2 "No backups found in $backupDir"; exit 0 }
  Write-Host ""
  Write-Host "Available backups (newest first):" -ForegroundColor Cyan
  foreach ($z in $zips) {
    $age = "{0,3:N0} h ago" -f ((Get-Date) - $z.LastWriteTime).TotalHours
    $size = "{0,8:N1} KB" -f ($z.Length / 1KB)
    Write-Host ("  {0}   {1}   {2}" -f $z.Name, $size, $age)
  }
  exit 0
}

if (-not $Zip -or $Zip -eq "latest") {
  $latest = Get-ChildItem $backupDir -Filter "pmct-backup-*.zip" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latest) { throw "No backup found in $backupDir — run backup.cmd first or pass -Zip <path>." }
  $Zip = $latest.FullName
}
if (-not (Test-Path $Zip)) { throw "Backup not found: $Zip" }

Write-Step "Restoring from: $Zip"
$wasRunning = [bool](Test-AppRunning)
if ($wasRunning) { Stop-App | Out-Null }

try {
  # Safety backup of the current state before overwriting anything
  $safety = New-BackupZip -Tag "pre-restore" -RetentionDays 30
  Write-Ok "Safety backup of current state: $safety"

  $stage = Join-Path $env:TEMP ("pmct-restore-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
  New-Item -ItemType Directory -Force -Path $stage | Out-Null
  Expand-Archive -Path $Zip -DestinationPath $stage -Force

  if (-not (Test-Path (Join-Path $stage "db"))) { throw "This zip does not look like a PMCT backup (no db\ folder inside)." }

  $items = @("db", ".env")
  if (-not $DataOnly) { $items += "prisma\schema.prisma" }
  foreach ($f in $items) {
    $src = Join-Path $stage $f
    if (-not (Test-Path $src)) { Write-Warn2 "Backup has no $f — skipping."; continue }
    $dst = Join-Path $PackRoot $f
    New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
    if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
    Copy-Item $src $dst -Recurse -Force
    Write-Ok "Restored $f"
  }
  Remove-Item $stage -Recurse -Force
  Write-Ok "Restore complete."
} finally {
  if ($wasRunning -and -not $NoRestart) { Start-App }
}
