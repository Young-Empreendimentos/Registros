# Copia .env.local do servidor Hetzner (credenciais reais do Supabase)
# Uso: $env:DEPLOY_HOST="5.161.255.208"; .\deploy\copiar-env-servidor.ps1

$ErrorActionPreference = "Stop"
$Host_ = $env:DEPLOY_HOST
if (-not $Host_) { $Host_ = "5.161.255.208" }
$User = if ($env:DEPLOY_USER) { $env:DEPLOY_USER } else { "root" }
$Remote = if ($env:DEPLOY_DIR) { $env:DEPLOY_DIR } else { "/opt/registros" }

Write-Host "Copiando ${Remote}/.env.local de ${User}@${Host_} ..."
scp "${User}@${Host_}:${Remote}/.env.local" ".env.local"
if ($LASTEXITCODE -ne 0) { throw "scp falhou (exit $LASTEXITCODE)" }
Write-Host "OK - .env.local atualizado."
Write-Host "Rode: npm exec tsx scripts/sync-andamento-canonico.ts"
