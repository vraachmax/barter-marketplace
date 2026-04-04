$ErrorActionPreference = "Stop"

$nodeDir = "C:\Program Files\nodejs"
if (Test-Path (Join-Path $nodeDir "node.exe")) {
  $env:Path = "$nodeDir;$env:Path"
}

& (Join-Path $nodeDir "npm.cmd") @args
exit $LASTEXITCODE

