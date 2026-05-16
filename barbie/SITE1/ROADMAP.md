# NAS · Network Administration System — Stack, Roadmap, Features

**Last updated:** 2026-05-16
**Workspace:** `F:\Users\a\Documents\_DEV\Tran\ES\barbie\SITE1\`
**Codename in repo:** `barbie/SITE1/` · package prefix `@barbie-site1/*` · Docker project `barbie-site1-dev` · DB `barbie_site1`
**Brand:** **NAS — Network Administration System**

Один документ для быстрого обзора: что это, на чём, что готово, что дальше. Детали — в `docs/ARCHITECTURE.md`, `docs/DB-SCHEMA.md`, `docs/ROLES-RBAC.md`, `docs/CMS-INTEGRATION.md`, `docs/MENU-EDITOR.md`. Конституция — `../ENTITY.md`.

---

## 1. Что это

Мультитенантная SaaS-CRM для сетей бизнесов. Стартовая вертикаль — **сети спа-салонов**. Один деплой обслуживает множество независимых тенантов (юр.лиц / франшиз).

Каждый тенант получает:
- Изолированный CRM (расписание, клиенты, мастера, услуги).
- Публичный сайт (`{slug}.crm.example.com` или custom domain).
- CMS для лендинга и второстепенных страниц.
- Редактор главного меню (один из трёх темплейтов).
- Изолированное файловое хранилище (MinIO/S3 с tenant-префиксом ключей).
- Design tokens на тенанта (цвета, шрифты, лого).

Платформа администрируется суперюзером (`platform-admin`), кросс-тенантно управляющим подписками, тенантами и саппортом.

**Что НЕ строим:** эскорт-функционал (escrow / dispute / age-gate / TON), Telegram-only identity, self-service tenant registration в Phase 0, shared CMS-content между тенантами.

---

## 2. Архитектура — кратко

- **Multi-tenant first-class.** Каждая бизнес-таблица имеет `tenant_id NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`. Composite индексы всегда начинаются с `tenant_id`.
- **Резолвинг тенанта:** subdomain (prod) → custom domain → header override (dev/CI) — в `TenantResolverMiddleware`.
- **Контекст запроса:** `AsyncLocalStorage` через `TenantContext`. Никаких `request-scoped` providers и параметров `tenantId` в каждом методе.
- **Изоляция данных — 4 слоя (defence in depth):**
  1. `TenantGuard` (декларативный, после `JwtAuthGuard`).
  2. `withTenant()` Drizzle-helper в каждом запросе к tenant-scoped таблице.
  3. DB constraint: `tenant_id NOT NULL` + cascade delete.
  4. Postgres RLS — opt-in в Phase 2.
- **Audit log** — обязателен для tenant-mismatch attempts и cross-tenant операций platform-admin'а.

Полная архитектура: `docs/ARCHITECTURE.md` (570+ строк, §1–§13).

---

## 3. Стек

### 3.1 Backend (`apps/api/`)

| Слой | Технология | Версия |
|------|------------|--------|
| Runtime | Node | ≥22 |
| Framework | NestJS | 10.4.x |
| HTTP platform | Express (через `@nestjs/platform-express`) | 5.x |
| ORM | Drizzle ORM | 0.36.x |
| DB driver | `postgres` | 3.4.x |
| Auth | `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt` | 11.x / 11.x / 4.x |
| Hashing | bcrypt | 5.1.x (cost 12) |
| Validation | `class-validator` + `class-transformer`, `zod` + `nestjs-zod` | 0.14 / 0.5 / 3.24 |
| Storage SDK | `@aws-sdk/client-s3` + presigner | 3.10x |
| API docs | `@nestjs/swagger` | 8.1.x |
| Throttling | `@nestjs/throttler` | 6.5.x (120 req/min на IP) |
| Security | `helmet` | 8.1.x |

### 3.2 Frontend (`apps/web/`)

| Слой | Технология | Версия |
|------|------------|--------|
| Framework | Next.js (App Router) | 15.1.x |
| UI lib | React | 19.0.x |
| Styling | Tailwind CSS | 3.4.x |
| Icons | lucide-react | 0.577.x |
| Helpers | clsx, zod | — |

**NB:** `apps/web/src/` сейчас содержит только `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (skeleton). Полноценный UI пока живёт в standalone `SITE1/dashboard-2077.html`, который запитан на реальный API (см. коммит `125956d`).

### 3.3 Data layer (`packages/db/`)

| Слой | Технология |
|------|------------|
| DB | PostgreSQL 16 (alpine) |
| Migrations | Drizzle Kit |
| Schema | 17 таблиц в Phase 0 (см. `docs/DB-SCHEMA.md`) |
| ID | UUID v7 (time-ordered) |
| Money | `bigint` (копейки), имя поля `*_kopecks` — **никогда** `number/float` |
| Enums | `varchar(N)` + `$type<>()` + CHECK constraint (не `pgEnum`) |
| Timestamps | UTC, Postgres session `SET TIME ZONE 'UTC'` |
| Tenant scoping | `tenant_id` в каждой бизнес-таблице; composite индексы начинаются с него |

### 3.4 Инфраструктура (dev — `docker-compose.dev.yml`)

| Сервис | Образ | Порт хоста | Назначение |
|--------|-------|------------|------------|
| `postgres` | `postgres:16-alpine` | 5442 → 5432 | DB `barbie_site1` |
| `redis` | `redis:7-alpine` | 6389 → 6379 | Cache / queues (Phase 1) |
| `minio` | `minio/minio:latest` | 9011 (S3), 9012 (UI) | S3-compatible storage, bucket `barbie-media` |
| `minio-init` | `minio/minio:latest` | — | Auto-create bucket + CORS |
| `mailhog` | `mailhog/mailhog` | 8035 (SMTP), 8025 (UI) | Catch dev emails |

Порты разведены с parent ES (см. `barbie/ENTITY.md §5`), чтобы можно было поднимать оба контура одновременно.

### 3.5 Monorepo

| Tool | Версия |
|------|--------|
| npm workspaces | npm ≥10.9 |
| Turbo | 2.3.x |
| TypeScript | 5.7.x |
| Concurrently (dev launcher) | 9.x |

---

## 4. Порты и URL (dev)

| Что | URL |
|-----|-----|
| API | http://localhost:3010 |
| Swagger | http://localhost:3010/api/docs |
| Web | http://localhost:3011 |
| MinIO API | http://localhost:9011 |
| MinIO Console | http://localhost:9012 |
| Mailhog UI | http://localhost:8025 |
| Postgres | `localhost:5442` (db `barbie_site1`, user `postgres`) |
| Drizzle Studio | http://localhost:4983 (`npm run db:studio`) |

**Tenant-резолвинг в dev:** `{slug}.lvh.me:3011` (lvh.me резолвится на 127.0.0.1) или fallback header `X-Tenant-Slug: {slug}`.

---

## 5. Роли (RBAC)

| Роль | Scope | Storage |
|------|-------|---------|
| `platform-admin` | Cross-tenant | `platform_admins` |
| `tenant-admin` | Один тенант (все салоны) | `tenant_users` |
| `salon-manager` | Один салон | `tenant_users` + `salon_id` |
| `master` | Свои записи | `tenant_users` + `salon_id` |
| `client` | Свой профиль | `tenant_users` |

Один email может иметь membership в разных тенантах с разными ролями. Внутри одного тенанта — одна активная роль (`(tenant_id, user_id)` UNIQUE). Полная матрица — `docs/ROLES-RBAC.md`.

---

## 6. Фазы продукта

### Phase 0 — MVP (текущая)

In scope:
- Multi-tenant runtime: subdomain middleware, ALS-based tenant context, 4-слойная изоляция.
- RBAC: 5 ролей.
- Auth: email + bcrypt + JWT (15 мин) + refresh (30 дней), postgres-backed sessions.
- CRUD: `tenants`, `salons`, `staff`, `services`, `clients`, `appointments`.
- Appointments: overlap-protection, идемпотентность создания, status FSM.
- Media: presigned uploads → MinIO, tenant-prefixed S3 keys.
- CMS pages: tenant-aware (`(tenant_id, slug, locale)` unique), draft/published, preview.
- Menu editor: 3 темплейта (`top-classic`, `mega-images`, `vertical-side`), иерархические пункты.
- Design tokens на тенанта.
- Audit log (tenant + platform).

### Phase 1 — после MVP

- **Subscriptions** (тенант → платформа): `subscription_plans` (Starter / Pro / Enterprise), Stripe + CloudPayments, lifecycle `pending → active → past_due → cancelled`.
- **Client payments** (клиент → салон): YooKassa / Stripe Connect / Тинькофф, привязка к `appointment_id`, частичный refund, idempotency через `provider_id` UNIQUE.
- OAuth (Google, Yandex) поверх JWT.
- Email-уведомления о записях (SMTP / sendgrid в prod).
- Расширенная отчётность.
- Линтер-правило: запрет `.from(tenantScopedTable)` без `withTenant()` в том же statement.

### Phase 2+ — позже / опционально

- Postgres Row-Level Security (4-й слой defence in depth).
- 2FA (TOTP) для tenant-admin и platform-admin.
- Custom domains через автоматический cert-manager (Let's Encrypt + ACME).
- Multi-region deploys.
- Marketplace интеграций.
- Bucket-per-tenant в S3 (если регуляторика потребует).

**Явные неголы (всегда):** эскорт-домен, Telegram-only identity, self-service tenant registration без модерации, shared CMS-content.

---

## 7. Status — что сделано

Готовы коммиты Stages 1–15 (см. `git log --oneline -- .` в `SITE1/`):

| Stage | Что | Коммит |
|-------|-----|--------|
| L1+L2 foundation | Архитектура, DB-схема, RBAC, CMS port plan, menu templates | `5cd0d31` |
| Stage 1 | Workspace foundation (turbo, workspaces, tsconfig.base) | `823f077` |
| Stage 2 | `packages/db` skeleton | `876d13c` |
| Stage 3 | Drizzle schema Phase 0 (17 таблиц) | `ba11574` |
| Stage 4 | `apps/api` NestJS skeleton | `f96ac0e` |
| Stage 5 | `apps/web` Next.js skeleton | `e1d72f5` |
| Stage 6 | `TenantContext` (ALS, middleware, guard, helper) | `ad6ee2c` |
| Stage 7 | Auth (JWT, login, global guard) | `d1d0376` |
| Stage 8 | `TenantsModule` CRUD + `RolesGuard` | `ed83f7e` |
| Stages 9–12 | Tenant-scoped CRUDs (Salons / Services / Staff / Clients) | `bed26bd` |
| Stage 13 | `AppointmentsModule` (overlap, idempotency, FSM) | `afa602f` |
| Stage 14 | `MediaModule` (S3 uploads to MinIO) | `f02a128` |
| Stage 15 | `CmsModule` (smoke-verified) | `96cc7e1` |

Параллельно:
- `seed:admin` скрипт — создаёт platform-admin + 10 demo-тенантов из dashboard. Запуск: `npm run seed:admin`.
- `dashboard-2077.html` подключён к реальному API (Option A) — временный фронт для NAS до полноценной Next.js-страницы.
- Brand pass — папка `SITE1/` именуется NAS в UI; технические идентификаторы (`barbie-site1`) остались.

---

## 8. Что остаётся в Phase 0

| Задача | Где |
|--------|-----|
| **`MenuModule`** | `apps/api/src/menu/` — единственный незакрытый Phase-0 модуль. Темплейты готовы (`menu-templates/*.html`), спека в `docs/MENU-EDITOR.md`. В `app.module.ts:62` стоит `// MenuModule — далее`. |
| **Web App Router UI** | `apps/web/src/app/` — сейчас skeleton. Нужно перенести функциональность из `dashboard-2077.html` в реальный Next.js: layout, login, tenants list, salon/service/staff/client/appointment CRUD, CMS-редактор, media-uploader. |
| **VPS deploy** | `docs/DEPLOY_SERVER.md` (отсутствует) — Nginx vhost для `*.crm.example.com`, PM2 apps `barbie-site1-api` / `barbie-site1-web`, отдельная БД, `npm run vps:after-pull` по образцу ES. |
| **Tenant slug subdomain в dev** | Проверить, что `lvh.me` корректно работает с CORS + cookies между `{slug}.lvh.me:3011` и `localhost:3010`. |

---

## 9. Локальный старт

```bat
:: Один раз — Docker Desktop запущен, Node ≥22 установлен.
cd F:\Users\a\Documents\_DEV\Tran\ES\barbie\SITE1
start-dev.bat
```

Что делает `start-dev.bat`:
1. Создаёт `.env` из `.env.example`, если отсутствует.
2. Проверяет, что Docker Engine запущен.
3. Поднимает compose-стек (`postgres`, `redis`, `minio`, `minio-init`, `mailhog`).
4. Ждёт healthcheck Postgres.
5. `npm install` (только при первом запуске — если нет `node_modules`).
6. Применяет миграции (`npm run db:migrate`, идемпотентно).
7. Печатает URL'ы и запускает `npm run dev:apps` в foreground.

Остановить: `Ctrl+C` останавливает api+web, docker-стек остаётся жить. Полный стоп — `stop-dev.bat` (без потери данных). Снести данные — `docker compose -f docker-compose.dev.yml down -v`.

**Первый запуск после `start-dev.bat`:**
```bat
npm run seed:admin
```
Создаст `platform-admin` (email/пароль из `.env`, по умолчанию `admin@barbie-site1.local` / `Admin123!ChangeMe`) и 10 demo-тенантов.

---

## 10. Команды

| Команда | Что делает |
|---------|------------|
| `npm run dev:apps` | api + web concurrently (foreground) |
| `npm run dev` | то же через turbo |
| `npm run build` | turbo build |
| `npm run db:generate` | сгенерировать миграцию из изменений в схеме |
| `npm run db:migrate` | применить миграции |
| `npm run db:push` | drizzle-kit push (только в dev) |
| `npm run db:studio` | GUI для Drizzle на http://localhost:4983 |
| `npm run db:bootstrap` | `db:migrate` + `seed:admin` |
| `npm run seed:admin` | создать platform-admin + 10 demo-тенантов |
| `npm run lint` | ESLint по всему монорепо |
| `npm run test` | jest (`apps/api`) |
| `npm run clean` | `rimraf node_modules` и turbo cache |

---

## 11. Карта документов

| Документ | О чём |
|----------|-------|
| `ROADMAP.md` (этот файл) | Стек + фазы + статус + быстрый старт |
| `README.md` | Кратко: что, как поднять |
| `../ENTITY.md` | Конституция Barbie workspace |
| `docs/ARCHITECTURE.md` | Multi-tenant архитектура, ALS, изоляция, auth, S3, CMS, money |
| `docs/DB-SCHEMA.md` | Drizzle-спека всех 17 таблиц Phase 0 |
| `docs/ROLES-RBAC.md` | Роли, permission-матрица, гарды |
| `docs/CMS-INTEGRATION.md` | План порта CMS из ES |
| `docs/MENU-EDITOR.md` | Главное меню — 3 темплейта и редактор |
| `dashboard-2077.html` | Standalone CRM-UI, запитан на реальный API |
| `menu-templates/` | HTML-темплейты главного меню (top-classic / mega-images / vertical-side) |

---

## 12. Знай это про деньги, тенанты и пароли

- **Деньги — только `bigint` копеек.** Никаких `number/float`. JSON-сериализация — строка.
- **Tenant isolation — defence in depth.** Любой новый read-эндпоинт должен иметь тест на изоляцию.
- **`POSTGRES_PASSWORD` в compose == пароль в `DATABASE_URL`.** Том создаётся при первой инициализации; смена `.env` после уже создаёт `28P01`. Recovery — `ALTER USER` или recreate volume (потеря данных).
- **Никогда `docker compose down -v` на проде.**
- **`pm2 restart` сохраняет старый `process.env`** — после смены `.env` на VPS нужен `pm2 startOrReload`. Регламент: `npm run vps:after-pull` (когда `docs/DEPLOY_SERVER.md` будет создан).
