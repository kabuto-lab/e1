# NAS · Network Administration System

**Multi-tenant CRM platform.** Tenants — сети бизнесов (стартовая вертикаль: спа-салоны).

NestJS 10 + Drizzle ORM + PostgreSQL + Next.js 15 + MinIO/S3 + Redis.

> **Кодовые имена внутри репо:** папка `barbie/SITE1/`, пакеты `@barbie-site1/*`, Docker-проект `barbie-site1-dev`, БД `barbie_site1` — технические идентификаторы из bootstrap-фазы. Бренд продукта — **NAS**.

Унаследовано из parent ES (`F:\Users\a\Documents\_DEV\Tran\ES\`), без эскорт-домена.
Конституция: [`../ENTITY.md`](../ENTITY.md). Архитектура: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Quick start

Требования: Node 22+, Docker Desktop, npm 10+.

```bash
# 1. Установка зависимостей
cd barbie/SITE1
cp .env.example .env       # отредактируй пароли/секреты
npm install

# 2. Поднять инфру (Postgres, Redis, MinIO, Mailhog)
docker compose -f docker-compose.dev.yml up -d

# 3. Применить миграции БД (после Stage 2-3 bootstrap'а)
npm run db:migrate

# 4. Старт API + Web в dev-режиме
npm run dev:apps
```

URL по дефолту:
- API: <http://localhost:3010>
- Web: <http://localhost:3011>
- Swagger: <http://localhost:3010/api/docs>
- Postgres: `localhost:5442` (внутри контейнера `5432`)
- MinIO API: <http://localhost:9011>, Console: <http://localhost:9012>
- Mailhog Web UI: <http://localhost:8025> (SMTP `localhost:8035`)

## Структура

```
SITE1/
├── apps/
│   ├── api/        # NestJS — HTTP API, бизнес-логика, JWT, Drizzle
│   └── web/        # Next.js 15 — UI (CRM + публичные сайты тенантов)
├── packages/
│   └── db/         # Drizzle schema + миграции + connection
├── docs/           # ARCHITECTURE / DB-SCHEMA / ROLES-RBAC / CMS / MENU
├── data/           # seeds, tenants-real-content.json
├── menu-templates/ # 3 HTML-темплейта главного меню (top-classic / mega-images / vertical-side)
├── docker-compose.dev.yml
├── .env.example
└── turbo.json
```

## Мультитенантность

- Резолвинг: subdomain (`{slug}.lvh.me` в dev), fallback header `X-Tenant-Slug`
- Изоляция: 4 слоя (TenantGuard → withTenant Drizzle helper → `tenant_id NOT NULL` → audit log)
- См. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) и [`docs/ROLES-RBAC.md`](./docs/ROLES-RBAC.md).

## Полезные команды

```bash
npm run dev              # turbo dev (все воркспейсы)
npm run build            # turbo build
npm run db:generate      # сгенерировать миграцию из схемы
npm run db:migrate       # применить миграции
npm run db:studio        # GUI для Drizzle (http://localhost:4983)
npm run lint
npm run test
```

## Связанные документы

- [`../ENTITY.md`](../ENTITY.md) — конституция Barbie
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — multi-tenant архитектура
- [`docs/DB-SCHEMA.md`](./docs/DB-SCHEMA.md) — Drizzle схема (21 таблица)
- [`docs/ROLES-RBAC.md`](./docs/ROLES-RBAC.md) — роли и матрица доступа
- [`docs/CMS-INTEGRATION.md`](./docs/CMS-INTEGRATION.md) — план порта CMS из ES
- [`docs/MENU-EDITOR.md`](./docs/MENU-EDITOR.md) — главное меню (3 темплейта + редактор)
- [`../../SESSION_LOG.md`](../../SESSION_LOG.md) — лог сессий разработки
