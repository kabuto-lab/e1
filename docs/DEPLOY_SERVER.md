# Деплой на VPS (API + Next.js)

Предполагается Linux, Node.js **22+**, PostgreSQL и (опционально) Nginx.

## 1. Клон и зависимости

```bash
git clone https://github.com/kabuto-lab/e1.git
cd e1
npm ci
```

## 2. Переменные окружения

Скопируйте `.env.example` → `.env` в **корне репозитория** (рядом с `package.json`). Заполните как минимум:

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | PostgreSQL |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | как в примере |
| `ALLOWED_ORIGINS` | `https://ваш-домен.ru` (и при необходимости `www`) |
| `FRONTEND_URL` | публичный URL сайта |
| **Почта формы** | см. `.env.example`: для реальной доставки — **Gmail SMTP** (не Mailhog) |

Для **продакшена** на сервере **не** используйте `SMTP_HOST=127.0.0.1:1025` (Mailhog) — письма никуда не уйдут. Нужны `smtp.gmail.com`, `SMTP_USER`, `SMTP_PASS` (пароль приложения Google).

## 3. Сборка

```bash
npm run build
```

Собираются workspace’ы через Turbo (`apps/api`, `apps/web`, …).

## 4. Запуск API

После `npm run build` из корня (или `npm run build --workspace=@escort/api`):

```bash
npm run start:prod --workspace=@escort/api
```

Скрипт запускает `node dist/apps/api/src/main.js`. Порт по умолчанию **3000** (`PORT` в `.env`).

## 5. Запуск фронта (Next)

Перед **первой** сборкой веба задайте публичный URL API, если браузер ходит на API **напрямую** (CORS):

```bash
export NEXT_PUBLIC_API_URL=https://api.ваш-домен.ru
npm run build --workspace=@escort/web
npm run start --workspace=@escort/web
```

`next start` слушает **3001** (см. `apps/web/package.json`). Для внутреннего прокси Nginx переменная может не понадобиться.

Если Next и API за одним доменом через Nginx (`/api` → бэкенд), можно настроить прокси в Nginx и не задавать `NEXT_PUBLIC_API_URL` — тогда фронт использует относительные `/api` (нужны соответствующие `rewrites`/прокси на хостинге).

## 6. Nginx (пример)

- `location /` → прокси на `127.0.0.1:3001`
- `location /api/` → прокси на `127.0.0.1:3000` с нужным `proxy_pass` (путь `/api` на Nest зависит от того, есть ли глобальный префикс в Nest — проверьте `main.ts`)

Включите HTTPS (Let’s Encrypt).

## 7. Процесс-менеджер

Используйте **systemd**, **PM2** или Docker: два долгоживущих процесса (API + `next start`), автозапуск при перезагрузке.

### PM2 (рекомендуется для этого репозитория)

В корне лежит `ecosystem.config.cjs`: при каждом **`startOrReload`** заново читается `.env` и подставляется в процесс API.

- Первый запуск API: `pm2 start ecosystem.config.cjs --only escort-api && pm2 save`
- **После `git pull` или правки `.env`:** не делайте `pm2 restart escort-api` — в процессе останется старый `DATABASE_URL`. Выполните:
  - `npm run vps:after-pull`  
  или вручную: `npm ci`, `npm run build`, `npm run check:postgres-env`, `npm run ensure:database`, `npm run pm2:reload-api`
- **`POSTGRES_PASSWORD`** в корневом `.env` должен совпадать с паролем в **`DATABASE_URL`** (и с тем, что подставляет `docker-compose.dev.yml` в Postgres при **первом** создании тома). Иначе при новом томе или рассинхроне источников снова будет 28P01. Не используйте **`docker compose down -v`** там, где нужны данные БД.
- `ensure:database` при ошибке пароля и запущенном контейнере `escort-postgres` сам вызовет `db:align-password`. Иначе — ручной `ALTER USER` или `npm run db:align-password` (см. `.env.example`).

Перед стартом API скрипт `scripts/start-api-prod.mjs` вызывает `ensure-database-url.mjs`: при неверном пароле процесс не поднимется (вместо «тихого» 503 в каталоге).

## 8. Обновление

```bash
git pull
npm run vps:after-pull
```

Вручную:

```bash
git pull
npm ci
npm run build
npm run check:postgres-env
npm run ensure:database
npm run pm2:reload-api
# отдельно перезапустите next (если не в PM2): npm run start --workspace=@escort/web
```

## 9. Предпросмотр ветки на VPS (по IP, рядом с основным деплоем)

Основной сайт продолжает работать с `main`: ветка поднимается отдельно — свой `git worktree`
и своё PM2-приложение на своём порту, без домена и сертификата.

```bash
# на VPS из ~/e1: скрипт берётся прямо из ветки, ~/e1 не переключается
cd ~/e1
git fetch origin redesign/homepage
git show FETCH_HEAD:scripts/vps-preview.sh | bash
```

Что делает `scripts/vps-preview.sh`: `git fetch` → `git worktree add ~/e1-preview` → симлинк
`.env` на основной → `npm ci` → `next build` только для `@escort/web` → `pm2 startOrReload
ecosystem.preview.config.cjs` (приложение `escort-web-preview`, порт **3002**). Открывать
`http://<IP-VPS>:3002/`; если порт закрыт снаружи — `sudo ufw allow 3002/tcp`.

- **Имя файла конфига принципиально:** PM2 распознаёт конфиг только по расширениям
  `.config.js`, `.config.cjs`, `.config.mjs`, `.json`, `.yaml` (`lib/Common.js`,
  `knonwConfigFileExtensions`, проверка через `indexOf`). Файл с другим именем (например
  `ecosystem.preview.cjs`) PM2 считает обычным скриптом: запускает его как код, берёт имя
  приложения из имени файла и игнорирует `--only`. На сервере с чужими проектами это кончается
  либо процессом-призраком, либо отказом `Script already launched, add -f option to force
  re-execution` — а `-f` рискован, он перезаписывает приложение с тем же путём и именем.
- **Порт может быть занят другим проектом этого VPS** — скрипт проверяет это перед сборкой и
  падает с подсказкой: `PREVIEW_PORT=3021 bash scripts/vps-preview.sh`.
- Быстрый перезапуск без пересборки: `PREVIEW_SKIP_INSTALL=1 PREVIEW_SKIP_BUILD=1 bash scripts/vps-preview.sh`.
- **API не дублируется**: предпросмотр проксирует `/api` на локальный Nest основного деплоя
  (`NEXT_PUBLIC_API_URL` пустой, `API_PROXY_UPSTREAM=http://127.0.0.1:3000`). Второй инстанс API
  поднимать нельзя — конфликт по Telegram-боту и TON-индексатору. Из-за этого изменения API из
  ветки в предпросмотре не видны (например, тема письма формы поддержки).
- Обновление после новых коммитов: `bash ~/e1-preview/scripts/vps-preview.sh` (или `npm run vps:preview` там же).
- Удаление: `bash ~/e1-preview/scripts/vps-preview.sh --down` — снимает PM2-приложение и worktree, `~/e1` не тронут.
- Переопределения: `PREVIEW_PORT=3003 PREVIEW_DIR=~/e1-preview-2 bash scripts/vps-preview.sh`.
- Куки сессии у `http://<IP>:3002` и у прода на том же хосте общие (куки не различают порт) — вход
  в предпросмотре перезапишет сессию этого хоста в браузере.
