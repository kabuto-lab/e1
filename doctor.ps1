# Escort Platform · Doctor
# Быстрая диагностика Docker/Postgres/Redis/MinIO/API одной командой.
# Запуск: powershell -ExecutionPolicy Bypass -File .\doctor.ps1
# (или просто .\doctor.ps1 из PowerShell в корне репо)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " ESCORT PLATFORM · DOCTOR · $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# ── 1. Docker контейнеры ──
Write-Host "`n[1] Docker containers" -ForegroundColor Yellow
try {
    $containers = docker ps -a --filter "name=escort-" --format "{{.Names}}`t{{.Status}}`t{{.Ports}}" 2>&1
    if ($containers) { $containers } else { Write-Host "  (no escort-* containers found)" -ForegroundColor Red }
} catch {
    Write-Host "  Docker not available: $($_.Exception.Message)" -ForegroundColor Red
}

# ── 2. Docker port mapping для postgres ──
Write-Host "`n[2] Docker port mapping (escort-postgres)" -ForegroundColor Yellow
try {
    $ports = docker port escort-postgres 2>&1
    if ($ports -and $ports -notmatch 'No such container') { $ports } else { Write-Host "  container not running or not found" -ForegroundColor Red }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ── 3. Что слушает порты 5432 / 6379 / 9000 / 3000 / 3001 ──
Write-Host "`n[3] Listening ports (expect 5432/6379/9000/3000/3001)" -ForegroundColor Yellow
$portsToCheck = @(5432, 6379, 9000, 3000, 3001)
foreach ($p in $portsToCheck) {
    $listen = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($listen) {
        $pids = ($listen.OwningProcess | Select-Object -Unique) -join ','
        $addrs = ($listen.LocalAddress | Select-Object -Unique) -join ','
        Write-Host ("  {0}: LISTEN on [{1}], PID {2}" -f $p, $addrs, $pids) -ForegroundColor Green
    } else {
        Write-Host ("  {0}: not listening" -f $p) -ForegroundColor Red
    }
}

# ── 4. TCP reachability (127.0.0.1:5432) ──
Write-Host "`n[4] TCP connect tests (127.0.0.1)" -ForegroundColor Yellow
foreach ($p in 5432, 6379, 9000, 3000) {
    $t = Test-NetConnection -ComputerName 127.0.0.1 -Port $p -InformationLevel Quiet -WarningAction SilentlyContinue
    $status = if ($t) { "OK" } else { "REFUSED/TIMEOUT" }
    $color = if ($t) { 'Green' } else { 'Red' }
    Write-Host ("  127.0.0.1:{0} → {1}" -f $p, $status) -ForegroundColor $color
}

# ── 5. DATABASE_URL из .env ──
Write-Host "`n[5] DATABASE_URL in .env" -ForegroundColor Yellow
$envPath = Join-Path $repoRoot ".env"
if (Test-Path $envPath) {
    $line = Get-Content $envPath | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
    if ($line) {
        # Маскируем пароль чтобы не светить в терминале
        $masked = $line -replace '(postgresql://[^:]+:)([^@]+)(@)', '$1***$3'
        Write-Host "  $masked" -ForegroundColor Gray
    } else {
        Write-Host "  DATABASE_URL not found in .env" -ForegroundColor Red
    }
} else {
    Write-Host "  .env not found at $envPath" -ForegroundColor Red
}

# ── 6. Postgres наличие соединения через psql ──
Write-Host "`n[6] Postgres actual connect (via docker exec)" -ForegroundColor Yellow
try {
    $out = docker exec escort-postgres psql -U postgres -d companion_db -c "SELECT 'pg_ok' as check, now();" 2>&1
    if ($out -match 'pg_ok') {
        Write-Host "  OK — Postgres отвечает" -ForegroundColor Green
    } else {
        Write-Host "  Проблема:" -ForegroundColor Red
        Write-Host $out
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ── 7. Migration state ──
Write-Host "`n[7] Drizzle migrations applied" -ForegroundColor Yellow
try {
    $mig = docker exec escort-postgres psql -U postgres -d companion_db -t -c "SELECT count(*) FROM drizzle.__drizzle_migrations;" 2>&1
    if ($mig -match '\d+') {
        $n = ($mig -replace '\s+','').Trim()
        Write-Host "  $n migrations applied (ожидаем 11)" -ForegroundColor $(if ($n -eq '11') { 'Green' } else { 'Yellow' })
    } else {
        Write-Host "  Error reading migrations:" -ForegroundColor Red
        Write-Host $mig
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ── 8. API health (если запущен) ──
Write-Host "`n[8] API /health" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/health' -UseBasicParsing -TimeoutSec 3
    Write-Host "  OK $($r.StatusCode): $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "  API недоступен: $($_.Exception.Message)" -ForegroundColor Red
}

# ── 9. Web check (если запущен) ──
Write-Host "`n[9] Web /api/health (через Next proxy)" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/api/health' -UseBasicParsing -TimeoutSec 3
    Write-Host "  OK $($r.StatusCode): $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "  Web/proxy недоступен: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Готово. Скопируй вывод целиком и вставь в чат." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
