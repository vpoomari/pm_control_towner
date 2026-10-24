# PM CONTROL TOWER — Shared helpers for the deployment pack scripts.
# Every script sources this file; $PackRoot is the folder that contains the
# application (the .exe, start.cmd, app\, db\, ...).

$ErrorActionPreference = "Stop"

$PackRoot = Split-Path -Parent $PSScriptRoot          # <root>\scripts\common.ps1 -> <root>
$LogFile  = Join-Path $PackRoot "logs"
$PidFile  = Join-Path $PackRoot "run\app.pid"
$Port     = 3000
if (Test-Path (Join-Path $PackRoot ".env")) {
  foreach ($line in Get-Content (Join-Path $PackRoot ".env")) {
    if ($line -match '^\s*PORT\s*=\s*(\d+)') { $Port = [int]$Matches[1]; break }
  }
}

function Write-Step([string]$msg) { Write-Host "[PMCT] $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "[PMCT] $msg" -ForegroundColor Green }
function Write-Warn2([string]$msg){ Write-Host "[PMCT] $msg" -ForegroundColor Yellow }

function Test-AppRunning {
  # PID file first, then port listener as fallback.
  if (Test-Path $PidFile) {
    $pidValue = Get-Content $PidFile -ErrorAction SilentlyContinue
    if ($pidValue -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) { return [int]$pidValue }
  }
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { return [int]$conn.OwningProcess }
  return 0
}

function Stop-App {
  $procId = Test-AppRunning
  if (-not $procId) { Write-Warn2 "App is not running."; return $false }
  Write-Step "Stopping app (PID $procId)..."
  foreach ($name in @("PM-Control-Tower", "node")) {
    Get-Process -Id $procId -ErrorAction SilentlyContinue |
      Where-Object { $_.ProcessName -eq $name } |
      Stop-Process -Force -ErrorAction SilentlyContinue
  }
  # Also catch a stray node.exe serving the port (e.g. started outside the launcher).
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn -and $conn.OwningProcess -ne $PID) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 1
  if (Test-Path $PidFile) { Remove-Item $PidFile -Force -ErrorAction SilentlyContinue }
  Write-Ok "App stopped."
  return $true
}

function Start-App {
  if (Test-AppRunning) { Write-Warn2 "App is already running."; return }
  Write-Step "Starting app on port $Port..."
  New-Item -ItemType Directory -Force -Path (Join-Path $PackRoot "run") | Out-Null
  New-Item -ItemType Directory -Force -Path $LogFile | Out-Null
  $exe  = Join-Path $PackRoot "PM-Control-Tower.exe"
  $fallback = Join-Path $PackRoot "start.cmd"
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  if (Test-Path $exe) {
    $proc = Start-Process -FilePath $exe -WorkingDirectory $PackRoot -WindowStyle Minimized -PassThru `
      -RedirectStandardOutput (Join-Path $LogFile "console-$stamp.log") -RedirectStandardError (Join-Path $LogFile "console-$stamp.err.log")
  } elseif (Test-Path $fallback) {
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$fallback`"" -WorkingDirectory $PackRoot -WindowStyle Minimized -PassThru
  } else {
    throw "No launcher found (PM-Control-Tower.exe or start.cmd)."
  }
  # Wait for the HTTP listener (max 45 s)
  $deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 800
    if (Test-AppRunning) { break }
  }
  if (Test-AppRunning) {
    Write-Ok "App started (PID $(Test-AppRunning)) — http://localhost:$Port"
  } else {
    Write-Warn2 "App did not report a listener yet — check logs\console-$stamp.log"
  }
}

function Get-AppVersion {
  $pkg = Join-Path $PackRoot "app\package.json"
  if (Test-Path $pkg) { return (Get-Content $pkg -Raw | ConvertFrom-Json).version }
  return "unknown"
}

function Compress-Zip {
  # Forward-slash-safe zip (Compress-Archive writes "\" separators, which breaks
  # non-Windows unzip tools). With -RootName, all entries are nested under that
  # folder inside the zip; without it, SourceDir's contents are the zip root.
  param([string]$SourceDir, [string]$DestZip, [string]$RootName = "")
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path $DestZip) { Remove-Item $DestZip -Force }
  $zip = [System.IO.Compression.ZipFile]::Open($DestZip, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    Get-ChildItem $SourceDir -Recurse -File | ForEach-Object {
      $rel = $_.FullName.Substring($SourceDir.Length + 1).Replace("\", "/")
      if ($RootName) { $rel = "$RootName/$rel" }
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally { $zip.Dispose() }
}

function New-BackupZip {
  param(
    [string]$Tag = "backup",
    [int]$RetentionDays = 30
  )
  $backupDir = Join-Path $PackRoot "backups"
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $stage = Join-Path $env:TEMP "pmct-backup-$stamp"
  New-Item -ItemType Directory -Force -Path $stage | Out-Null

  # Collect: database, environment, schema
  $dbDir = Join-Path $PackRoot "db"
  if (Test-Path $dbDir) {
    Copy-Item $dbDir (Join-Path $stage "db") -Recurse -Force
    Get-ChildItem (Join-Path $stage "db") -Include "*.db-journal","*.db-wal","*.db-shm" -Recurse -ErrorAction SilentlyContinue |
      Remove-Item -Force -ErrorAction SilentlyContinue   # stale journals have no place in a clean backup
  }
  foreach ($f in @(".env", "prisma\schema.prisma")) {
    $src = Join-Path $PackRoot $f
    if (Test-Path $src) {
      $dst = Join-Path $stage $f
      New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
      Copy-Item $src $dst -Force
    }
  }

  $manifest = [ordered]@{
    pack       = "PM Control Tower deployment pack"
    tag        = $Tag
    appVersion = Get-AppVersion
    host       = $env:COMPUTERNAME
    createdBy  = $env:USERNAME
    createdAt  = (Get-Date).ToUniversalTime().ToString("o")
    files      = @(Get-ChildItem $stage -Recurse -File | ForEach-Object { $_.FullName.Substring($stage.Length + 1) })
  }
  $manifest | ConvertTo-Json | Set-Content (Join-Path $stage "manifest.json") -Encoding UTF8

  $zip = Join-Path $backupDir "pmct-$Tag-$stamp.zip"
  Compress-Zip -SourceDir $stage -DestZip $zip
  Remove-Item $stage -Recurse -Force

  # Retention
  if ($RetentionDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem $backupDir -Filter "pmct-*.zip" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
      Remove-Item $_.FullName -Force
      Write-Warn2 "Retention: removed $($_.Name)"
    }
  }
  return $zip
}
