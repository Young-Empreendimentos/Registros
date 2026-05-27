# Deploy via SSH no Hetzner (PowerShell)
# Uso: $env:DEPLOY_HOST="1.2.3.4"; $env:DEPLOY_USER="root"; .\deploy\deploy-remoto.ps1

$ErrorActionPreference = "Stop"
$Host_ = $env:DEPLOY_HOST
if (-not $Host_) { throw "Defina DEPLOY_HOST com o IP do servidor Hetzner" }
$User = if ($env:DEPLOY_USER) { $env:DEPLOY_USER } else { "root" }
$Dir = if ($env:DEPLOY_DIR) { $env:DEPLOY_DIR } else { "/opt/registros" }
$Branch = if ($env:DEPLOY_BRANCH) { $env:DEPLOY_BRANCH } else { "master" }

Write-Host "→ Deploy em ${User}@${Host_}:${Dir} (branch $Branch)"

$remote = @"
set -e
cd $Dir
git fetch origin
git checkout $Branch
git pull origin $Branch
docker compose build
docker compose up -d
docker compose ps
"@

ssh "${User}@${Host_}" $remote
Write-Host "Deploy concluído."
