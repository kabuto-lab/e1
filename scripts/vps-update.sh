#!/usr/bin/env bash
# Run on the VPS after SSH login (not from Windows without SSH).
# Usage: DEPLOY_ROOT=/opt/e1 bash scripts/vps-update.sh
set -euo pipefail

ROOT="${DEPLOY_ROOT:-/opt/escort-platform}"
cd "$ROOT"

git fetch origin
git checkout main
git pull origin main

npm ci --include=dev
npm run db:migrate
npm run build

pm2 restart escort-api escort-web 2>/dev/null || {
  echo "PM2 apps missing; start them per VPS_DEPLOY_HELP.html (escort-api, escort-web)."
  exit 1
}

echo "OK: $(git rev-parse --short HEAD)"
