#!/usr/bin/env bash
# Параллельный предпросмотр ветки на VPS: свой git worktree + свой PM2-процесс на своём порту.
# Основной деплой (main: escort-web :3001, escort-api :3000, nginx 80/443) не останавливается
# и не переключается. Предпросмотр открывается по IP сервера, домен не нужен.
#
# Первый запуск (скрипт лежит в ветке, поэтому берём его прямо из origin, не трогая ~/e1):
#   git -C ~/e1 fetch origin redesign/homepage \
#     && git -C ~/e1 show FETCH_HEAD:scripts/vps-preview.sh | bash
# Дальше — из каталога предпросмотра: npm run vps:preview
#
# Переопределения (env): MAIN_REPO, PREVIEW_DIR, PREVIEW_BRANCH, PREVIEW_PORT, PREVIEW_APP, API_UPSTREAM
# Пример: PREVIEW_PORT=3003 bash scripts/vps-preview.sh
# Убрать предпросмотр: bash scripts/vps-preview.sh --down
set -euo pipefail

MAIN_REPO="${MAIN_REPO:-$HOME/e1}"
PREVIEW_DIR="${PREVIEW_DIR:-$HOME/e1-preview}"
PREVIEW_BRANCH="${PREVIEW_BRANCH:-redesign/homepage}"
PREVIEW_PORT="${PREVIEW_PORT:-3002}"
PREVIEW_APP="${PREVIEW_APP:-escort-web-preview}"
API_UPSTREAM="${API_UPSTREAM:-http://127.0.0.1:3000}"

log() { printf '\n==> %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }

if [ "${1:-}" = "--down" ]; then
  log "убираю предпросмотр: PM2 $PREVIEW_APP и worktree $PREVIEW_DIR"
  pm2 delete "$PREVIEW_APP" 2>/dev/null || true
  pm2 save >/dev/null 2>&1 || true
  git -C "$MAIN_REPO" worktree remove --force "$PREVIEW_DIR" 2>/dev/null || true
  log "готово (основной деплой не тронут: $(git -C "$MAIN_REPO" rev-parse --abbrev-ref HEAD))"
  exit 0
fi

[ -e "$MAIN_REPO/.git" ] || die "нет git-репозитория в MAIN_REPO=$MAIN_REPO"
[ -f "$MAIN_REPO/.env" ] || die "нет $MAIN_REPO/.env — он нужен для сборки и рантайма"
command -v npm >/dev/null || die 'нет npm в PATH'
command -v pm2 >/dev/null || die 'нет pm2 в PATH'

log "git fetch origin $PREVIEW_BRANCH"
git -C "$MAIN_REPO" fetch origin "$PREVIEW_BRANCH"

if [ -e "$PREVIEW_DIR/.git" ]; then
  log "worktree уже есть — обновляю ветку $PREVIEW_BRANCH"
  git -C "$PREVIEW_DIR" checkout "$PREVIEW_BRANCH"
  git -C "$PREVIEW_DIR" pull --ff-only origin "$PREVIEW_BRANCH"
else
  # -B: завести локальную ветку на origin, чтобы дальше работал pull --ff-only
  log "создаю worktree $PREVIEW_DIR на ветке $PREVIEW_BRANCH"
  git -C "$MAIN_REPO" worktree add -B "$PREVIEW_BRANCH" "$PREVIEW_DIR" "origin/$PREVIEW_BRANCH"
fi

if [ ! -e "$PREVIEW_DIR/.env" ]; then
  log "линкую .env на основной ($MAIN_REPO/.env)"
  ln -s "$MAIN_REPO/.env" "$PREVIEW_DIR/.env"
fi

AVAIL_KB="$(df -Pk "$PREVIEW_DIR" | awk 'NR==2 {print $4}')"
if [ "${AVAIL_KB:-0}" -lt 4194304 ]; then
  echo "ВНИМАНИЕ: свободно $(awk -v k="$AVAIL_KB" 'BEGIN{printf "%.1f", k/1048576}') ГБ — npm ci и сборка могут не поместиться"
fi

# На сборку нужны только NEXT_PUBLIC_* — Next инлайнит их в бандл. Целиком .env не сорсим:
# он ломает shell любой нестандартной строкой (в .env бывают комментарии-простыни и мусор),
# а для рантайма его и так читает ecosystem.preview.cjs через dotenv.
log "окружение сборки: NEXT_PUBLIC_* из $PREVIEW_DIR/.env"
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  case "$line" in
    NEXT_PUBLIC_*=*) export "$line" ;;
  esac
done < "$PREVIEW_DIR/.env"
# Предпросмотр открывается по IP:порту: браузер ходит на /api того же origin (без CORS),
# а Next проксирует его на локальный Nest основного деплоя.
export NEXT_PUBLIC_API_URL=''
export API_PROXY_UPSTREAM="$API_UPSTREAM"
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"

log 'npm ci'
( cd "$PREVIEW_DIR" && npm ci )

log 'сборка веба (@escort/web)'
( cd "$PREVIEW_DIR" && npm run build --workspace=@escort/web )

log "PM2: $PREVIEW_APP на порту $PREVIEW_PORT"
if pm2 describe "$PREVIEW_APP" >/dev/null 2>&1; then
  pm2 startOrReload "$PREVIEW_DIR/ecosystem.preview.cjs" --only "$PREVIEW_APP" --update-env
else
  pm2 start "$PREVIEW_DIR/ecosystem.preview.cjs" --only "$PREVIEW_APP" --update-env
fi
pm2 save >/dev/null 2>&1 || true

IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
log "готово: ветка $(git -C "$PREVIEW_DIR" rev-parse --short HEAD), основной сайт не тронут"
echo "Предпросмотр: http://${IP:-<IP-VPS>}:$PREVIEW_PORT/"
if ! ss -tln 2>/dev/null | grep -q ":$PREVIEW_PORT "; then
  echo "ВНИМАНИЕ: порт $PREVIEW_PORT не слушается — pm2 logs $PREVIEW_APP"
fi
echo "Порт закрыт извне? sudo ufw status; при активном ufw: sudo ufw allow $PREVIEW_PORT/tcp"
