# Barbie / SITE1 — Database Schema Specification

**Status:** Level 2 architectural design (Drizzle pseudo-TS spec, NOT implementation)
**Last updated:** 2026-05-16
**Companion docs:** `ARCHITECTURE.md`, `ROLES-RBAC.md`

---

## 0. Соглашения

| Аспект | Решение |
|--------|---------|
| ID type | `uuid` v7 (time-ordered) — `defaultRandom()` или explicit v7 generator |
| FK type | `uuid` (matches PK) |
| `created_at` / `updated_at` | `timestamp with time zone NOT NULL DEFAULT now()` |
| `updated_at` trigger | Postgres trigger `set_updated_at()` на каждой таблице с `updated_at` |
| Money | `bigint NOT NULL` (копейки), имя поля `*_kopecks`. Никогда не `numeric`/`float` |
| Strings | `varchar(N)` для коротких (email 320, slug 64, label 255). Свыше — `text` |
| Soft-delete | НЕ используем. Вместо — `status` enum (`active|archived|deleted|...`) |
| Tenant scoping | Все таблицы кроме `platform_admins`, `audit_log_platform`, `subscription_plans` — `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE` |
| Composite indices | Всегда начинаются с `tenant_id` для tenant-scoped queries |
| Enum strategy | `varchar(N)` + `$type<'a'|'b'>()` + CHECK constraint (как в ES). НЕ pgEnum (миграции легче) |
| jsonb | Для гибких payload'ов, всегда с TS-типом через `$type<>()` |
| Naming | snake_case в БД, camelCase в Drizzle column-name |
| Timestamps timezone | `timestamp` без явного `withTimezone`, но Postgres сессия в `UTC` (`SET TIME ZONE 'UTC'`) |

### Helper-types (для краткости в спеке ниже)

```
type Uuid = string;
type Kopecks = bigint;
type Jsonb<T> = T; // Drizzle: jsonb('col').$type<T>()
```

---

## 1. Phase 0 (MVP) tables

### 1.1 `tenants`

Корневая таблица — описывает каждого арендатора платформы.

```ts
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    slug: varchar('slug', { length: 64 }).notNull(),                    // URL-safe, lowercase, 3-64 chars
    name: varchar('name', { length: 255 }).notNull(),                   // Display name
    legalName: varchar('legal_name', { length: 500 }),                  // Юр. наименование

    status: varchar('status', { length: 20 })
      .$type<'active' | 'pending' | 'suspended' | 'archived'>()
      .notNull()
      .default('pending'),

    planId: uuid('plan_id').references(() => subscriptionPlans.id, { onDelete: 'set null' }),
    // Phase 0: planId nullable (нет подписок). Phase 1: required при активации.

    primaryDomain: varchar('primary_domain', { length: 255 }),          // Custom domain (опц.)
    contactEmail: varchar('contact_email', { length: 320 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 32 }),

    timezone: varchar('timezone', { length: 64 }).notNull().default('Europe/Moscow'),
    locale: varchar('locale', { length: 8 }).notNull().default('ru'),

    settings: jsonb('settings').$type<TenantSettings>().notNull().default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    slugUniq: uniqueIndex('tenants_slug_uniq').on(t.slug),
    primaryDomainUniq: uniqueIndex('tenants_primary_domain_uniq')
      .on(t.primaryDomain)
      .where(sql`${t.primaryDomain} is not null`),
    statusIdx: index('tenants_status_idx').on(t.status),
    slugCheck: check(
      'tenants_slug_format_check',
      sql`slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'`,
    ),
  }),
);

type TenantSettings = {
  features?: Record<string, boolean>;     // feature flags per tenant
  bookingPolicy?: { minAdvanceHours?: number; cancelHoursBefore?: number };
  paymentRequired?: boolean;
};
```

**Notes:**
- `slug` 3-64 chars, lowercase ASCII alphanumeric + hyphen (no leading/trailing hyphen). Punycode зарезервирован для Phase 2.
- `primaryDomain` — для тенантов с custom domain. Partial unique (не-NULL only).
- `status='archived'` означает данные сохранены, доступ закрыт. `'suspended'` — временно, restoreable.

### 1.2 `tenant_design_tokens`

Дизайн-система на тенанта: цвета, шрифты, лого, выбранный навигационный темплейт.

```ts
export const tenantDesignTokens = pgTable(
  'tenant_design_tokens',
  {
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .primaryKey(),                                                    // 1:1 с tenants

    bg: varchar('bg', { length: 16 }).notNull().default('#FFFFFF'),
    headColor: varchar('head_color', { length: 16 }).notNull().default('#0A0A0A'),
    headFont: varchar('head_font', { length: 64 }).notNull().default('Unbounded'),
    accColor: varchar('acc_color', { length: 16 }).notNull().default('#D4AF37'),
    accFont: varchar('acc_font', { length: 64 }).notNull().default('Unbounded'),
    bodyColor: varchar('body_color', { length: 16 }).notNull().default('#1A1A1A'),
    bodyFont: varchar('body_font', { length: 64 }).notNull().default('Inter'),

    logoKey: varchar('logo_key', { length: 500 }),                      // S3 key (tenant/{tid}/logo/...)
    logoAlt: varchar('logo_alt', { length: 255 }),
    faviconKey: varchar('favicon_key', { length: 500 }),

    navTemplate: varchar('nav_template', { length: 32 })
      .$type<'top-classic' | 'mega-images' | 'vertical-side'>()
      .notNull()
      .default('top-classic'),

    customCss: text('custom_css'),                                      // Опц. tenant-admin может добавить
    extras: jsonb('extras').$type<Record<string, string>>().default(sql`'{}'::jsonb`),

    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    navTemplateCheck: check(
      'tenant_design_tokens_nav_template_check',
      sql`nav_template IN ('top-classic','mega-images','vertical-side')`,
    ),
    colorFormatCheck: check(
      'tenant_design_tokens_colors_hex_check',
      sql`bg ~ '^#[0-9A-Fa-f]{6,8}$' AND head_color ~ '^#[0-9A-Fa-f]{6,8}$'`,
    ),
  }),
);
```

**Notes:**
- 1:1 с `tenants` → primary key = `tenant_id`, не отдельный `id`.
- Row создаётся триггером при `INSERT` в `tenants` (или явно application-level в `TenantsService.create`).

### 1.3 `tenant_menu_items`

Иерархические пункты главной навигации сайта тенанта.

```ts
export const tenantMenuItems = pgTable(
  'tenant_menu_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    parentId: uuid('parent_id'),                                        // nullable, self-FK ниже
    label: varchar('label', { length: 255 }).notNull(),
    href: varchar('href', { length: 1000 }).notNull(),                  // /path or https://...

    imageKey: varchar('image_key', { length: 500 }),                    // S3 key для mega-images dropdown
    icon: varchar('icon', { length: 64 }),                              // lucide-react name для vertical-side

    sortOrder: integer('sort_order').notNull().default(0),

    locale: varchar('locale', { length: 8 }).notNull().default('ru'),

    payload: jsonb('payload').$type<MenuItemPayload>().default(sql`'{}'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<'active' | 'hidden' | 'archived'>()
      .notNull()
      .default('active'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    parentFk: foreignKey({ columns: [t.parentId], foreignColumns: [t.id] })
      .onDelete('cascade'),
    tenantParentIdx: index('tmi_tenant_parent_sort_idx')
      .on(t.tenantId, t.parentId, t.sortOrder),
    tenantLocaleIdx: index('tmi_tenant_locale_idx').on(t.tenantId, t.locale),
    targetCheck: check(
      'tenant_menu_items_href_check',
      sql`href ~ '^(/|https?://)'`,
    ),
  }),
);

type MenuItemPayload = {
  description?: string;        // для mega-images
  badge?: string;              // "Новинка", "-20%"
  openInNewTab?: boolean;
  highlight?: boolean;
};
```

**Notes:**
- Composite index `(tenant_id, parent_id, sort_order)` оптимизирует рендеринг меню.
- `parent_id` cascade — удаление родителя удаляет детей (или в Phase 1 — перенос детей на root через триггер).
- Уровень вложенности ограничен 2 (root + 1 child) на application level; БД не ограничивает.

### 1.4 `users`

Базовая identity. ОДНО `users` row может иметь несколько `tenant_users` (multi-tenant membership) или `platform_admins` row.

```ts
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    email: varchar('email', { length: 320 }).notNull(),                 // lowercased, unique
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),  // bcrypt cost 12
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }),                            // E.164

    emailVerifiedAt: timestamp('email_verified_at'),
    phoneVerifiedAt: timestamp('phone_verified_at'),

    status: varchar('status', { length: 20 })
      .$type<'active' | 'pending_verification' | 'suspended' | 'archived'>()
      .notNull()
      .default('pending_verification'),

    locale: varchar('locale', { length: 8 }).notNull().default('ru'),

    lastLoginAt: timestamp('last_login_at'),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    emailUniq: uniqueIndex('users_email_uniq').on(t.email),
    phoneIdx: index('users_phone_idx').on(t.phone),
    statusIdx: index('users_status_idx').on(t.status),
    emailFormatCheck: check(
      'users_email_format_check',
      sql`email ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`,
    ),
  }),
);
```

**Notes:**
- `email` глобально unique через все тенанты. Это упрощает login (не нужен tenant slug в форме входа для платформенных юзеров).
- НЕТ `tenant_id` в `users` — связь через `tenant_users` / `platform_admins`.
- Phase 1: дополнительные identity-таблицы (`user_oauth_providers`).

### 1.5 `platform_admins`

Суперпользователи платформы. Cross-tenant доступ.

```ts
export const platformAdmins = pgTable(
  'platform_admins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),

    role: varchar('role', { length: 32 })
      .$type<'platform-admin' | 'platform-support'>()
      .notNull()
      .default('platform-admin'),

    permissions: jsonb('permissions')
      .$type<Record<string, boolean>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    roleIdx: index('platform_admins_role_idx').on(t.role),
  }),
);
```

**Notes:**
- НЕТ `tenant_id` — это явно cross-tenant роль.
- `platform-support` — read-only для саппорта (Phase 1+).

### 1.6 `tenant_users`

Связь user ↔ tenant с ролью. Multi-tenant: один user может быть в нескольких tenant'ах с разными ролями.

```ts
export const tenantUsers = pgTable(
  'tenant_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    role: varchar('role', { length: 32 })
      .$type<'tenant-admin' | 'salon-manager' | 'master' | 'client'>()
      .notNull(),

    salonId: uuid('salon_id').references(() => salons.id, { onDelete: 'set null' }),
    // nullable: tenant-admin / client не привязаны к салону; salon-manager / master — обязательно

    permissions: jsonb('permissions')
      .$type<Record<string, boolean>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<'active' | 'invited' | 'suspended' | 'archived'>()
      .notNull()
      .default('active'),

    invitedAt: timestamp('invited_at'),
    acceptedAt: timestamp('accepted_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantUserUniq: uniqueIndex('tenant_users_tenant_user_uniq').on(t.tenantId, t.userId),
    tenantRoleIdx: index('tenant_users_tenant_role_idx').on(t.tenantId, t.role),
    salonRoleIdx: index('tenant_users_salon_role_idx').on(t.salonId, t.role),
    salonRequiredCheck: check(
      'tenant_users_salon_required_check',
      sql`(role IN ('tenant-admin','client') OR salon_id IS NOT NULL)`,
    ),
  }),
);
```

**Notes:**
- `(tenant_id, user_id)` unique — один user может быть в тенанте только с одной активной ролью.
- `salonId` обязателен для `salon-manager` и `master` (CHECK constraint).
- `permissions` — fine-grained overrides поверх роли (Phase 1).

### 1.7 `salons`

Физический салон. Один тенант может иметь много салонов (сеть).

```ts
export const salons = pgTable(
  'salons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),                    // unique per tenant

    address: text('address').notNull(),
    city: varchar('city', { length: 128 }).notNull(),
    region: varchar('region', { length: 128 }),
    country: varchar('country', { length: 2 }).notNull().default('RU'), // ISO-3166-1 alpha-2
    postalCode: varchar('postal_code', { length: 16 }),

    geoLat: numeric('geo_lat', { precision: 9, scale: 6 }),
    geoLng: numeric('geo_lng', { precision: 9, scale: 6 }),

    phone: varchar('phone', { length: 32 }),
    email: varchar('email', { length: 320 }),

    workingHours: jsonb('working_hours').$type<WorkingHours>().notNull(),

    status: varchar('status', { length: 20 })
      .$type<'active' | 'paused' | 'archived'>()
      .notNull()
      .default('active'),

    coverImageKey: varchar('cover_image_key', { length: 500 }),
    description: text('description'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantSlugUniq: uniqueIndex('salons_tenant_slug_uniq').on(t.tenantId, t.slug),
    tenantStatusIdx: index('salons_tenant_status_idx').on(t.tenantId, t.status),
    tenantCityIdx: index('salons_tenant_city_idx').on(t.tenantId, t.city),
  }),
);

type WorkingHours = {
  mon?: { open: string; close: string; closed?: boolean }; // "09:00", "21:00"
  tue?: { open: string; close: string; closed?: boolean };
  wed?: { open: string; close: string; closed?: boolean };
  thu?: { open: string; close: string; closed?: boolean };
  fri?: { open: string; close: string; closed?: boolean };
  sat?: { open: string; close: string; closed?: boolean };
  sun?: { open: string; close: string; closed?: boolean };
  exceptions?: Array<{ date: string; closed?: boolean; open?: string; close?: string }>;
};
```

### 1.8 `services`

Каталог услуг. Может быть глобальной (на тенанта) или специфичной для салона.

```ts
export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    salonId: uuid('salon_id').references(() => salons.id, { onDelete: 'cascade' }),
    // nullable: услуга доступна во всех салонах тенанта если NULL

    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull(),
    description: text('description'),

    category: varchar('category', { length: 64 }).notNull(),            // "massage" | "facial" | ...
    durationMin: integer('duration_min').notNull(),
    priceKopecks: bigint('price_kopecks', { mode: 'bigint' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RUB'),

    coverImageKey: varchar('cover_image_key', { length: 500 }),

    status: varchar('status', { length: 20 })
      .$type<'active' | 'draft' | 'archived'>()
      .notNull()
      .default('draft'),

    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantSalonSlugUniq: uniqueIndex('services_tenant_salon_slug_uniq')
      .on(t.tenantId, t.salonId, t.slug),
    tenantStatusIdx: index('services_tenant_status_idx').on(t.tenantId, t.status),
    tenantCategoryIdx: index('services_tenant_category_idx').on(t.tenantId, t.category),
    salonStatusIdx: index('services_salon_status_idx').on(t.salonId, t.status),
    durationCheck: check('services_duration_check', sql`duration_min > 0 AND duration_min <= 1440`),
    priceCheck: check('services_price_check', sql`price_kopecks >= 0`),
  }),
);
```

**Notes:**
- Уникальность slug: `(tenant_id, salon_id, slug)`. Для глобальных (`salon_id IS NULL`) — `(tenant_id, NULL, slug)`.
- `priceKopecks` хранится как bigint, сериализуется в API как строка.

### 1.9 `staff`

Мастера (исполнители услуг).

```ts
export const staff = pgTable(
  'staff',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    salonId: uuid('salon_id')
      .references(() => salons.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    // nullable: master может быть приглашён, но ещё не зарегистрирован

    name: varchar('name', { length: 255 }).notNull(),
    bio: text('bio'),
    photoKey: varchar('photo_key', { length: 500 }),

    specialties: jsonb('specialties').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    // ["massage", "aromatherapy"] — категории услуг

    schedule: jsonb('schedule').$type<StaffSchedule>().notNull(),
    // weekly recurring schedule + exceptions

    status: varchar('status', { length: 20 })
      .$type<'active' | 'on_leave' | 'archived'>()
      .notNull()
      .default('active'),

    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantSalonStatusIdx: index('staff_tenant_salon_status_idx').on(t.tenantId, t.salonId, t.status),
    userIdx: index('staff_user_idx').on(t.userId),
  }),
);

type StaffSchedule = {
  weekly: Record<
    'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
    Array<{ from: string; to: string }> | null
  >;
  exceptions?: Array<{ date: string; slots: Array<{ from: string; to: string }> | null }>;
};
```

### 1.10 `staff_services` (M2M)

```ts
export const staffServices = pgTable(
  'staff_services',
  {
    staffId: uuid('staff_id')
      .references(() => staff.id, { onDelete: 'cascade' })
      .notNull(),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'cascade' })
      .notNull(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    // дублируем для composite index'ов и safety при cascade

    priceOverrideKopecks: bigint('price_override_kopecks', { mode: 'bigint' }),
    durationOverrideMin: integer('duration_override_min'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.staffId, t.serviceId] }),
    tenantIdx: index('staff_services_tenant_idx').on(t.tenantId),
    serviceIdx: index('staff_services_service_idx').on(t.serviceId),
  }),
);
```

### 1.11 `clients`

Клиенты салона (не платформенные пользователи, а CRM-записи о людях).

```ts
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    // nullable: клиент может быть введён вручную администратором без регистрации

    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 320 }),
    birthdate: date('birthdate'),

    notes: text('notes'),
    tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<'active' | 'blocked' | 'archived'>()
      .notNull()
      .default('active'),

    firstVisitAt: timestamp('first_visit_at'),
    lastVisitAt: timestamp('last_visit_at'),
    totalSpentKopecks: bigint('total_spent_kopecks', { mode: 'bigint' }).notNull().default(sql`0`),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantPhoneUniq: uniqueIndex('clients_tenant_phone_uniq').on(t.tenantId, t.phone),
    tenantEmailIdx: index('clients_tenant_email_idx')
      .on(t.tenantId, t.email)
      .where(sql`${t.email} is not null`),
    tenantStatusIdx: index('clients_tenant_status_idx').on(t.tenantId, t.status),
    userIdx: index('clients_user_idx').on(t.userId),
  }),
);
```

**Notes:**
- `(tenant_id, phone)` unique — один телефон = один клиент в тенанте.
- `userId` появляется когда клиент регистрируется (link existing CRM-card).

### 1.12 `appointments`

Запись на услугу. Ключевая таблица операционки.

```ts
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    salonId: uuid('salon_id')
      .references(() => salons.id, { onDelete: 'restrict' })
      .notNull(),

    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'restrict' })
      .notNull(),
    staffId: uuid('staff_id')
      .references(() => staff.id, { onDelete: 'restrict' })
      .notNull(),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'restrict' })
      .notNull(),

    startsAt: timestamp('starts_at').notNull(),
    durationMin: integer('duration_min').notNull(),
    endsAt: timestamp('ends_at').notNull(),                             // computed: starts_at + duration

    priceKopecks: bigint('price_kopecks', { mode: 'bigint' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RUB'),

    status: varchar('status', { length: 20 })
      .$type<'booked' | 'confirmed' | 'completed' | 'cancelled' | 'noshow'>()
      .notNull()
      .default('booked'),

    source: varchar('source', { length: 16 })
      .$type<'web' | 'admin' | 'tg' | 'phone' | 'walk-in'>()
      .notNull()
      .default('web'),

    notes: text('notes'),
    cancellationReason: text('cancellation_reason'),

    idempotencyKey: varchar('idempotency_key', { length: 128 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantStartsIdx: index('appointments_tenant_starts_idx').on(t.tenantId, t.startsAt),
    tenantSalonStartsIdx: index('appointments_tenant_salon_starts_idx')
      .on(t.tenantId, t.salonId, t.startsAt),
    staffStartsIdx: index('appointments_staff_starts_idx').on(t.staffId, t.startsAt),
    clientStartsIdx: index('appointments_client_starts_idx').on(t.clientId, t.startsAt),
    tenantStatusIdx: index('appointments_tenant_status_idx').on(t.tenantId, t.status),
    idempotencyUniq: uniqueIndex('appointments_idempotency_uniq')
      .on(t.tenantId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
    durationCheck: check('appointments_duration_check', sql`duration_min > 0 AND duration_min <= 1440`),
    timeOrderCheck: check('appointments_time_order_check', sql`ends_at > starts_at`),
    priceCheck: check('appointments_price_check', sql`price_kopecks >= 0`),
  }),
);
```

**Key indices reasoning:**
- `(tenant_id, salon_id, starts_at)` — расписание салона на день/неделю (главный hot path).
- `(staff_id, starts_at)` — расписание мастера.
- `(client_id, starts_at)` — история клиента.
- `(tenant_id, idempotency_key)` partial unique — предотвращает дубли при retry POST /appointments.

**Триггер:** `set_appointments_ends_at` BEFORE INSERT/UPDATE → `NEW.ends_at = NEW.starts_at + (NEW.duration_min * INTERVAL '1 minute')`.

**Overlap protection:** Phase 1 — exclusion constraint `EXCLUDE USING gist (staff_id WITH =, tsrange(starts_at, ends_at) WITH &&) WHERE (status IN ('booked','confirmed'))`. Phase 0 — application-level check.

### 1.13 `sessions`

Refresh-token sessions. По образцу ES, расширено `tenant_id` для tenant-scoped JWT.

```ts
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    // nullable: для platform-admin scope

    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    accessTokenHash: varchar('access_token_hash', { length: 255 }),

    scope: varchar('scope', { length: 16 })
      .$type<'tenant' | 'platform'>()
      .notNull(),

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),

    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    revokedReason: varchar('revoked_reason', { length: 128 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId),
    tenantUserIdx: index('sessions_tenant_user_idx').on(t.tenantId, t.userId),
    refreshTokenIdx: uniqueIndex('sessions_refresh_token_uniq').on(t.refreshTokenHash),
    expiresIdx: index('sessions_expires_idx').on(t.expiresAt),
    scopeTenantCheck: check(
      'sessions_scope_tenant_check',
      sql`(scope = 'platform' AND tenant_id IS NULL) OR (scope = 'tenant' AND tenant_id IS NOT NULL)`,
    ),
  }),
);
```

### 1.14 `audit_log_tenant`

Tenant-scoped аудит.

```ts
export const auditLogTenant = pgTable(
  'audit_log_tenant',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),

    action: varchar('action', { length: 64 }).notNull(),                // "appointment.create", "service.update"
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: uuid('entity_id'),

    payloadDiff: jsonb('payload_diff').$type<AuditPayloadDiff>(),
    // { before: {...}, after: {...} } или { event: 'xyz', data: {...} }

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    requestId: varchar('request_id', { length: 64 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantCreatedIdx: index('alt_tenant_created_idx').on(t.tenantId, t.createdAt.desc()),
    tenantActionIdx: index('alt_tenant_action_idx').on(t.tenantId, t.action),
    tenantEntityIdx: index('alt_tenant_entity_idx').on(t.tenantId, t.entityType, t.entityId),
    actorIdx: index('alt_actor_idx').on(t.actorUserId),
  }),
);

type AuditPayloadDiff = {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  event?: string;
  meta?: Record<string, unknown>;
};
```

### 1.15 `audit_log_platform`

Действия platform-admin'ов. БЕЗ `tenant_id` обязательного (может быть `affected_tenant_id` опционально).

```ts
export const auditLogPlatform = pgTable(
  'audit_log_platform',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),

    action: varchar('action', { length: 64 }).notNull(),
    affectedTenantId: uuid('affected_tenant_id').references(() => tenants.id, {
      onDelete: 'set null',
    }),

    payloadDiff: jsonb('payload_diff').$type<AuditPayloadDiff>(),

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    requestId: varchar('request_id', { length: 64 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    actorCreatedIdx: index('alp_actor_created_idx').on(t.actorUserId, t.createdAt.desc()),
    affectedTenantIdx: index('alp_affected_tenant_idx').on(t.affectedTenantId),
    actionIdx: index('alp_action_idx').on(t.action),
    createdIdx: index('alp_created_idx').on(t.createdAt.desc()),
  }),
);
```

### 1.16 `media`

Все загруженные файлы (logo, photos, CMS images, menu images).

```ts
export const media = pgTable(
  'media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    key: varchar('key', { length: 500 }).notNull(),                     // S3 key
    mime: varchar('mime', { length: 100 }).notNull(),
    size: bigint('size', { mode: 'bigint' }).notNull(),
    sha256: varchar('sha256', { length: 64 }),

    width: integer('width'),                                            // для изображений
    height: integer('height'),
    durationMs: integer('duration_ms'),                                 // для видео

    alt: varchar('alt', { length: 500 }),
    caption: text('caption'),

    module: varchar('module', { length: 32 }).notNull(),                // "logo" | "cms" | "staff" | "menu" | "service"
    entityId: uuid('entity_id'),                                        // ссылка на родительский entity (nullable)

    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    status: varchar('status', { length: 20 })
      .$type<'uploading' | 'ready' | 'archived'>()
      .notNull()
      .default('uploading'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    keyUniq: uniqueIndex('media_key_uniq').on(t.key),
    tenantModuleIdx: index('media_tenant_module_idx').on(t.tenantId, t.module),
    tenantEntityIdx: index('media_tenant_entity_idx').on(t.tenantId, t.module, t.entityId),
    tenantCreatedIdx: index('media_tenant_created_idx').on(t.tenantId, t.createdAt.desc()),
    keyPrefixCheck: check(
      'media_key_tenant_prefix_check',
      sql`key LIKE 'tenant/' || tenant_id::text || '/%'`,
    ),
  }),
);
```

**Notes:**
- CHECK constraint enforces `key` starts with `tenant/{tenant_id}/` — db-level guard against accidental cross-tenant key reuse.

### 1.17 `cms_pages`

Tenant-aware CMS страницы.

```ts
export const cmsPages = pgTable(
  'cms_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    slug: varchar('slug', { length: 255 }).notNull(),
    locale: varchar('locale', { length: 8 }).notNull().default('ru'),

    title: varchar('title', { length: 500 }).notNull(),
    body: jsonb('body').$type<CmsBlocks>().notNull().default(sql`'[]'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<'draft' | 'published' | 'archived'>()
      .notNull()
      .default('draft'),

    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    coverImageKey: varchar('cover_image_key', { length: 500 }),

    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantSlugLocaleUniq: uniqueIndex('cms_pages_tenant_slug_locale_uniq')
      .on(t.tenantId, t.slug, t.locale),
    tenantStatusIdx: index('cms_pages_tenant_status_idx').on(t.tenantId, t.status),
    tenantPublishedIdx: index('cms_pages_tenant_published_idx')
      .on(t.tenantId, t.publishedAt.desc())
      .where(sql`status = 'published'`),
  }),
);

type CmsBlocks = Array<
  | { type: 'hero'; data: { title: string; subtitle?: string; imageKey?: string } }
  | { type: 'text'; data: { html: string } }
  | { type: 'gallery'; data: { mediaIds: string[] } }
  | { type: 'services'; data: { categoryFilter?: string; limit?: number } }
  | { type: 'cta'; data: { label: string; href: string; style?: 'primary' | 'secondary' } }
  | { type: 'custom'; data: Record<string, unknown> }
>;
```

---

## 2. Phase 1 (после MVP) tables

### 2.1 `subscription_plans`

Глобальный каталог планов платформы. БЕЗ `tenant_id`.

```ts
export const subscriptionPlans = pgTable(
  'subscription_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    code: varchar('code', { length: 32 }).notNull(),                    // "starter" | "pro" | "enterprise"
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),

    priceMonthlyKopecks: bigint('price_monthly_kopecks', { mode: 'bigint' }).notNull(),
    priceAnnualKopecks: bigint('price_annual_kopecks', { mode: 'bigint' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RUB'),

    salonsLimit: integer('salons_limit').notNull(),
    staffLimit: integer('staff_limit').notNull(),
    appointmentsMonthlyLimit: integer('appointments_monthly_limit'),

    features: jsonb('features').$type<PlanFeatures>().notNull().default(sql`'{}'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<'active' | 'legacy' | 'archived'>()
      .notNull()
      .default('active'),

    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    codeUniq: uniqueIndex('subscription_plans_code_uniq').on(t.code),
    statusIdx: index('subscription_plans_status_idx').on(t.status),
  }),
);

type PlanFeatures = {
  customDomain?: boolean;
  apiAccess?: boolean;
  whiteLabel?: boolean;
  prioritySupport?: boolean;
  advancedReports?: boolean;
};
```

### 2.2 `subscriptions`

Подписка тенанта на план.

```ts
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    planId: uuid('plan_id')
      .references(() => subscriptionPlans.id, { onDelete: 'restrict' })
      .notNull(),

    status: varchar('status', { length: 20 })
      .$type<'pending' | 'active' | 'past_due' | 'cancelled' | 'expired'>()
      .notNull()
      .default('pending'),

    billingCycle: varchar('billing_cycle', { length: 16 })
      .$type<'monthly' | 'annual'>()
      .notNull(),

    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),

    paymentProvider: varchar('payment_provider', { length: 32 }),       // "stripe" | "cloudpayments"
    paymentProviderId: varchar('payment_provider_id', { length: 255 }),  // provider's sub id

    cancelAt: timestamp('cancel_at'),
    cancelledAt: timestamp('cancelled_at'),

    trialEndAt: timestamp('trial_end_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantActiveUniq: uniqueIndex('subscriptions_tenant_active_uniq')
      .on(t.tenantId)
      .where(sql`status IN ('active','past_due','pending')`),
    statusIdx: index('subscriptions_status_idx').on(t.status),
    providerIdx: index('subscriptions_provider_idx')
      .on(t.paymentProvider, t.paymentProviderId)
      .where(sql`${t.paymentProviderId} is not null`),
    periodEndIdx: index('subscriptions_period_end_idx').on(t.currentPeriodEnd),
  }),
);
```

**Notes:**
- Partial unique гарантирует — у тенанта только одна активная (или почти-активная) подписка.

### 2.3 `subscription_invoices`

Инвойсы за периоды подписки.

```ts
export const subscriptionInvoices = pgTable(
  'subscription_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    subscriptionId: uuid('subscription_id')
      .references(() => subscriptions.id, { onDelete: 'cascade' })
      .notNull(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    number: varchar('number', { length: 64 }).notNull(),                // "INV-2026-000123"

    amountKopecks: bigint('amount_kopecks', { mode: 'bigint' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RUB'),

    status: varchar('status', { length: 20 })
      .$type<'draft' | 'open' | 'paid' | 'void' | 'refunded'>()
      .notNull()
      .default('draft'),

    issuedAt: timestamp('issued_at').notNull(),
    dueAt: timestamp('due_at').notNull(),
    paidAt: timestamp('paid_at'),

    pdfKey: varchar('pdf_key', { length: 500 }),                        // S3 key
    paymentProviderId: varchar('payment_provider_id', { length: 255 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    numberUniq: uniqueIndex('subscription_invoices_number_uniq').on(t.number),
    subscriptionIdx: index('si_subscription_idx').on(t.subscriptionId),
    tenantStatusIdx: index('si_tenant_status_idx').on(t.tenantId, t.status),
    statusDueIdx: index('si_status_due_idx').on(t.status, t.dueAt),
  }),
);
```

### 2.4 `client_payments`

Платежи клиентов салону.

```ts
export const clientPayments = pgTable(
  'client_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    salonId: uuid('salon_id')
      .references(() => salons.id, { onDelete: 'restrict' })
      .notNull(),

    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'restrict' })
      .notNull(),

    amountKopecks: bigint('amount_kopecks', { mode: 'bigint' }).notNull(),
    refundedKopecks: bigint('refunded_kopecks', { mode: 'bigint' }).notNull().default(sql`0`),
    currency: varchar('currency', { length: 3 }).notNull().default('RUB'),

    provider: varchar('provider', { length: 32 }).notNull(),            // "stripe" | "yookassa" | "tinkoff"
    providerId: varchar('provider_id', { length: 255 }).notNull(),      // idempotency
    providerPayload: jsonb('provider_payload').$type<Record<string, unknown>>(),

    status: varchar('status', { length: 20 })
      .$type<'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partial_refunded'>()
      .notNull()
      .default('pending'),

    paidAt: timestamp('paid_at'),
    failedAt: timestamp('failed_at'),
    failureReason: text('failure_reason'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    providerUniq: uniqueIndex('client_payments_provider_uniq').on(t.provider, t.providerId),
    tenantSalonCreatedIdx: index('cp_tenant_salon_created_idx')
      .on(t.tenantId, t.salonId, t.createdAt.desc()),
    tenantStatusIdx: index('cp_tenant_status_idx').on(t.tenantId, t.status),
    appointmentIdx: index('cp_appointment_idx').on(t.appointmentId),
    clientIdx: index('cp_client_idx').on(t.clientId),
    refundCheck: check(
      'client_payments_refund_check',
      sql`refunded_kopecks >= 0 AND refunded_kopecks <= amount_kopecks`,
    ),
    amountCheck: check('client_payments_amount_check', sql`amount_kopecks >= 0`),
  }),
);
```

**Notes:**
- `(provider, provider_id)` unique → idempotency для webhook retries.
- `refunded_kopecks` ≤ `amount_kopecks` enforced via CHECK.

---

## 3. Cross-cutting: triggers & functions

### 3.1 `set_updated_at()` trigger

Применяется ко всем таблицам с `updated_at`:

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply on each table:
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON {table}
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 3.2 `set_appointments_ends_at()` trigger

```sql
CREATE OR REPLACE FUNCTION set_appointments_ends_at() RETURNS trigger AS $$
BEGIN
  NEW.ends_at = NEW.starts_at + (NEW.duration_min || ' minutes')::interval;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointments_ends_at BEFORE INSERT OR UPDATE OF starts_at, duration_min
  ON appointments FOR EACH ROW EXECUTE FUNCTION set_appointments_ends_at();
```

### 3.3 `bump_clients_aggregates()` (Phase 1)

При завершении appointment (status='completed') → обновить `clients.last_visit_at`, `total_spent_kopecks`.

```sql
CREATE OR REPLACE FUNCTION bump_clients_aggregates() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE clients
       SET last_visit_at = GREATEST(coalesce(last_visit_at, NEW.starts_at), NEW.starts_at),
           first_visit_at = LEAST(coalesce(first_visit_at, NEW.starts_at), NEW.starts_at),
           total_spent_kopecks = total_spent_kopecks + NEW.price_kopecks
     WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Migration ordering

Топологический порядок (FK-зависимости):

1. `subscription_plans` (no FK)
2. `tenants` (FK → subscription_plans nullable)
3. `users` (no FK)
4. `platform_admins` (FK → users)
5. `salons` (FK → tenants)
6. `tenant_users` (FK → tenants, users, salons)
7. `tenant_design_tokens` (FK → tenants)
8. `tenant_menu_items` (FK → tenants, self)
9. `services` (FK → tenants, salons)
10. `staff` (FK → tenants, salons, users)
11. `staff_services` (FK → staff, services, tenants)
12. `clients` (FK → tenants, users)
13. `appointments` (FK → tenants, salons, clients, staff, services)
14. `sessions` (FK → users, tenants)
15. `media` (FK → tenants, users)
16. `cms_pages` (FK → tenants, users)
17. `audit_log_tenant` (FK → tenants, users)
18. `audit_log_platform` (FK → users, tenants)
19. `subscriptions` (Phase 1) (FK → tenants, subscription_plans)
20. `subscription_invoices` (Phase 1) (FK → subscriptions, tenants)
21. `client_payments` (Phase 1) (FK → tenants, salons, appointments, clients)

---

## 5. Total count

**Phase 0 (MVP):** 17 таблиц
- tenants, tenant_design_tokens, tenant_menu_items, users, platform_admins, tenant_users, salons, services, staff, staff_services, clients, appointments, sessions, audit_log_tenant, audit_log_platform, media, cms_pages

**Phase 1:** 4 таблицы
- subscription_plans, subscriptions, subscription_invoices, client_payments

**Итого:** 21 таблица

---

## 6. Open questions

1. **`appointments` exclusion constraint:** включаем `EXCLUDE USING gist` в Phase 0 или Phase 1? GIST требует btree_gist extension. — Default: Phase 1, в Phase 0 — application-level lock через `SELECT ... FOR UPDATE` на пересекающихся слотах.
2. **`clients.phone` E.164 validation:** CHECK constraint regex или application-only? — Default: application-only (E.164 regex длинная), но добавить `phone ~ '^\\+?[0-9]{7,15}$'` как мягкий guard.
3. **`media.sha256`:** обязательное или nullable? — Default: nullable, заполняется backend после upload confirm.
4. **Multi-currency:** все таблицы имеют `currency` поле, но Phase 0 — только RUB. Делать column NOT NULL DEFAULT 'RUB' сразу? — Default: да, готовимся к Phase 1+.
5. **Soft archival vs hard delete для tenants:** при `tenants.status='archived'` оставляем data или удаляем через batch job через N дней? — Default: оставляем индефинитно Phase 0, retention policy Phase 2 (GDPR).
6. **`tenant_menu_items` глубина:** db-level ограничение или только app-level? — Default: app-level, БД допускает любую глубину (но performance деградирует > 3 уровней).
7. **`sessions` cleanup:** background job для удаления expired? — Default: pgcron job ежедневно `DELETE FROM sessions WHERE expires_at < now() - interval '7 days'`.
