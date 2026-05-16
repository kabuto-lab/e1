# Barbie / SITE1 — Multi-Tenant Architecture

**Status:** Level 1 strategic plan + Level 2 architectural design
**Last updated:** 2026-05-16
**Owner:** AVTONOM session (architecture stream)
**Companion docs:** `DB-SCHEMA.md`, `ROLES-RBAC.md`, `CMS-INTEGRATION.md` (TBD), `MENU-EDITOR.md` (TBD, agent D)

---

## 1. Цели и неголы

### 1.1 Цели

Barbie/SITE1 — мультитенантная SaaS-платформа для сети спа-салонов. Один деплой обслуживает множество независимых тенантов (юр.лиц / франшиз). Каждый тенант получает:

- Изолированный CRM (расписание, клиенты, мастера, услуги, отчёты)
- Публичный сайт (`{slug}.crm.example.com` или custom domain)
- CMS для лендинга и второстепенных страниц
- Редактор главного меню (один из трёх темплейтов навигации)
- Изолированное файловое хранилище (MinIO/S3)

Платформа администрируется суперюзером (platform-admin), который кросс-тенантно управляет подписками, тенантами и саппортом.

### 1.2 Phase 0 (MVP, текущая фаза)

In scope:
- Multi-tenant runtime: subdomain-resolving middleware, ALS-based tenant context
- RBAC: 5 ролей с матрицей доступа
- Базовый CRUD: tenants, salons, staff, services, clients, appointments
- Auth: JWT + refresh, postgres-backed sessions
- CMS pages (tenant-aware), media (tenant-prefixed S3 keys)
- Menu editor: 3 темплейта, иерархические пункты, превью
- Design tokens на тенанта (цвета, шрифты, лого, навигация)
- Audit log (tenant + platform)

### 1.3 Phase 1 (после MVP)

In scope:
- Subscriptions (тенант → платформа): plans, invoices, провайдеры
- Client payments (клиент → салон): online-оплата записи
- OAuth (Google, Yandex) поверх JWT
- Email-уведомления о записях
- Расширенная отчётность

### 1.4 Phase 2+ (позже / опционально)

- Postgres Row-Level Security (RLS) как 4-й слой defence in depth
- Telegram bot (опц., не обязательно — это не эскорт-вертикаль)
- Custom domains через автоматический cert-manager
- Multi-region deploys
- Marketplace интеграций (Wildberries-like)

### 1.5 Неголы (явные)

- НЕ строим эскорт-функционал (escrow, dispute, model verification, age-gate)
- НЕ строим Telegram-only identity (как в ES) — клиент логинится через email/phone, OAuth — позже
- НЕ строим shared CMS-content между тенантами; каждый тенант редактирует только свои страницы
- НЕ строим self-service tenant registration в Phase 0 (тенанты создаются platform-admin вручную)
- НЕ строим RLS в Phase 0 (application-level isolation + constraint, см. §4)

---

## 2. Резолвинг тенанта

### 2.1 Стратегии

| # | Стратегия | Когда применяется | Источник |
|---|-----------|-------------------|----------|
| 1 | Subdomain | Production default | `Host: {slug}.crm.example.com` |
| 2 | Custom domain | Tenant с премиум-планом | `Host: salon-name.com` + lookup в `tenant_domains` |
| 3 | Header override | Dev / CI / debugging | `X-Tenant-Domain: slug` (только если `NODE_ENV !== 'production'` или у запроса platform-admin JWT) |
| 4 | Path prefix | НЕ используется | (отвергнуто — портит SEO и редиректы) |

### 2.2 Middleware

`TenantResolverMiddleware` подключается глобально в `AppModule` после `helmet` / `cors` и **до** `JwtAuthGuard`.

Алгоритм:

```
TenantResolverMiddleware(req):
  if req.path startswith /platform/admin → skip (handled by PlatformGuard)
  if req.path startswith /health           → skip
  if req.path startswith /webhooks/        → resolve from payload (provider-specific)

  domain = extractDomain(req)              // priority: header (dev) → host
  tenant = tenantRegistry.findByDomain(domain)
  if !tenant → 404 TenantNotFound

  if tenant.status !== 'active' → 503 TenantSuspended

  tenantContext.run({ tenantId: tenant.id, slug: tenant.slug }, () => next())
```

### 2.3 Диаграмма потока запроса

```
[Browser]
   │  GET https://salon-alpha.crm.example.com/api/services
   ▼
[nginx vhost *.crm.example.com]
   │  proxy_pass http://localhost:3001
   ▼
[Nest HTTP]
   │
   ├─→ TenantResolverMiddleware (resolves "salon-alpha" → tenantId)
   │     └─ Stores in ALS via TenantContext.run()
   │
   ├─→ JwtAuthGuard (validates JWT, attaches user)
   │
   ├─→ TenantGuard (asserts user.tenantId === ALS.tenantId, or user is platform-admin)
   │
   └─→ ServicesController.list()
         └─ ServicesService.list()
               └─ db.select().from(services).where(withTenant(eq(services.deleted, false)))
                  // withTenant() injects: AND tenant_id = $current
```

### 2.4 Tenant registry caching

In-memory LRU кэш domain→tenant (TTL 60s) внутри Nest. Инвалидация по событию `tenant.updated` через Postgres NOTIFY/LISTEN (Phase 1) или TTL-only (Phase 0).

---

## 3. Tenant context propagation

### 3.1 Решение: AsyncLocalStorage

Используем Node `AsyncLocalStorage` (ALS) для распространения tenant ID и slug в скоупе одного HTTP-запроса. Доступ — через инжектируемый сервис `TenantContext`.

```
TenantContext.getTenantId(): string  // throws if not set
TenantContext.tryGetTenantId(): string | null
TenantContext.getSlug(): string
TenantContext.run(ctx, fn): T        // обёртка для middleware
```

### 3.2 Альтернативы и почему отвергнуты

| Альтернатива | Минус |
|--------------|-------|
| Передавать `tenantId` параметром в каждый метод сервиса | Загрязняет сигнатуры, легко забыть, runtime-safety нулевая |
| `request-scoped` Nest provider | Создаёт инстанс сервиса на каждый запрос — оверхед + ломает singleton-кеши |
| Хранить в `req.tenantId` и таскать `req` глубоко | Тащит HTTP-объект в доменный слой |
| Postgres session var `SET app.tenant_id` | Требует pgbouncer transaction-mode tricks, RLS-coupling раньше времени |

**Выбран ALS:** zero-overhead, неинтрузивный, работает с async/await/Promise, нативная поддержка Node 16+.

### 3.3 Граничные случаи

- **Background jobs / cron:** explicitly `TenantContext.run({ tenantId }, async () => ...)` в обёртке job runner.
- **Webhooks (Stripe, провайдеры):** tenant резолвится из payload (subscription_id → tenant_id), middleware пропускает webhooks-маршруты.
- **Platform-admin endpoints (`/platform/admin/*`):** ALS НЕ устанавливается; запросы используют explicit `tenantId` параметр в URL/body, проверяемый `PlatformAdminGuard`.

---

## 4. Изоляция данных (defence in depth)

Четыре независимых слоя. Любой один — нарушим. Все вместе — практически непробиваемы без потери легитимного функционала.

### 4.1 Layer 1 — TenantGuard (декларативный)

Применяется через декоратор `@RequireTenant()` или глобально через `APP_GUARD`. Контракт:

- Извлекает `tenantId` из ALS
- Извлекает `user` из request (после `JwtAuthGuard`)
- Если `user.role === 'platform-admin'` и явный `@CrossTenant()` декоратор — пропускает
- Иначе проверяет `user.tenantId === ALS.tenantId`
- При несоответствии — `403 ForbiddenException` + `audit_log_platform` event `tenant_mismatch_attempt`

### 4.2 Layer 2 — Drizzle helper `withTenant()`

Каждый сервисный запрос на tenant-scoped таблицу обязан использовать helper:

```
// Pseudo-API
function withTenant<T extends SQLWrapper>(
  table: TenantScopedTable,
  extra?: SQL,
): SQL {
  const tid = TenantContext.getTenantId();
  return extra
    ? and(eq(table.tenantId, tid), extra)
    : eq(table.tenantId, tid);
}

// Usage
db.select().from(services).where(withTenant(services, eq(services.status, 'active')));
```

Линтер-правило (Phase 1): запрет `.from(tenantScopedTable)` без вызова `withTenant` в том же statement. Phase 0 — ручной code review.

### 4.3 Layer 3 — DB constraint

Все tenant-scoped таблицы имеют `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`. Composite индексы всегда начинаются с `tenant_id` (см. `DB-SCHEMA.md`).

Это не предотвращает чтение чужого тенанта, но:
- Запрещает создавать «orphan rows» без тенанта
- Делает каскадное удаление тенанта атомарным
- Заставляет любой `INSERT` явно указывать tenant_id (CI catches accidental skip)

### 4.4 Layer 4 — Postgres RLS (Phase 2, opt-in)

**AI-Default-8:** RLS не включаем в Phase 0. Причины:
- Усложняет миграции (нужны policies per table)
- Требует pgbouncer session-mode или `SET LOCAL` в каждой транзакции
- Application-level layers 1–3 достаточны для MVP, audit покроет 99% инцидентов
- При включении в Phase 2 — будет дополнительная страховка, не замена

Когда включим — каждая tenant-scoped table получит:
```
CREATE POLICY tenant_isolation ON {table}
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
```

### 4.5 Cross-tenant escape hatches

Легитимные cross-tenant операции (только для platform-admin):
- `/platform/admin/tenants` — список тенантов
- `/platform/admin/tenants/:id/impersonate` — войти от лица tenant-admin (audit)
- `/platform/admin/audit/all` — глобальный аудит
- `/platform/admin/billing/*` — подписки и инвойсы

Эти маршруты декорированы `@CrossTenant()` и проходят через `PlatformAdminGuard` вместо `TenantGuard`. ALS не устанавливается; tenant_id передаётся явно в URL.

---

## 5. RBAC роли

Полная матрица — см. `ROLES-RBAC.md`. Краткое описание:

| Роль | Scope | Назначение |
|------|-------|------------|
| `platform-admin` | Cross-tenant | Управление платформой, тенантами, подписками, саппорт |
| `tenant-admin` | Один тенант | Владелец сети салонов; полный CRUD внутри тенанта |
| `salon-manager` | Один салон (внутри тенанта) | Управление расписанием, мастерами, услугами своего салона |
| `master` | Свои записи | Видит свой график и клиентов своих записей |
| `client` | Свой профиль | Записывается на услуги, видит свою историю |

Роль хранится в:
- `platform_admins` (для platform-admin, без `tenant_id`)
- `tenant_users` (для всех остальных, с `tenant_id`)

Один email может принадлежать пользователю с разными ролями в разных тенантах (multi-membership). Связь — через `users.id` ⇄ `tenant_users.user_id`.

---

## 6. Авторизация

### 6.1 Аутентификация

- **Primary:** email + password (bcrypt cost 12), JWT (access 15 min) + refresh (30 дней)
- **Sessions:** в Postgres-таблице `sessions` (по образцу ES). Refresh-токен — SHA-256 hash + session record
- **OAuth (Phase 1):** Google + Yandex. Привязка opt-in через `/auth/oauth/link`
- **Telegram-link:** НЕ реализуем (не нужен для спа-вертикали)
- **2FA (Phase 2):** TOTP для tenant-admin и platform-admin

### 6.2 Поток JWT

```
POST /auth/login { email, password, tenantSlug? }
  → middleware resolves tenant (если slug в host или body)
  → AuthService.login(email, password, tenantId | null)
    → если tenant_users row есть → tenant scope JWT
    → если platform_admins row → platform scope JWT (без tenant_id в claims)
  → response: { accessToken, refreshToken (httpOnly cookie) }
```

### 6.3 JWT claims

```
{
  sub: user.id,                    // uuid
  email: user.email,
  scope: 'tenant' | 'platform',
  tenantId: uuid | null,           // null для platform-admin
  role: 'tenant-admin' | 'salon-manager' | 'master' | 'client' | 'platform-admin',
  salonId: uuid | null,            // только для salon-manager и master
  iat, exp,
  sid: session.id                  // для revocation
}
```

### 6.4 Revocation

Session record может быть revoked (`revoked_at = now()`). `JwtAuthGuard` проверяет `sessions` table на каждом запросе через короткий LRU-кеш (TTL 30s) — компромисс между instant revoke и performance.

---

## 7. Файловое хранилище

### 7.1 Stack

MinIO (dev/staging) / S3-compatible (prod). Доступ через `@aws-sdk/client-s3`.

### 7.2 Key naming convention

```
tenant/{tenantId}/{module}/{entityId}/{filename}

Examples:
tenant/01H8X.../logo/main/logo-v3.png
tenant/01H8X.../staff/01J9Y.../avatar.jpg
tenant/01H8X.../services/01K2Z.../cover.webp
tenant/01H8X.../cms/page-01M.../hero.jpg
tenant/01H8X.../menu/01N.../image-1.png
```

### 7.3 Bucket strategy

- **Phase 0:** один bucket `barbie-site1-prod` (и `barbie-site1-dev`), key-prefix-based изоляция
- **Phase 2:** bucket-per-tenant (если регуляторика требует) — миграция через S3 sync

### 7.4 Запреты

- НЕТ глобального префикса `shared/` или `public/` с контентом, видимым между тенантами
- НЕТ прямого доступа к S3 со стороны клиента БЕЗ presigned URL
- Presigned URL генерируется backend'ом ПОСЛЕ `TenantGuard` валидации

### 7.5 Upload flow

```
1. Client → POST /media/presign { mime, sizeHint, module, entityId }
2. Server (после TenantGuard):
   - validates mime/size against tenant plan limits
   - generates key = tenant/{tid}/{module}/{eid}/{uuid}.{ext}
   - returns presignedPutUrl (TTL 15 min)
3. Client → PUT to S3 directly (bypasses backend)
4. Client → POST /media/confirm { key, sha256 }
5. Server → inserts media row (tenant_id from ALS, key, mime, size, sha256)
```

### 7.6 Access control

- Public media (logo, CMS-page images): bucket policy allows public-read on `tenant/*/cms/*` and `tenant/*/menu/*` and `tenant/*/logo/*`
- Private media (staff avatars в админке, internal docs): presigned GET URL с TTL 5 min

---

## 8. CMS интеграция

Полная спецификация — `CMS-INTEGRATION.md` (отдельный документ, агент CMS). Кратко:

- `cms_pages` table — tenant-aware: `(tenant_id, slug, locale)` unique
- Drag-and-drop block editor (как в ES), но темы тенанта применяются автоматически через CSS-переменные из `tenant_design_tokens`
- Preview-режим: `?preview={signedToken}` показывает draft вне зависимости от status
- Publish: ставит `status='published'` + `published_at = now()`
- Public render: `GET https://{slug}.crm.example.com/{page-slug}` → SSR с tenant-локальными tokens

Никакого глобального CMS: один тенант не видит и не наследует страницы другого.

---

## 9. Меню (главная навигация сайта тенанта)

Полная спецификация — `MENU-EDITOR.md` (агент D). Кратко:

### 9.1 Темплейты

Тенант выбирает один из трёх:

| Темплейт | Описание | Когда подходит |
|----------|----------|----------------|
| `top-classic` | Горизонтальная навигация в шапке, текст-only, 1 уровень | Минимализм, small networks (1–2 салона) |
| `mega-images` | Горизонтальная навигация + dropdown с большими картинками услуг | Premium-салоны, визуальная подача |
| `vertical-side` | Боковая навигация (sidebar), иконки + текст, 2 уровня вложенности | Большие сети с категориями (по городам / филиалам) |

Поле `tenant_design_tokens.nav_template` хранит выбор. UI меняется без редеплоя.

### 9.2 Меню-айтемы

Хранятся в `tenant_menu_items` (см. `DB-SCHEMA.md`). Иерархия — через `parent_id`. Поля:
- `label`, `href` (внешний URL или внутренний slug)
- `image_key` (для mega-images: картинка на dropdown)
- `icon` (для vertical-side: имя из lucide-react)
- `sort_order`, `locale`
- `payload jsonb` — template-specific overrides

### 9.3 Применение

Изменения в CRM → сохранение в БД → следующий SSR-рендер публичного сайта подтянет новое меню. Кэш CDN инвалидируется через cache-tag `tenant:{tid}:menu`.

---

## 10. Подписки и платежи (Phase 1)

### 10.1 Два разных домена денег

Критически важно НЕ путать:

| Домен | Модуль | Кто платит | Кому | Таблица |
|-------|--------|------------|------|---------|
| **Subscriptions** | `subscriptions/` | Тенант | Платформе | `subscription_invoices` |
| **Payments** | `payments/` | Клиент салона | Салону (тенанту) | `client_payments` |

### 10.2 Subscriptions (тенант ↔ платформа)

- Планы: `subscription_plans` (Starter / Pro / Enterprise) — глобальные, не tenant-scoped
- `subscriptions.tenant_id` → `subscription_plans.id`
- Биллинг-провайдеры: Stripe (международка) / CloudPayments (РФ) — Phase 1
- Жизненный цикл: `pending → active → past_due → cancelled` (state machine в `SubscriptionsService`)
- При `cancelled` тенант переводится в read-only через `tenants.status = 'suspended'`

### 10.3 Client payments (клиент ↔ тенант)

- `client_payments.tenant_id` → запись принадлежит конкретному салону
- Привязка к `appointment_id` (nullable: возможна предоплата без записи)
- Провайдеры: настраиваются tenant-admin'ом (Stripe Connect / YooKassa / тинькофф)
- Refund: частичный (`refunded_kopecks`), полный
- Idempotency: `provider_id` UNIQUE — защита от двойной обработки webhook'а

### 10.4 Money value object

```
class Money {
  amount: bigint;   // в копейках (минимальной единице валюты)
  currency: 'RUB' | 'USD' | 'EUR';

  static fromKopecks(n: bigint, c: Currency): Money;
  add(other: Money): Money;       // assert same currency
  subtract(other: Money): Money;
  format(locale: string): string; // "1 234,56 ₽"
}
```

Никогда не используем `number`/`float` для денег. БД — `bigint`. Сериализация в JSON — строка (`"123456"`), не number, для совместимости с JS BigInt deserialization.

---

## 11. Аудит и наблюдаемость

### 11.1 Audit log: две таблицы

Разделение по scope:

- `audit_log_tenant` — действия внутри тенанта (запись создана, услуга обновлена). Поля: `tenant_id NOT NULL`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `payload_diff jsonb`, `ip`, `user_agent`, `created_at`.
- `audit_log_platform` — действия platform-admin (создание тенанта, импersonate, suspend). Поля: `actor_user_id`, `action`, `payload_diff`, `created_at`. БЕЗ `tenant_id` (или nullable, если действие касается тенанта).

### 11.2 Что логируем (минимум, Phase 0)

- Авторизация: login success/fail, logout, password change, OAuth link
- Tenants: create, suspend, resume, plan change (platform)
- RBAC: tenant_users role change, permission grant/revoke
- Domain ops: appointment status change, payment status change
- Cross-tenant: impersonation start/end, tenant_mismatch_attempt

### 11.3 Что НЕ логируем

- PII в payload (email, phone) — заменяем хешами или маскировкой
- Password hashes
- Полные JWT-токены (только `sid`, последние 8 символов)
- Тело media (только storage_key)

### 11.4 Sentry

- DSN в env per environment
- Tag every event with `tenant_id` (из ALS) и `user_id`
- Filter PII через `beforeSend` (email → `[REDACTED]`)
- Performance monitoring sample 10% Phase 0, 1% prod после ramp-up

### 11.5 Логи

`pino` (как в ES) с pretty в dev, JSON в prod. Структурированные поля:
```
{
  level, time, tenantId, userId, requestId, action, ...payload
}
```

Сборка через pm2 → файл → centralised (Phase 1: Loki/Grafana).

---

## 12. Деплой

### 12.1 Infrastructure (Phase 0)

- **VPS:** один сервер (тот же кластер, что ES, отдельный workspace)
- **Postgres:** один инстанс, отдельная база `barbie_site1`
- **MinIO:** общий инстанс с ES, отдельный bucket
- **nginx:** wildcard vhost `*.crm.example.com` → один upstream
- **SSL:** LetsEncrypt wildcard (manual renew Phase 0 → cert-manager Phase 2)
- **PM2:** отдельный app `barbie-site1-api` и `barbie-site1-web`

### 12.2 Database

- `DATABASE_URL=postgresql://postgres:***@localhost:5432/barbie_site1`
- Миграции через Drizzle Kit
- НЕ ДЕЛИТЬ базу с ES (даже если на одном инстансе)

### 12.3 Custom domains

Phase 0:
- Тенант запрашивает custom domain → platform-admin вручную добавляет в `tenant_domains` table
- nginx config пересоздаётся по шаблону → `nginx -s reload`
- SSL сертификат — отдельный для каждого custom domain

Phase 2:
- cert-manager + ACME challenge через DNS-01
- Self-service provisioning

### 12.4 Health checks

- `/health` — liveness (без БД)
- `/health/ready` — readiness (БД ping + MinIO ping)
- pm2 monitors через PM2 ecosystem config (отдельный, не трогать `ecosystem.config.cjs` родительского ES)

### 12.5 CI/CD

- Branch protection на `main`
- Pre-commit hooks: lint, type-check, unit tests
- CI: build → test → migrate dry-run → деплой через `git pull` + `npm run vps:after-pull` (по образцу ES, отдельный target)

---

## 13. Эволюция

### 13.1 Phase 0 → 1 (после MVP)

- Subscriptions + invoicing (Stripe Connect / CloudPayments)
- Client payments online
- OAuth (Google, Yandex)
- Email notifications (Mailhog dev → SES prod)
- Advanced reporting (revenue per salon, master utilization)

### 13.2 Phase 1 → 2 (зрелая стадия)

- Postgres RLS (layer 4 isolation)
- Telegram bot для клиентов (опц.)
- Custom domain self-service (cert-manager)
- 2FA для admin-ролей
- Multi-region (read replicas → eventual hot-failover)
- Marketplace интеграций (YClients import, Wildberries-like marketplace для услуг)

### 13.3 Поинты пересмотра

Каждые ~3 месяца ревью архитектуры. Триггеры для досрочного пересмотра:
- Тенантов > 100 → пересмотреть caching, indexing, sharding readiness
- p95 latency > 500ms → профилирование + index review
- Инцидент cross-tenant data leak → немедленный RLS roll-out
- Регуляторные изменения (ФЗ-152, GDPR-аналоги) → пересмотр key naming и log retention

---

## 14. Open questions

1. **Кодировка slug:** допускаем Punycode для русских slug'ов (`спа-альфа.crm.example.com`) или только ASCII? — Default: ASCII в Phase 0, IDN в Phase 2.
2. **Tenant suspension UX:** какую страницу показываем при `tenants.status='suspended'`? — Default: `503` + статичная страница "Сервис временно недоступен" с поддержкой контактом.
3. **Reserved slugs:** список (`www`, `api`, `admin`, `app`, `cdn`, `mail`, `m`, `crm`, `platform`) — TBD финальный список.
4. **Tenant data export:** GDPR-аналог требует выгрузки данных по запросу — формат (JSON dump, CSV per table)? — Default: JSON dump, Phase 1.
5. **Backup strategy:** per-tenant restore без отката всей БД? — Default: pg_dump на уровне всей БД Phase 0, per-tenant export через app-level Phase 1.
