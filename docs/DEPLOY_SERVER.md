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

## 8. Обновление

```bash
git pull
npm ci
npm run build
# перезапустить оба процесса
```
