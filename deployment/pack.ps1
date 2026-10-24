# PM CONTROL TOWER — Deployment pack builder.
# Assembles a distributable Windows application package from the built app:
#
#   PM-Control-Tower-Deploy-v<version>-<timestamp>.zip
#     PM-Control-Tower\            <- the "installed" application folder
#       PM-Control-Tower.exe         one-click launcher (embedded Node runtime)
#       deploy.cmd / start.cmd / stop.cmd / backup.cmd / restore.cmd / ...
#       app\                         standalone Next.js server (server.js, .next, node_modules, public)
#       prisma\schema.prisma
#       db\custom.db                 current data snapshot (unless -NoDb)
#       scripts\*.ps1                backup / restore / deploy logic
#       docs\*.md                    deployment & backup documentation
#       .env.example
#
# Usage (from the repo root or anywhere):
#   powershell -File deployment\pack.ps1                 # build + full pack
#   powershell -File deployment\pack.ps1 -NoBuild        # reuse the existing .next\standalone
#   powershell -File deployment\pack.ps1 -NoDb           # ship without the data snapshot
#   powershell -File deployment\pack.ps1 -NoExe          # skip the .exe (cmd launchers only)

param(
  [switch]$NoBuild,
  [switch]$NoDb,
  [switch]$NoExe,
  [string]$OutDir = "dist"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot       # deployment\ -> repo root
Push-Location $RepoRoot
try {
  $version = (Get-Content (Join-Path $RepoRoot "package.json") -Raw | ConvertFrom-Json).version
  # package.json is the app-version source of truth; a matching git tag is used only
  # as a fallback when package.json still carries the placeholder version.
  if ($version -eq "1.0.0") {
    try { $describe = git describe --tags --abbrev=0 2>$null; if ($LASTEXITCODE -eq 0 -and $describe) { $version = $describe.TrimStart("v") } } catch {}
  }
  $stamp    = Get-Date -Format "yyyyMMdd-HHmm"
  $zipName  = "PM-Control-Tower-Deploy-v$version-$stamp.zip"
  $stage    = Join-Path $env:TEMP "pmct-pack-$([guid]::NewGuid().ToString('N').Substring(0,8))\PM-Control-Tower"

  Write-Host "[pack] PM Control Tower v$version — building deployment package" -ForegroundColor Cyan

  # ---- 1. production build ---------------------------------------------------
  # Honor PMCT_DIST_DIR so certification/pack builds never disturb a running dev server.
  $distDir = if ($env:PMCT_DIST_DIR) { $env:PMCT_DIST_DIR } else { ".next" }
  $standalone = Join-Path $RepoRoot (Join-Path $distDir "standalone")
  if (-not $NoBuild -or -not (Test-Path (Join-Path $standalone "server.js"))) {
    Write-Host "[pack] npm run build (this can take a few minutes)..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE" }
  } else {
    Write-Host "[pack] Reusing existing .next\standalone build (-NoBuild)." -ForegroundColor Yellow
  }
  if (-not (Test-Path (Join-Path $standalone "server.js"))) { throw ".next\standalone\server.js not found — run a build first." }

  # ---- 2. stage the application folder ----------------------------------------
  Write-Host "[pack] Staging application folder..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Force -Path (Join-Path $stage "app") | Out-Null
  Copy-Item "$standalone\*" (Join-Path $stage "app") -Recurse -Force

  New-Item -ItemType Directory -Force -Path (Join-Path $stage "prisma") | Out-Null
  Copy-Item (Join-Path $RepoRoot "prisma\schema.prisma") (Join-Path $stage "prisma\schema.prisma") -Force

  if (-not $NoDb) {
    $dbFile = Join-Path $RepoRoot "db\custom.db"
    if (Test-Path $dbFile) {
      New-Item -ItemType Directory -Force -Path (Join-Path $stage "db") | Out-Null
      Copy-Item $dbFile (Join-Path $stage "db\custom.db") -Force
      Write-Host "[pack] Included data snapshot db\custom.db ($('{0:N1}' -f ((Get-Item $dbFile).Length / 1MB)) MB)." -ForegroundColor Cyan
    }
  }

  foreach ($f in @(".env.example")) {
    Copy-Item (Join-Path $RepoRoot $f) (Join-Path $stage $f) -Force
  }

  # cmd launchers to the pack root, powershell scripts into scripts\, docs into docs\
  New-Item -ItemType Directory -Force -Path (Join-Path $stage "scripts") | Out-Null
  Copy-Item (Join-Path $PSScriptRoot "cmd\*.cmd") $stage -Force
  Copy-Item (Join-Path $PSScriptRoot "scripts\*.ps1") (Join-Path $stage "scripts") -Force
  New-Item -ItemType Directory -Force -Path (Join-Path $stage "docs") | Out-Null
  Copy-Item (Join-Path $PSScriptRoot "docs\*.md") (Join-Path $stage "docs") -Force

  # ---- 3. PM-Control-Tower.exe (Node Single Executable Application) ------------
  if (-not $NoExe) {
    try {
      Write-Host "[pack] Building PM-Control-Tower.exe (embedded Node runtime)..." -ForegroundColor Cyan
      $runtimeDir = Join-Path $PSScriptRoot "runtime"
      Push-Location $runtimeDir
      try {
        & node --experimental-sea-config sea-config.json
        if ($LASTEXITCODE -ne 0) { throw "sea-config failed ($LASTEXITCODE)" }
        $nodeExe = (Get-Command node).Source
        $exePath = Join-Path $stage "PM-Control-Tower.exe"
        Copy-Item $nodeExe $exePath -Force
        & npx --yes postject $exePath NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
        if ($LASTEXITCODE -ne 0) { throw "postject failed ($LASTEXITCODE)" }
        # Smoke test the exe
        $out = & $exePath --version
        if ($LASTEXITCODE -eq 0 -and $out -match "PM Control Tower") {
          Write-Host "[pack] Exe OK: $out" -ForegroundColor Green
        } else {
          throw "exe smoke test failed"
        }
      } finally { Pop-Location }
    } catch {
      Write-Host "[pack] WARNING: .exe build failed ($($_.Exception.Message)). Shipping cmd launchers only." -ForegroundColor Yellow
      Remove-Item (Join-Path $stage "PM-Control-Tower.exe") -Force -ErrorAction SilentlyContinue
    }
  } else {
    Write-Host "[pack] Skipping .exe (-NoExe)." -ForegroundColor Yellow
  }

  # ---- 4. zip it ---------------------------------------------------------------
  $outPath = Join-Path $RepoRoot $OutDir
  New-Item -ItemType Directory -Force -Path $outPath | Out-Null
  $zipPath = Join-Path $outPath $zipName
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  $tmpZip = Join-Path $outPath "$zipName.part.zip"
  if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force }
  Write-Host "[pack] Compressing (this can take a minute)..." -ForegroundColor Cyan
  # Forward-slash zip entries so the archive extracts correctly on any OS/tool
  . (Join-Path $PSScriptRoot "scripts\common.ps1")
  Compress-Zip -SourceDir $stage -DestZip $tmpZip -RootName "PM-Control-Tower"
  Move-Item $tmpZip $zipPath
  Remove-Item (Split-Path $stage) -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $PSScriptRoot "runtime\sea-prep.blob") -Force -ErrorAction SilentlyContinue

  $size = "{0:N1} MB" -f ((Get-Item $zipPath).Length / 1MB)
  $sha  = (Get-FileHash $zipPath -Algorithm SHA256).Hash
  Write-Host ""
  Write-Host "[pack] DONE: $zipPath" -ForegroundColor Green
  Write-Host "[pack] Size: $size"
  Write-Host "[pack] SHA256: $sha"
} finally {
  Pop-Location
}
