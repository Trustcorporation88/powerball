#!/usr/bin/env pwsh
## Port manager for dev server with fixed 8081 and fallback to 8082
$PORT_PRIMARY = 8081
$PORT_FALLBACK = 8082
$WORK_DIR = "C:\\merry-parrot-scurry"

function Test-PortOpen([int]$port) {
  try {
    $c = Get-NetTCPConnection -LocalPort $port -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Kill-PortOwner([int]$port) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($null -ne $conns) {
      foreach ($c in $conns) {
        if ($c.OwnersProcess) {
          Stop-Process -Id $c.OwnersProcess -Force -ErrorAction SilentlyContinue
        }
      }
    }
  } catch { }
}

function Start-DevServer([int]$port) {
  Write-Host "[PORT] Starting dev server on port $port" -ForegroundColor Cyan
  $proc = Start-Process -FilePath pwsh -ArgumentList "-NoProfile","-Command","pnpm run dev -- --port $port" -WorkingDirectory $WORK_DIR -PassThru
  Write-Host "[PORT] Dev server PID=$($proc.Id)" -ForegroundColor Green
  return $proc
}

function Wait-Port([int]$port, [int]$seconds = 6) {
  for ($i = 0; $i -lt $seconds; $i++) {
    Start-Sleep -Seconds 2
    if (Test-PortOpen $port) { return $true }
  }
  return $false
}

function HealthCheck([int]$port) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (Test-PortOpen $PORT_PRIMARY) {
  Write-Host "[PORT] Porta $PORT_PRIMARY já está ocupada. Liberando..." -ForegroundColor Yellow
  Kill-PortOwner $PORT_PRIMARY
}

Write-Host "[PORT] Iniciando na porta $PORT_PRIMARY" -ForegroundColor Cyan
$proc = Start-DevServer $PORT_PRIMARY
if (Wait-Port $PORT_PRIMARY) {
  if (HealthCheck $PORT_PRIMARY) { Write-Host "[PORT] Servidor ativo em http://localhost:$PORT_PRIMARY" -ForegroundColorGreen; exit 0 }
}

Write-Host "[PORT] Falha na porta $PORT_PRIMARY, tentando $PORT_FALLBACK" -ForegroundColor Yellow
$proc = Start-DevServer $PORT_FALLBACK
if (Wait-Port $PORT_FALLBACK) {
  if (HealthCheck $PORT_FALLBACK) { Write-Host "[PORT] Servidor ativo em http://localhost:$PORT_FALLBACK" -ForegroundColorGreen; exit 0 }
}

Write-Host "[PORT] Falha ao iniciar servidor nas portas 8081/8082" -ForegroundColor Red
exit 1
