# Освобождает порты dev-серверов и lock Next.js (Windows).
$ErrorActionPreference = "SilentlyContinue"
$ports = @(3000, 3001, 3002)
foreach ($port in $ports) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$lock = Join-Path $projectRoot "apps\web\.next\dev\lock"
if (Test-Path $lock) { Remove-Item $lock -Force }
Write-Host "Freed ports 3000-3002; removed Next dev lock if present."
