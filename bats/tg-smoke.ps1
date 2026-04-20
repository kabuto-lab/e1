#Requires -Version 5.0
<#
  TG Link Smoke Test — чистый PowerShell, без bat-interop каши.
  Прогоняет полный flow: login -> link-token -> consume -> login-by-tg.
  Параметры можно переопределять через -Email, -Password, -TgId и т.д.
#>

param(
  [string]$Api        = 'http://localhost:3000',
  [string]$BotSecret  = '',
  [string]$Email      = 'admin@lovnge.local',
  [string]$Password   = 'Admin123!',
  [string]$TgId       = '123456789',
  [string]$TgUser     = 'smoke_test_user',
  [string]$TgLang     = 'ru'
)

$ErrorActionPreference = 'Stop'

if (-not $BotSecret) {
  if ($env:TELEGRAM_BOT_SECRET) {
    $BotSecret = $env:TELEGRAM_BOT_SECRET
  } else {
    $envFile = Join-Path $PSScriptRoot '..\.env'
    if (Test-Path $envFile) {
      $m = Select-String -Path $envFile -Pattern '^TELEGRAM_BOT_SECRET=(.+)$' | Select-Object -First 1
      if ($m) { $BotSecret = $m.Matches[0].Groups[1].Value.Trim() }
    }
  }
}
if (-not $BotSecret) {
  Write-Host "BotSecret not provided. Pass -BotSecret, set `$env:TELEGRAM_BOT_SECRET, or put TELEGRAM_BOT_SECRET=... in .env" -ForegroundColor Red
  exit 1
}

function Fail($msg) {
  Write-Host ""
  Write-Host "=== FAILED: $msg ===" -ForegroundColor Red
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}

function Step($n, $title) {
  Write-Host ""
  Write-Host "[$n] $title" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== TG Link Smoke Test ===" -ForegroundColor Yellow
Write-Host "API:        $Api"
Write-Host "email:      $Email"
Write-Host "telegramId: $TgId"

# 1. Login
Step '1/4' 'POST /auth/login'
try {
  $login = Invoke-RestMethod -Uri "$Api/auth/login" -Method POST `
    -ContentType 'application/json' `
    -Body (@{ email = $Email; password = $Password } | ConvertTo-Json)
} catch {
  Fail "login failed: $($_.Exception.Message)"
}
if (-not $login.accessToken) { Fail "login response has no accessToken" }
$access = $login.accessToken
Write-Host ("  OK accessToken=" + $access.Substring(0, [Math]::Min(24, $access.Length)) + "...") -ForegroundColor Green
Write-Host ("     user role: " + $login.user.role)

# 2. Create link-token
Step '2/4' 'POST /auth/telegram/link-token  (Bearer JWT)'
try {
  $lt = Invoke-RestMethod -Uri "$Api/auth/telegram/link-token" -Method POST `
    -Headers @{ Authorization = "Bearer $access" }
} catch {
  Fail "link-token failed: $($_.Exception.Message)"
}
if (-not $lt.token) { Fail "link-token response has no token" }
$token = $lt.token
Write-Host ("  OK token=" + $token.Substring(0, 16) + "...") -ForegroundColor Green
Write-Host ("     expiresAt: " + $lt.expiresAt)
$dl = if ($lt.deepLink) { $lt.deepLink } else { '(null -- set TELEGRAM_BOT_USERNAME in .env to enable)' }
Write-Host ("     deepLink:  " + $dl)

# 3. Consume (bot-side)
Step '3/4' 'POST /auth/telegram/consume  (x-bot-secret)'
try {
  $consume = Invoke-RestMethod -Uri "$Api/auth/telegram/consume" -Method POST `
    -ContentType 'application/json' `
    -Headers @{ 'x-bot-secret' = $BotSecret } `
    -Body (@{
        token                 = $token
        telegramId            = $TgId
        telegramUsername      = $TgUser
        telegramLanguageCode  = $TgLang
      } | ConvertTo-Json)
} catch {
  Fail "consume failed: $($_.Exception.Message)  (возможные причины: неверный x-bot-secret, или telegramId уже занят другим user)"
}
Write-Host ("  OK userId=" + $consume.userId) -ForegroundColor Green
Write-Host ("     telegramId=" + $consume.telegramId + "  username=" + $consume.telegramUsername)
Write-Host ("     telegramLinkedAt=" + $consume.telegramLinkedAt)

# 4. Login by TG id
Step '4/4' 'POST /auth/telegram/login  (x-bot-secret)'
try {
  $tgLogin = Invoke-RestMethod -Uri "$Api/auth/telegram/login" -Method POST `
    -ContentType 'application/json' `
    -Headers @{ 'x-bot-secret' = $BotSecret } `
    -Body (@{ telegramId = $TgId } | ConvertTo-Json)
} catch {
  Fail "login-by-tg failed: $($_.Exception.Message)"
}
$tgAccess = $tgLogin.accessToken
Write-Host ("  OK role=" + $tgLogin.user.role + "  telegramId=" + $tgLogin.user.telegramId) -ForegroundColor Green
Write-Host ("     accessToken=" + $tgAccess.Substring(0, 24) + "...")

Write-Host ""
Write-Host "=== All 4 steps passed ===" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
