# PM CONTROL TOWER — Full application backup (repo-level).
# Produces two timestamped archives in backups\:
#   pmct-backup-<stamp>.zip       system backup: consistent DB snapshot + .env + schema + manifest
#   pmct-app-backup-<stamp>.zip   full application: all source, docs, sales assets, config (excludes
#                                 node_modules / .next / .git / dist — reproducible via npm ci + build)
# Usage:  powershell -File scripts\backup-app.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $RepoRoot "deployment\scripts\common.ps1")

$stamp     = Get-Date -Format "yyyyMMdd-HHmmss"
$version   = (Get-Content (Join-Path $RepoRoot "package.json") -Raw | ConvertFrom-Json).version
if (-not $version -or $version -eq "") { $version = Get-AppVersion }
$backupDir = Join-Path $RepoRoot "backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$work = Join-Path $env:TEMP ("pmct-app-backup-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force -Path $work | Out-Null

Write-Step "Application backup v$version starting"

# ---- 1. Consistent database snapshot (online VACUUM INTO — safe while the app runs) ----
$dbSnap = Join-Path $work "db-snapshot.db"
Push-Location $RepoRoot
try {
  npx --yes tsx scripts/vacuum-db-snapshot.ts $dbSnap
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dbSnap)) { throw "database snapshot failed" }
} finally { Pop-Location }
Write-Ok ("DB snapshot: {0:N1} MB" -f ((Get-Item $dbSnap).Length / 1MB))

# ---- 2. System backup zip (db snapshot + .env + schema + manifest) ----
$sysStage = Join-Path $work "system"
New-Item -ItemType Directory -Force -Path $sysStage | Out-Null
Copy-Item $dbSnap (Join-Path $sysStage "pmct.db") -Force
Copy-Item (Join-Path $RepoRoot ".env") (Join-Path $sysStage ".env") -Force
Copy-Item (Join-Path $RepoRoot "prisma\schema.prisma") (Join-Path $sysStage "schema.prisma") -Force
$sysManifest = @{
  created  = (Get-Date).ToString("o")
  app      = "PM Control Tower"
  version  = $version
  kind     = "system-backup (database + env + schema)"
  database = "consistent snapshot via SQLite VACUUM INTO"
}
$sysManifest | ConvertTo-Json | Set-Content (Join-Path $sysStage "manifest.json")
$sysZip = Join-Path $backupDir ("pmct-backup-" + $stamp + ".zip")
Compress-Zip -SourceDir $sysStage -DestZip $sysZip
Write-Ok ("System backup: {0} ({1:N1} KB)" -f $sysZip, ((Get-Item $sysZip).Length / 1KB))

# ---- 3. Full application source backup ----
$appStage = Join-Path $work "PM-Control-Tower"
New-Item -ItemType Directory -Force -Path $appStage | Out-Null
$excl = @("node_modules", ".next", ".next-prod", ".git", "dist", "backups", "tool-results", "versions") | ForEach-Object { Join-Path $RepoRoot $_ }
robocopy $RepoRoot $appStage /E /XD @excl /XF "*.log" "tsconfig.tsbuildinfo" /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }
$appManifest = @{
  created  = (Get-Date).ToString("o")
  app      = "PM Control Tower"
  version  = $version
  kind     = "full-application-backup (source, docs, sales assets, scripts, config; excludes node_modules/.next/.git/dist - reproducible via npm ci + npm run build)"
  includes = @("src", "prisma", "db", "docs", "deployment", "sales-deck", "Important Documents", "download", "scripts", "tests", "mini-services", "deploy", "public", "agent-ctx", ".env", "package.json", "package-lock.json", "bun.lock", "CHANGELOG.md", "VERSION", "worklog.md", "gui-test-screenshots")
}
$appManifest | ConvertTo-Json | Set-Content (Join-Path $appStage "backup-manifest.json")
$appZip = Join-Path $backupDir ("pmct-app-backup-" + $stamp + ".zip")
Write-Step "Compressing full application backup..."
Compress-Zip -SourceDir $appStage -DestZip $appZip -RootName "PM-Control-Tower"
$sha = (Get-FileHash $appZip -Algorithm SHA256).Hash

Write-Ok ("Application backup: {0} ({1:N1} MB)" -f $appZip, ((Get-Item $appZip).Length / 1MB))
Write-Ok ("SHA256: " + $sha)
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
Write-Ok "Backup complete."
