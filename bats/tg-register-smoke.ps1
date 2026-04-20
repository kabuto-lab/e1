#Requires -Version 5.0
<#
  Register smoke — проверяет flow "бот создаёт новый TG-only аккаунт":
    1. POST /auth/telegram/register  (x-bot-secret)  → user + JWT
    2. POST /auth/telegram/login     (x-bot-secret)  → тот же user, свежий JWT

  Использует случайный telegramId, чтобы не конфликтовать с предыдущими прогонами.
#>

param(
  [string]$Api        = 'http://localhost:3000',
  [string]$BotSecret  = '',
  [string]$TgId       = '',  # empty -> random
  [string]$TgUser     = 'register_smoke',
  [string]$TgLang     = 'ru',
  [string]$Role       = 'client'
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

if (-not $TgId) {
  $TgId = (Get-Random -Minimum 1000000000 -Maximum 2147483647).ToString()
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
Write-Host "=== TG Register Smoke ===" -ForegroundColor Yellow
Write-Host "API:        $Api"
Write-Host "telegramId: $TgId"
Write-Host "role:       $Role"

Step '1/2' 'POST /auth/telegram/register  (bot-secret)'
try {
  $reg = Invoke-RestMethod -Uri "$Api/auth/telegram/register" -Method POST `
    -ContentType 'application/json' `
    -Headers @{ 'x-bot-secret' = $BotSecret } `
    -Body (@{
        telegramId            = $TgId
        telegramUsername      = $TgUser
        telegramLanguageCode  = $TgLang
        role                  = $Role
      } | ConvertTo-Json)
} catch {
  Fail "register failed: $($_.Exception.Message)"
}
if (-not $reg.accessToken) { Fail "no accessToken in register response" }
Write-Host ("  OK userId=" + $reg.user.id) -ForegroundColor Green
Write-Host ("     role=" + $reg.user.role + "  status=" + $reg.user.status)
Write-Host ("     telegramId=" + $reg.user.telegramId + "  @" + $reg.user.telegramUsername)
Write-Host ("     accessToken=" + $reg.accessToken.Substring(0, 24) + "...")

Step '2/2' 'POST /auth/telegram/login  (same tgId - should return existing user)'
try {
  $login = Invoke-RestMethod -Uri "$Api/auth/telegram/login" -Method POST `
    -ContentType 'application/json' `
    -Headers @{ 'x-bot-secret' = $BotSecret } `
    -Body (@{ telegramId = $TgId } | ConvertTo-Json)
} catch {
  Fail "login-by-tg failed: $($_.Exception.Message)"
}
if ($login.user.id -ne $reg.user.id) {
  Fail "login returned different userId ($($login.user.id) != $($reg.user.id))"
}
Write-Host ("  OK role=" + $login.user.role + "  userId matches") -ForegroundColor Green

Write-Host ""
Write-Host "=== Both steps passed - TG-only registration OK ===" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
