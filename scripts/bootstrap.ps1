$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Path $Path | Out-Null }
}

# Ensure Node/npm are available in this process (Cursor terminal PATH may lag).
$nodeDir = "C:\Program Files\nodejs"
if (Test-Path (Join-Path $nodeDir "node.exe")) {
  $env:Path = "$nodeDir;$env:Path"
}

Write-Host "node:" (& node -v)
Write-Host "npm:" (& npm -v)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Ensure-Dir (Join-Path $root "apps")

$webDir = Join-Path $root "apps\web"
if (-not (Test-Path $webDir)) {
  Set-Location (Join-Path $root "apps")
  npm create next-app@latest web -- --yes --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --no-turbopack
}

$apiDir = Join-Path $root "apps\api"
if (-not (Test-Path $apiDir)) {
  Set-Location (Join-Path $root "apps")
  npx -y @nestjs/cli new api --package-manager npm --skip-git --skip-install
}

Set-Location $root
Write-Host "Bootstrap complete."

