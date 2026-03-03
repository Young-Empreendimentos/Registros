# Script de sincronização automática SIENGE
# Executar diariamente às 02:00

$logFile = "C:\Users\Rafael\Desktop\Projeto registros\logs\sync-$(Get-Date -Format 'yyyy-MM-dd').log"
$logDir = "C:\Users\Rafael\Desktop\Projeto registros\logs"

# Criar pasta de logs se não existir
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Add-Content -Path $logFile -Value $logMessage
    Write-Host $logMessage
}

Write-Log "=== INICIANDO SINCRONIZACAO SIENGE ==="

try {
    # Verificar se o servidor está rodando
    $serverRunning = $false
    try {
        $test = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/setup" -Method GET -UseBasicParsing -TimeoutSec 5
        if ($test.StatusCode -eq 200) {
            $serverRunning = $true
        }
    } catch {
        $serverRunning = $false
    }

    if (-not $serverRunning) {
        Write-Log "Servidor Next.js nao esta rodando. Iniciando..."
        
        # Iniciar o servidor em background
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "cmd.exe"
        $processInfo.Arguments = "/c cd /d `"C:\Users\Rafael\Desktop\Projeto registros`" && npm run dev"
        $processInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $processInfo.CreateNoWindow = $true
        [System.Diagnostics.Process]::Start($processInfo) | Out-Null
        
        Write-Log "Aguardando servidor iniciar (30 segundos)..."
        Start-Sleep -Seconds 30
    }

    # Disparar sincronização (fire and forget - não espera resposta completa)
    Write-Log "Disparando sincronizacao..."
    
    $body = '{"secret":"young-sync-secret-2026"}'
    
    # Usa um job para não bloquear
    $job = Start-Job -ScriptBlock {
        param($body)
        try {
            Invoke-WebRequest -Uri "http://localhost:3000/api/sync" `
                -Method POST `
                -Body $body `
                -ContentType "application/json" `
                -UseBasicParsing `
                -TimeoutSec 1800
        } catch {
            # Ignora erros de timeout - a sync pode continuar no servidor
        }
    } -ArgumentList $body

    Write-Log "Sincronizacao disparada. Aguardando conclusao (max 35 min)..."
    
    # Aguarda até 25 minutos, verificando status a cada 30 segundos
    $maxWait = 35 * 60  # 25 minutos em segundos
    $waited = 0
    $interval = 30
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds $interval
        $waited += $interval
        
        # Verificar status no banco
        try {
            $logsResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/sync-logs" -Method GET -TimeoutSec 10
            $latest = $logsResponse.logs[0]
            
            if ($latest.status -eq "success") {
                Write-Log "SUCESSO: $($latest.registros_atualizados) registros atualizados"
                if ($latest.detalhes.valores_atualizados) {
                    Write-Log "Valores pagos corrigidos: $($latest.detalhes.valores_atualizados)"
                }
                if ($latest.detalhes.income_count) {
                    Write-Log "Recebimentos processados: $($latest.detalhes.income_count)"
                }
                break
            } elseif ($latest.status -eq "error") {
                Write-Log "ERRO na sincronizacao: $($latest.detalhes.error)"
                break
            } else {
                $minutos = [math]::Round($waited / 60, 1)
                Write-Log "Aguardando... ($minutos min)"
            }
        } catch {
            Write-Log "Erro ao verificar status: $($_.Exception.Message)"
        }
    }
    
    if ($waited -ge $maxWait) {
        Write-Log "TIMEOUT: Sincronizacao excedeu 35 minutos"
    }
    
    # Limpa o job
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -ErrorAction SilentlyContinue

} catch {
    Write-Log "ERRO CRITICO: $($_.Exception.Message)"
}

Write-Log "=== SINCRONIZACAO FINALIZADA ==="

