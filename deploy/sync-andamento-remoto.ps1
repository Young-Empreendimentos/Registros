# Sincroniza andamentos no banco via SSH (usa .env.local do servidor + Docker)
# Uso: $env:DEPLOY_HOST="5.161.255.208"; .\deploy\sync-andamento-remoto.ps1

$ErrorActionPreference = "Stop"
$Host_ = $env:DEPLOY_HOST
if (-not $Host_) { throw "Defina DEPLOY_HOST com o IP do servidor Hetzner" }
$User = if ($env:DEPLOY_USER) { $env:DEPLOY_USER } else { "root" }
$Dir = if ($env:DEPLOY_DIR) { $env:DEPLOY_DIR } else { "/opt/registros" }

Write-Host "Sync andamento em ${User}@${Host_}:${Dir}"

# Servidor nao tem npm no host; roda one-shot com imagem node via Docker.
# Script via stdin evita quebra de aspas no bash -lc (PowerShell -> SSH).
$remoteScript = @"
set -e
cd $Dir
git pull origin master
docker run --rm -v ${Dir}:/app -w /app --env-file ${Dir}/.env.local node:20-alpine sh -c 'npm ci && npx tsx scripts/sync-andamento-canonico.ts'
"@

$remoteScript | ssh "${User}@${Host_}" bash
if ($LASTEXITCODE -ne 0) { throw "Sync falhou (exit $LASTEXITCODE)" }

Write-Host "Sync concluido."
