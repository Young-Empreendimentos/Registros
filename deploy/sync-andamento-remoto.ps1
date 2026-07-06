# Sincroniza andamentos no banco via SSH (usa .env.local do servidor + Docker)
# Uso: $env:DEPLOY_HOST="5.161.255.208"; .\deploy\sync-andamento-remoto.ps1

$ErrorActionPreference = "Stop"
$Host_ = $env:DEPLOY_HOST
if (-not $Host_) { throw "Defina DEPLOY_HOST com o IP do servidor Hetzner" }
$User = if ($env:DEPLOY_USER) { $env:DEPLOY_USER } else { "root" }
$Dir = if ($env:DEPLOY_DIR) { $env:DEPLOY_DIR } else { "/opt/registros" }

Write-Host "Sync andamento em ${User}@${Host_}:${Dir}"

# Usa script .sh do repo (LF) — evita CRLF do PowerShell quebrando bash remoto
$remote = "set -e; cd $Dir && git pull origin master && bash deploy/sync-andamento-remoto.sh"

ssh "${User}@${Host_}" "bash -lc '$remote'"
if ($LASTEXITCODE -ne 0) { throw "Sync falhou (exit $LASTEXITCODE)" }

Write-Host "Sync concluido."
