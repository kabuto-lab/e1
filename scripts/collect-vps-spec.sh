#!/usr/bin/env bash
# Сбор несекретной спецификации VPS для отладки/документации.
# Запуск из любой директории: bash scripts/collect-vps-spec.sh
# Или: bash ~/e1/scripts/collect-vps-spec.sh > ~/vps-spec.txt

set +e

echo "=== VPS SPEC ==="
echo "Collected at (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo

echo "=== HOSTNAME / OS ==="
hostnamectl 2>/dev/null || true
uname -a 2>/dev/null || true
echo

echo "=== KERNEL ==="
uname -r 2>/dev/null || true
echo

echo "=== CPU ==="
command -v nproc >/dev/null && echo "nproc: $(nproc)"
lscpu 2>/dev/null | head -40 || true
echo

echo "=== MEMORY ==="
free -h 2>/dev/null || true
echo

echo "=== DISK ==="
df -hT 2>/dev/null || true
echo
lsblk 2>/dev/null || true
echo

echo "=== LISTENING TCP PORTS (no root may hide PIDs) ==="
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || true
echo

echo "=== NODE / NPM ==="
command -v node >/dev/null && node -v || echo "node: not found"
command -v npm >/dev/null && npm -v || echo "npm: not found"
echo

echo "=== PM2 ==="
command -v pm2 >/dev/null && pm2 -v && pm2 list && pm2 describe escort-api 2>/dev/null || echo "pm2: not found or no escort-api"
echo

echo "=== NGINX ==="
command -v nginx >/dev/null && nginx -v 2>&1 || echo "nginx: not found"
test -d /etc/nginx/sites-enabled && ls -la /etc/nginx/sites-enabled 2>/dev/null || true
echo

echo "=== DOCKER ==="
command -v docker >/dev/null && docker --version || echo "docker: not found"
(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null) || true
docker ps -a 2>/dev/null || true
echo

echo "=== POSTGRES CLIENT ==="
command -v psql >/dev/null && psql --version || echo "psql: not found"
echo

echo "=== GIT REPO (~/e1 or override REPO_ROOT) ==="
REPO_ROOT="${REPO_ROOT:-$HOME/e1}"
if [ -d "$REPO_ROOT/.git" ]; then
  echo "REPO_ROOT=$REPO_ROOT"
  git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null
  git -C "$REPO_ROOT" status -sb 2>/dev/null
  git -C "$REPO_ROOT" remote -v 2>/dev/null
else
  echo "No git repo at $REPO_ROOT (set REPO_ROOT=... if elsewhere)"
fi
echo

echo "=== .env PRESENT (keys only, no values) ==="
if [ -f "$REPO_ROOT/.env" ]; then
  grep -E '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=' "$REPO_ROOT/.env" 2>/dev/null | cut -d= -f1 | sed 's/^[[:space:]]*//' | sort -u
else
  echo "(no .env at $REPO_ROOT/.env)"
fi
echo

echo "=== OPTIONAL: SYSTEMD UNITS (grep escort/nginx/node) ==="
systemctl list-units --type=service --state=running 2>/dev/null | grep -iE 'nginx|node|pm2|escort|postgres|docker' || true
echo

echo "=== END ==="
