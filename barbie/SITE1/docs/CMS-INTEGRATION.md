# CMS-INTEGRATION — Перенос ES CMS в barbie/SITE1 с мультитенантностью

**Назначение:** план переноса CMS-модуля из родительского проекта **ES** (`F:\Users\a\Documents\_DEV\Tran\ES\`) в **barbie/SITE1** (мультитенантный CRM сети спа-салонов) с обязательной адаптацией под `tenant_id`, без эскорт-домена и без эскроу.

**Аудитория:** разработчик и ИИ-ассистент (CLAUDE.md / ENTITY.md). Все пути в этом документе — абсолютные.

---

## 1. Резюме

**Что есть в ES (по факту чтения исходников):**

- **Backend:** один модуль `apps/api/src/cms/` — три файла (`cms.controller.ts` 107 LOC, `cms.service.ts` 119 LOC, `cms.module.ts` 12 LOC). Сущность одна — `cms_pages`. Storage страниц — `jsonb content`. Полей версионирования, locale, A/B, scheduled-publish — нет.
- **Schema:** `packages/db/src/schema/cms-pages.ts` (31 LOC) — плоская таблица с `slug uniq` (глобальным), `type ∈ {page, post}`, `status ∈ {draft, published, trash}`, `visibility ∈ {public, members, private}`, `meta_title`, `meta_description`. **Никакого `tenant_id`.** Связь только с `users.id` (author).
- **Media:** `packages/db/src/schema/media.ts` (84 LOC) — общая таблица `media_files`, **сильно заточена под эскорт-домен** (`modelId`, `albumCategory ∈ {portfolio, vip, elite, verified}`, `isVerified`). CMS использует её через media picker.
- **Загрузка файлов:** реализована **не** в `media` модуле, а в `profiles` модуле (`apps/api/src/profiles/minio.service.ts` 164 LOC) — presigned URLs для MinIO. Эндпоинты `/profiles/media/presigned`, `/profiles/media/:id/confirm`, `/profiles/media/my`. То есть в ES media-загрузка концептуально привязана к профилю модели, а CMS пользуется ею «как клиент». Для barbie это **обязательно разделить**: CMS должна иметь собственный медиа-pipeline, не пересекающийся с profile-доменом.
- **Frontend:**
  - Список страниц: `apps/web/app/dashboard/pages/page.tsx` (263 LOC)
  - Новая страница: `apps/web/app/dashboard/pages/new/page.tsx` (10 LOC, обёртка)
  - Редактирование: `apps/web/app/dashboard/pages/[id]/edit/page.tsx` (9 LOC, обёртка)
  - Главный редактор: `apps/web/components/cms/CmsPageEditor.tsx` (617 LOC) — bar с публикацией, видимостью, SEO sidebar, переключателем между двумя режимами.
  - **Два редактора:** **TipTap** (WYSIWYG — `TipTapEditor.tsx` 48 LOC + `TipTapToolbar.tsx` 115 LOC) и **Sandbox** (блочный визуальный — `SandboxEditor.tsx` 1016 LOC). Они **сосуществуют**: в JSON-контенте маркер `_type: 'sandbox'` различает режимы.
  - Sandbox-блоки: `heading`, `text`, `button`, `divider`, `spacer`, `icon-box`, `cta`, `image`. Структура: `sections → columns (1-3) → elements`. Per-element `elStyle` (paddings, background, border-radius, opacity, customCss). Device-mode preview (desktop / tablet / mobile).
  - Публичный рендер: `apps/web/app/p/[slug]/page.tsx` (95 LOC) — SSR fetch `/cms/pages/by-slug/:slug`, рендер через `SandboxRenderer.tsx` (142 LOC) для блочного контента или `tiptap-to-html` для WYSIWYG.
  - Preview: `apps/web/app/p/preview/[id]/page.tsx` (130 LOC) — клиентский, с Authorization header.
  - Media picker: `apps/web/components/cms/MediaPickerModal.tsx` (216 LOC) — список + загрузка через `/profiles/media/*`.

**Что нужно в barbie/SITE1:**

- Tenant-isolated pages: каждая страница принадлежит одному tenant (салону или сети). Список / редактирование / публикация per-tenant.
- Tenant-isolated media: ключи S3 в формате `tenant/{tenantId}/media/<uuid>.<ext>`. Метаданные в `media_files` с обязательным `tenant_id`.
- Block-based editor: **копируем Sandbox 1:1** (он уже самодостаточен) + TipTap для постов/статей.
- Preview с применением **tenant design tokens** — отдельный pipeline (см. §6 этого документа).
- SEO per-page (унаследовано из ES, ничего менять).
- Locale ru/en — в **Phase 1**. Phase 0 — только `ru`, но колонка `locale` в схеме сразу.
- Без эскорт-специфики: убрать `modelId`, `albumCategory`, `isVerified` и связанные индексы.

**Ключевые отличия barbie от ES (резюме):**

| Аспект | ES | barbie/SITE1 |
|--------|----|--------------|
| Изоляция | Одиночный инстанс | Multi-tenant, `tenant_id` обязателен |
| Slug uniqueness | Глобальный (`cms_pages_slug_uniq`) | Per-tenant (`tenant_id + slug + locale`) |
| Media модуль | Совмещён с `profiles` (эскорт) | Отдельный `MediaModule` без модельной специфики |
| Storage prefix | плоский | `tenant/{id}/media/...` |
| Locale | Нет | Колонка `locale`, в Phase 1 редактор языков |
| Design tokens | Hardcoded gold/black | Pulled from `tenant_design_tokens` table |
| Меню сайта | Нет | Редактируется рядом, через `tenant_menu_items` |
| Auth roles | ADMIN / MANAGER | platform-admin / tenant-admin / salon-manager (см. ENTITY) |
| Версионирование | Нет | Phase 1, отдельная таблица `cms_page_versions` |

---

## 2. Inventory ES-файлов

Колонка «Действие»: **1:1** — копировать без правок (кроме импортов), **adapt** — переписать с учётом tenant-context, **no** — не переносим, **new** — создаём с нуля в barbie без ES-аналога.

### Backend (`F:\Users\a\Documents\_DEV\Tran\ES\apps\api\src\`)

| Файл | LOC | Описание | Действие |
|------|-----|----------|----------|
| `cms/cms.controller.ts` | 107 | REST endpoints для pages | **adapt** — добавить `@CurrentTenant()` декоратор, `TenantGuard`; убрать `Role` если в barbie другие роли |
| `cms/cms.service.ts` | 119 | CRUD pages, slugify | **adapt** — каждый `db.select/insert/update/delete` должен включать `tenant_id` в where/values; check uniqueness `(tenant_id, slug, locale)` |
| `cms/cms.module.ts` | 12 | Module wiring | **1:1** (заменить import `AuthGuardsModule` на barbie-эквивалент) |
| `media/media.controller.ts` | 130 | REST endpoints для media (без presign) | **adapt** — добавить tenant scoping; **убрать** `modelId`, `albumCategory`, `getModelPhotos`, `approve` (модерация фото моделей) |
| `media/media.service.ts` | 210 | Media CRUD | **adapt** — то же, плюс убрать `getModelPhotos`, `getModelPhotosWithVisibility`, `getModelPublicPhotos`, `bulkUpdateVisibility (album)` |
| `media/media.module.ts` | 16 | Module wiring | **1:1** |
| `profiles/minio.service.ts` | 164 | Presigned URLs для S3 | **adapt + relocate** — вынести в **отдельный** `apps/api/src/storage/minio.service.ts` (или `media/minio.service.ts`); ключи `tenant/{tenantId}/media/<uuid>.<ext>` |
| `profiles/profiles.controller.ts` | ? | Содержит endpoints `/profiles/media/presigned`, `/profiles/media/:id/confirm`, `/profiles/media/my` | **no (split)** — эти три эндпоинта переезжают в `media.controller.ts` под путями `/media/presigned`, `/media/:id/confirm`, `/media/my` |

### Schema (`F:\Users\a\Documents\_DEV\Tran\ES\packages\db\src\schema\`)

| Файл | LOC | Описание | Действие |
|------|-----|----------|----------|
| `cms-pages.ts` | 31 | Drizzle schema `cms_pages` | **adapt** — добавить `tenant_id uuid not null + FK`, `locale varchar(8) not null default 'ru'`; заменить `slugUniq` на композитный `(tenant_id, slug, locale)`; добавить индексы `(tenant_id, type, status)`, `(tenant_id, status, published_at)` |
| `media.ts` | 84 | Drizzle schema `media_files` | **adapt heavily** — добавить `tenant_id`; убрать `modelId`, `isPublicVisible`, `albumCategory`, `isVerified`, `verificationDate`, `moderatedBy`, `moderatedAt`, `moderationReason`, `profileVisibilityIdx`; оставить storage/metadata/timestamps; добавить `(tenant_id, file_type, created_at)` индекс |

### Frontend (`F:\Users\a\Documents\_DEV\Tran\ES\apps\web\`)

| Файл | LOC | Описание | Действие |
|------|-----|----------|----------|
| `app/dashboard/pages/page.tsx` | 263 | Список страниц с фильтрами + dropdown create | **adapt** — `apiUrl` пути не меняются (`/cms/pages?type=&status=`), но запросы автоматически tenant-scoped через middleware; убрать чисто визуальные классы luxury-gold |
| `app/dashboard/pages/new/page.tsx` | 10 | Suspense wrapper | **1:1** |
| `app/dashboard/pages/new/CmsEditorNewWrapper.tsx` | ? | Wrapper для new mode | **1:1** (проверить — файл существует, надо переносить) |
| `app/dashboard/pages/[id]/edit/page.tsx` | 9 | Edit wrapper | **1:1** |
| `app/p/[slug]/page.tsx` | 95 | Публичный SSR-рендер | **adapt** — резолвить tenant по host/subdomain (см. §4 ниже); подгружать `tenant_design_tokens` и применять как CSS-переменные на корне |
| `app/p/preview/[id]/page.tsx` | 130 | Preview с auth | **adapt** — то же + проверка прав в рамках tenant |
| `components/cms/CmsPageEditor.tsx` | 617 | Главный редактор | **adapt** — убрать luxury-themed классы (`#d4af37`, `font-display`); все API-вызовы через `authFetch` сохранятся, tenant добавляется в backend |
| `components/cms/SandboxEditor.tsx` | 1016 | Блочный редактор | **1:1** — самодостаточный, не привязан к ES-домену; цвета (`#00ffcc`) пересмотреть под design tokens SITE1 |
| `components/cms/SandboxRenderer.tsx` | 142 | Read-only рендер блоков | **1:1** |
| `components/cms/MediaPickerModal.tsx` | 216 | Modal для выбора/загрузки картинок | **adapt** — заменить `api.getMyMedia()`, `api.generatePresignedUrl()`, `api.confirmUpload()` на новые `/media/*` пути (без `/profiles/` префикса) |
| `components/cms/TipTapEditor.tsx` | 48 | WYSIWYG обёртка | **1:1** |
| `components/cms/TipTapToolbar.tsx` | 115 | Тулбар TipTap | **adapt** — убрать luxury-цвета, перевести на tokens; функциональность 1:1 |
| `lib/tiptap-to-html.ts` | ? | Конвертер JSON → HTML для SSR-рендера | **1:1** (если есть unit-тесты — тоже) |

### Файлы без ES-аналога (создаём с нуля в barbie)

| Файл | Тип | Описание |
|------|-----|----------|
| `apps/api/src/common/tenant/tenant.guard.ts` | new | Резолв `tenant_id` из subdomain/header/JWT-claim, выкидывает 403 если запрошен чужой |
| `apps/api/src/common/tenant/tenant.decorator.ts` | new | `@CurrentTenant()` для controllers |
| `apps/api/src/common/tenant/tenant-als.service.ts` | new | AsyncLocalStorage для прокидывания tenantId в services без request injection |
| `apps/api/src/cms/seeds/tenant-cms-bootstrap.service.ts` | new | При создании tenant — посеять дефолтную главную страницу + меню |
| `apps/api/src/cms/dto/*.ts` | new | Вынести inline-DTO из controller в отдельные файлы (для Phase 1+ удобнее переиспользовать в OpenAPI клиенте) |
| `packages/db/src/schema/cms-page-versions.ts` | new (Phase 1) | История версий страниц (см. §8) |
| `packages/db/src/schema/tenant-design-tokens.ts` | new | См. DB-SCHEMA.md (создаётся отдельно) |
| `packages/db/src/schema/tenant-menu-items.ts` | new | См. MENU-EDITOR.md (создаётся отдельно) |
| `apps/web/lib/tenant-context.ts` | new | Frontend helper для резолва текущего тенанта (через `useTenant()` hook) |
| `apps/web/app/dashboard/media/page.tsx` | new (есть в ES под другую задачу) | Media library в админке тенанта; ES имеет `apps/web/app/dashboard/media/page.tsx`, но он показывает фото моделей — переписать под общую медиатеку CMS |

---

## 3. План порта

### 3.1 Backend

**Контроллеры / сервисы — копируем 1:1:**
- `cms.module.ts` (с заменой imports на barbie-эквиваленты)

**Переписываем с tenant-context:**
- `cms.controller.ts` — добавить `@UseGuards(TenantGuard)` на уровне класса, `@CurrentTenant() tenantId: string` в каждом методе, прокинуть `tenantId` в сервис.
- `cms.service.ts` — все методы принимают `tenantId` первым параметром; все Drizzle-запросы дополняются `eq(cmsPages.tenantId, tenantId)` в `where`. Slug uniqueness check — по `(tenantId, slug, locale)`.
- `media.controller.ts` — аналогично; удалить `getModelPhotos`, `approve` (или оставить как admin-only моерация без эскорт-семантики).
- `media.service.ts` — удалить все методы с `model*`; оставить `createFile`, `findById` (с `tenantId` фильтром), `findByOwner` (с двойным фильтром `ownerId + tenantId`), `update`, `delete`, `getStats` (per-tenant).

**Новые сервисы:**
- `TenantCmsBootstrapService.seedTenant(tenantId)` — при создании tenant вызывается из tenant-onboarding flow; создаёт:
  - 1 страницу `slug: home`, `status: published`, `content: { _type: 'sandbox', sections: [<hero+text+cta>] }`
  - 1 страницу `slug: about`, `status: draft`
  - 3 пункта меню (`Главная`, `Услуги`, `Контакты`) → `tenant_menu_items`
- `TenantStorageService` (новый, в `apps/api/src/storage/`) — обёртка над MinIO, формирует ключи `tenant/{tenantId}/media/<uuid>.<ext>`, валидирует mime, выдаёт presigned URLs.

**Структура папок (предлагается):**

```
apps/api/src/
├── cms/
│   ├── cms.module.ts
│   ├── cms.controller.ts
│   ├── cms.service.ts
│   ├── dto/
│   │   ├── create-page.dto.ts
│   │   └── update-page.dto.ts
│   └── seeds/
│       └── tenant-cms-bootstrap.service.ts
├── media/
│   ├── media.module.ts
│   ├── media.controller.ts
│   ├── media.service.ts
│   └── dto/
│       ├── create-media.dto.ts
│       ├── presigned-url.dto.ts
│       └── confirm-upload.dto.ts
├── storage/
│   ├── storage.module.ts
│   └── minio.service.ts
└── common/
    └── tenant/
        ├── tenant.module.ts
        ├── tenant.guard.ts
        ├── tenant.decorator.ts
        └── tenant-als.service.ts
```

### 3.2 Schema

**`packages/db/src/schema/cms-pages.ts` (адаптация):**

```ts
import { pgTable, uuid, varchar, text, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const cmsPages = pgTable(
  'cms_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 8 }).notNull().default('ru'),
    type: varchar('type', { length: 20 }).notNull().default('page'),
    title: varchar('title', { length: 500 }).notNull().default(''),
    slug: varchar('slug', { length: 255 }).notNull(),
    content: jsonb('content'),
    excerpt: text('excerpt'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    featuredImageUrl: text('featured_image_url'),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    metaOgImageUrl: text('meta_og_image_url'),   // новое
    visibility: varchar('visibility', { length: 20 }).notNull().default('public'),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    slugUniq: uniqueIndex('cms_pages_tenant_slug_locale_uniq').on(t.tenantId, t.slug, t.locale),
    tenantTypeStatusIdx: index('cms_pages_tenant_type_status_idx').on(t.tenantId, t.type, t.status),
    tenantPublishedIdx: index('cms_pages_tenant_published_idx').on(t.tenantId, t.status, t.publishedAt),
  }),
);
```

**`packages/db/src/schema/media.ts` (адаптация):**

```ts
export const mediaFiles = pgTable(
  'media_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),  // nullable: tenant может пережить удаление автора

    fileType: varchar('file_type', { length: 20 }).$type<'image' | 'video' | 'document'>().notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size'),

    storageKey: varchar('storage_key', { length: 500 }).notNull(), // tenant/{tenantId}/media/<uuid>.<ext>
    bucket: varchar('bucket', { length: 100 }).default('barbie-media'),
    cdnUrl: varchar('cdn_url', { length: 500 }),
    presignedUrl: varchar('presigned_url', { length: 1000 }),
    presignedExpiresAt: timestamp('presigned_expires_at'),

    altText: varchar('alt_text', { length: 500 }),     // новое — для CMS картинок
    title: varchar('title', { length: 255 }),          // новое
    metadata: jsonb('metadata').$type<{
      width?: number; height?: number; duration?: number; originalName?: string;
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    storageKeyUniq: uniqueIndex('media_storage_key_uniq').on(t.storageKey),
    tenantOwnerIdx: index('media_tenant_owner_idx').on(t.tenantId, t.ownerId),
    tenantTypeIdx: index('media_tenant_type_idx').on(t.tenantId, t.fileType, t.createdAt),
  }),
);
```

**Что выкинули из ES media.ts:** `modelId`, `isPublicVisible`, `albumCategory`, `sortOrder` (если нужен — оставить, но не для эскорт-категорий), `isVerified`, `verificationDate`, `moderationStatus`, `moderationReason`, `moderatedBy`, `moderatedAt`. Если в SITE1 понадобится модерация — добавится отдельной миграцией в Phase 1.

### 3.3 Frontend

**`apps/web/app/dashboard/cms/` (предлагаемая структура — переименовать `pages/` в `cms/pages/` для логической группировки):**

```
apps/web/app/dashboard/cms/
├── layout.tsx              # боковое меню «Страницы / Меню / Медиатека»
├── pages/
│   ├── page.tsx            # список (из ES port)
│   ├── new/page.tsx        # обёртка
│   ├── new/CmsEditorNewWrapper.tsx
│   └── [id]/edit/page.tsx
├── menu/
│   └── page.tsx            # редактор меню (см. MENU-EDITOR.md)
└── media/
    └── page.tsx            # медиа-библиотека тенанта
```

**Public preview:**
- `apps/web/app/p/[slug]/page.tsx` — добавить резолв tenant по `headers().get('host')` (subdomain → tenant lookup), подтянуть `tenant_design_tokens`, применить как inline `<style>` или CSS-переменные на корневом `<div>`.
- В `<head>` через `generateMetadata` уже работает SEO — оставить, добавить `og:image` из `metaOgImageUrl`.

**Block-based editor:** `SandboxEditor.tsx` — копируем 1:1, **но**:
- Заменить hardcoded `#00ffcc` (текущий accent редактора) на CSS-переменные `var(--cms-accent)` чтобы редактор подстраивался под design tokens.
- В `<WidgetView>` при рендере (preview через `SandboxRenderer`) тоже применять tokens вместо hardcoded цветов кнопок (`#00ffcc`, `#1e1e1e`).

---

## 4. Tenant-aware adaptations

### 4.1 Резолв tenantId

**Источники (приоритет сверху вниз):**
1. **Subdomain** на публичных страницах: `salon-1.barbie.app` → lookup в `tenants.subdomain` → `tenantId`.
2. **JWT claim** для админских запросов: при логине в админку tenant-admin получает JWT с `tenantId`; platform-admin — без, но с правом передавать `X-Tenant-Id` header.
3. **Header `X-Tenant-Id`** — fallback для платформенных вызовов / e2e тестов.

**Реализация:**
- `TenantResolverMiddleware` (Nest middleware на все routes кроме `/auth/*`, `/health`): резолвит источник, кладёт в `request.tenantId`.
- `TenantGuard` (`@UseGuards(TenantGuard)`): проверяет, что `request.tenantId` существует; для платформенных endpoint'ов исключение через `@AllowCrossTenant()`.
- `@CurrentTenant()` — параметр-декоратор для controllers.
- `TenantAlsService` (AsyncLocalStorage) — для случаев, когда сервис вызывается из другого сервиса без request: tenantId доступен через `tenantAls.run(tenantId, () => ...)`.

### 4.2 Защита в сервисах (defence in depth)

Даже когда tenantId прокинут из guard, **каждый запрос в БД повторно фильтрует**:

```ts
// cms.service.ts:findBySlug
async findBySlug(tenantId: string, slug: string, locale = 'ru') {
  const rows = await this.db.select().from(cmsPages)
    .where(and(
      eq(cmsPages.tenantId, tenantId),     // ← обязательно
      eq(cmsPages.slug, slug),
      eq(cmsPages.locale, locale),
      eq(cmsPages.status, 'published'),
      eq(cmsPages.visibility, 'public'),
    ))
    .limit(1);
  if (!rows[0]) throw new NotFoundException('Page not found');
  return rows[0];
}
```

**Правило:** ни один SELECT/UPDATE/DELETE по таблицам с `tenant_id` **без** `eq(table.tenantId, tenantId)` в `where`. Code review check.

### 4.3 Тесты на изоляцию

Для каждого нового read-эндпоинта (см. ENTITY §2 правило 2):

```ts
// cms.controller.spec.ts (пример формы)
it('returns 404 when fetching page from another tenant by id', async () => {
  const pageT1 = await createPage(tenant1, { slug: 'foo' });
  const reqT2 = makeRequest({ tenantId: tenant2 });
  await expect(controller.findOne(reqT2, pageT1.id)).rejects.toThrow(NotFoundException);
});
```

### 4.4 Migrations

Все CMS-миграции — **после** базовой `tenants` таблицы. Порядок (предполагается):

```
0001_create_tenants.sql
0002_create_users.sql
0003_create_cms_pages.sql           # сразу с tenant_id, без миграционных шагов "добавить колонку"
0004_create_media_files.sql         # тенант-aware с нуля
0005_create_tenant_design_tokens.sql
0006_create_tenant_menu_items.sql
0007_create_cms_page_versions.sql   # Phase 1
```

Это **не «миграция ES → barbie»**, это **fresh build** схемы — в ES уже есть `cms_pages` с глобальным slug, в barbie сразу заводим с `tenant_id` и композитным индексом, без переходных шагов.

---

## 5. Block types спецификация (Sandbox)

Перенесённый из ES `SandboxEditor.tsx` уже содержит 8 типов блоков. Ниже — их компактная схема (как в коде, для проверки совместимости JSON).

### 5.1 Heading

```ts
interface HeadingProps {
  text: string;
  tag: 'h1' | 'h2' | 'h3' | 'h4';
  align: 'left' | 'center' | 'right';
  color: string;       // hex
  fontSize: number;    // px
}
```

**Editor UI tip:** одна строка `<input>`, select для тега, select для выравнивания, number input для размера, color picker.
**Preview:** соответствующий `<h1>`-`<h4>` с inline-style.

### 5.2 Text (paragraph)

```ts
interface TextProps {
  content: string;
  align: 'left' | 'center' | 'right';
  color: string;
}
```

**Editor UI:** `<textarea rows=5>`, align select, color picker.
**Preview:** `<p>` с inline-style. _Известное ограничение:_ multi-line обрабатывается как plain text (нет inline-markup). Если нужен rich-text внутри блока — используем TipTap-режим всей страницы, либо в Phase 1 расширяем `text` до tiptap-fragment.

### 5.3 Button

```ts
interface ButtonProps {
  label: string;
  align: 'left' | 'center' | 'right';
  style: 'primary' | 'secondary' | 'outline';
  size: 'sm' | 'md' | 'lg';
}
```

**Editor UI:** input для label, селекты style/size/align.
**Preview:** `<button>` без href (в ES не было ссылки — потенциальный gap для Phase 0+: добавить `href?: string` и open-in-new-tab toggle).

### 5.4 Divider

```ts
interface DividerProps {
  lineStyle: 'solid' | 'dashed' | 'dotted';
  color: string;
  weight: number;     // px, 1-10
}
```

### 5.5 Spacer

```ts
interface SpacerProps {
  height: number;     // px, 10-500
}
```

### 5.6 Icon Box

```ts
interface IconBoxProps {
  icon: keyof typeof LucideIcons;  // строка-имя из lucide-react
  title: string;
  description: string;
  iconColor: string;
  layout: 'top' | 'left';          // иконка сверху или слева
}
```

**Editor UI:** **внимание** — в ES нет UI-выбора иконки, только текстовый input для имени. Для Phase 0 — оставить как есть (имя иконки руками), Phase 1 — icon picker grid.

### 5.7 CTA (Call to action)

```ts
interface CtaProps {
  headline: string;
  description: string;
  buttonText: string;
  align: 'left' | 'center' | 'right';
}
```

Аналогично button — нет `href`. Add in Phase 0+.

### 5.8 Image

```ts
interface ImageProps {
  url?: string;
  alt?: string;
}
```

**Editor UI:** кнопка «Выбрать из медиатеки» → `MediaPickerModal` → URL подставляется. Опционально загрузка прямо в media-library.

### 5.9 Element-level style (общий для всех блоков)

```ts
interface ElStyle {
  paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number;
  background: string;
  borderRadius: number;
  opacity: number;     // 10-100 (%)
  customCss: string;   // raw CSS, применяется inline
}
```

**Zod схемы для backend-валидации `content`:**

В backend `cms.service.ts` сейчас контент сохраняется как `jsonb` без валидации структуры. Для barbie **обязательно** в Phase 0 добавить Zod-схемы:

```ts
// packages/cms-schemas/src/sandbox.ts (новый shared пакет или просто в apps/api/src/cms/schemas/)
const ElStyleSchema = z.object({ /* ... */ });
const HeadingPropsSchema = z.object({ text: z.string().max(500), tag: z.enum(['h1','h2','h3','h4']), /*...*/ });
// ... остальные блоки
const SandboxContentSchema = z.object({
  _type: z.literal('sandbox'),
  sections: z.array(z.object({
    id: z.string(),
    padding: z.string(),
    columns: z.array(z.object({
      id: z.string(),
      span: z.number().min(1).max(12),
      elements: z.array(/* discriminated union по type */),
    })),
  })),
});
```

При сохранении страницы — `SandboxContentSchema.parse(body.content)`. Это закрывает риски XSS через `customCss` (фильтровать `expression(`, `javascript:`, `<script`) и инъекции структуры.

---

## 6. CMS-side menu редактор интеграция

**Главное меню сайта тенанта** редактируется в той же CMS-секции админки тенанта (`/dashboard/cms/menu`). Спецификация — в **`MENU-EDITOR.md`** (создаётся отдельно). Здесь — точки интеграции:

- **Таблица:** `tenant_menu_items` (схема в `DB-SCHEMA.md`):
  - `id`, `tenant_id`, `parent_id` (nullable, для иерархии), `position` (int), `label`, `url` (либо `page_id` FK на `cms_pages.id`), `target` ('_self' / '_blank'), `visible` (bool), `created_at`, `updated_at`.
- **API:**
  - `GET /cms/menu` — получить дерево меню для текущего tenant
  - `POST /cms/menu/items` — создать пункт
  - `PUT /cms/menu/items/:id` — обновить
  - `DELETE /cms/menu/items/:id`
  - `POST /cms/menu/reorder` — массовый reorder через массив `{id, parent_id, position}`
- **UI:** drag-and-drop tree editor (рекомендация: `dnd-kit/sortable`); связь с CMS pages — pulldown выбора страницы (показывает список `cms_pages` за текущий tenant).

**Bootstrap для нового тенанта:** `TenantCmsBootstrapService.seedTenant(tenantId)` создаёт 3 дефолтных пункта меню, привязанных к сидированным страницам.

---

## 7. Migrations и seed

### 7.1 Drizzle миграции

При работе по гайдрейлам ENTITY (`tenant_id` во всех таблицах с самого начала) — никаких retro-migrations не нужно. Просто:

1. Создать `packages/db/src/schema/tenants.ts` (отдельная задача — см. DB-SCHEMA.md).
2. Создать `packages/db/src/schema/cms-pages.ts` по форме из §3.2.
3. Создать `packages/db/src/schema/media.ts` по форме из §3.2.
4. `npm run db:generate` (drizzle-kit) → получить SQL.
5. `npm run db:migrate` (на dev/VPS) → применить.

### 7.2 Seed для разработки

**Скрипт:** `apps/api/src/scripts/seed-tenant.ts`

```bash
npx ts-node apps/api/src/scripts/seed-tenant.ts <slug>
# Создаёт:
#  - tenant с заданным slug (если нет)
#  - admin-юзера для tenant
#  - дефолтные design tokens (из шаблона)
#  - дефолтную главную страницу (sandbox с hero + text + cta)
#  - дефолтные пункты меню
```

**Источник дефолтного контента:** `apps/api/src/cms/seeds/default-page.json` (sandbox-структура для главной); `apps/api/src/cms/seeds/default-menu.json` (массив `{label, url}`). Хранятся в репо, версионируются.

### 7.3 Production: TenantCmsBootstrapService

При создании tenant через UI/API (предположительно `POST /platform/tenants` в Phase 0+):

```ts
// в платформенном TenantsService.create()
async create(dto: CreateTenantDto) {
  const tenant = await this.db.insert(tenants).values(dto).returning();
  await this.tenantCmsBootstrap.seedTenant(tenant[0].id);  // ← здесь
  await this.tenantDesignTokensService.applyDefaults(tenant[0].id);
  await this.tenantMenuService.seedDefaults(tenant[0].id);
  return tenant[0];
}
```

В транзакции, идемпотентно (если seedTenant вызвали повторно — он проверяет наличие страницы `slug=home` и skips).

---

## 8. Roadmap

### Phase 0 — Minimum viable CMS (1-2 спринта)

- [x] **Schema:** `cms_pages` + `media_files` с `tenant_id`, базовые индексы.
- [x] **Backend:** `CmsModule`, `MediaModule`, `StorageModule`, `TenantGuard`.
- [x] **CRUD pages:** create, list (filter type/status), get-by-id, update, delete, get-by-slug (public).
- [x] **Media upload:** presigned URL flow, confirm, list, delete.
- [x] **Frontend:** список страниц, простой block editor (hero, text, image, cta, button, divider, spacer, icon-box), media picker.
- [x] **Public render:** `/p/[slug]` с tenant resolution по subdomain.
- [x] **SEO:** meta title / description.
- [ ] **Tenant tokens application:** базовые color tokens применяются на public-страницах.
- [ ] **Bootstrap:** seed-скрипт + `TenantCmsBootstrapService`.
- [ ] **Tests:** изоляция между тенантами для каждого read endpoint.

**Out of scope в Phase 0:** TipTap editor (можно отложить, sandbox покрывает 90%), версионирование, locale switching UI.

### Phase 1 — Production-ready (3-4 спринта)

- [ ] **Версионирование:** таблица `cms_page_versions` (snapshot `content + status + meta`); auto-snapshot при каждом save; UI «История» с rollback.
- [ ] **Drafts vs Published:** разделение published-копии от рабочей; preview всегда показывает draft, public — published.
- [ ] **Locale switching:** UI переключателя ru/en в редакторе, отдельная запись `cms_pages` per locale, fallback по `(tenant_id, slug, 'ru')` если en не существует.
- [ ] **TipTap editor:** перенести из ES для типа `post` (статьи блога).
- [ ] **Media library:** `/dashboard/cms/media` — grid, фильтры, метаданные, bulk delete.
- [ ] **Block extensions:** `gallery` (массив image), `columns` (вложенные секции), `embed` (YouTube/Vimeo), `html` (raw, admin-only с sanitize).
- [ ] **Zod validation** структуры `content` на backend.
- [ ] **Menu editor:** drag-drop tree, см. MENU-EDITOR.md.

### Phase 2 — Advanced

- [ ] **A/B testing:** два варианта content на странице, weight, метрика конверсии.
- [ ] **Scheduled publish:** `publishAt: timestamp` future, cron-задача публикует.
- [ ] **Multi-language UI:** не только locale контента, но и интерфейс админки на en.
- [ ] **Workflow / approval:** для tenant с несколькими редакторами — статусы `in-review`, approver role.
- [ ] **Custom blocks per tenant:** registry блоков, tenant может добавить свой через config (без кода).
- [ ] **CDN integration:** Cloudflare image resize / WebP auto-conversion на CDN-уровне.

---

## 9. Open questions

Вопросы, которые требуют решения с пользователем до старта Phase 0 импорта:

1. **Tenant resolution стратегия:**
   - Subdomain (`salon-1.barbie.app`) или path-based (`barbie.app/t/salon-1/...`)?
   - Если subdomain — нужен wildcard SSL + DNS-конфигурация на VPS.
   - Решение влияет на `app/p/[slug]` (как резолвить host).

2. **Slug uniqueness политика:**
   - Утверждено выше: `(tenant_id, slug, locale) UNIQUE`. Это значит, что у двух тенантов могут быть страницы с одинаковым slug `/p/home` — разруливается через subdomain. Подтвердить.

3. **Роли в admin:**
   - В ES — `ADMIN`, `MANAGER`. В barbie ENTITY заявлены `platform-admin`, `tenant-admin`, `salon-manager`, `master`, `client`. Кто может редактировать CMS? Предложение: `tenant-admin` + опционально `salon-manager` (с per-tenant scope). Подтвердить.

4. **TipTap в Phase 0 или отложить:**
   - В ES оба редактора сосуществуют. В barbie/SITE1 (CRM спа-салонов) — кому нужен TipTap? Если у тенантов будет блог — да, в Phase 1. Если только страницы — можно вовсе не переносить TipTap и Sandbox использовать для всего. Решить.

5. **Media для блог-постов vs страниц:**
   - В ES `media_files.modelId` привязывает фото к модели. В barbie этого нет; нужен ли вообще `entityId` (привязка медиафайла к странице/посту, чтобы при удалении страницы можно было каскадно почистить ассеты)? Предложение: добавить опциональные `entity_type` ('cms_page' | 'menu_item' | null) и `entity_id` для подобной связи. Решить, нужно ли.

6. **Storage bucket стратегия:**
   - Один bucket `barbie-media` с префиксами `tenant/{id}/...` — проще, дешевле в плане лимитов.
   - Бакет-per-tenant — сложнее, но даёт изоляцию IAM-политик. Для Phase 0 — один bucket с префиксами. Подтвердить.

7. **Удаление страниц — soft vs hard:**
   - ES: hard delete (`status: 'trash'` есть, но DELETE удаляет физически). В barbie для безопасности предлагается soft delete (`status: 'trash'` + период удержания 30 дней, cron физически чистит). Решить.

8. **Block `customCss` sanitization:**
   - В ES `customCss` применяется inline без фильтрации (XSS risk при админ-аккаунте с компрометацией). Для barbie — sanitize через `DOMPurify`-аналог для CSS (whitelist свойств: `color`, `background*`, `margin*`, `padding*`, `font-*`, `border*`, `text-*`, `display`, `flex*`, `grid*`, `width`, `height`, `max-*`, `min-*`, `opacity`, `transform`, `transition`, `box-shadow`, `border-radius`). Подтвердить список.

9. **Sandbox JSON migrations:**
   - Если в Phase 1 изменим структуру блоков (например, добавим `href` в Button) — как обрабатывать старый сохранённый контент? Предложение: версия в content (`_version: 1`), миграционные функции `migrateV1ToV2`. Решить, добавить ли поле сразу в Phase 0.

10. **Performance кэш для public-страниц:**
    - SSR `/p/[slug]` сейчас `cache: 'no-store'` — каждый запрос дёргает API. В barbie с multi-tenant нагрузкой это плохо. Предложение: Redis-кэш с инвалидацией при publish (event-driven через `tenants:{id}:pages:{slug}` key, TTL 1h fallback). Подтвердить или отложить в Phase 1.

---

## 10. Сводка по объёму работ

| Категория | Файлов | LOC (ES) | Действие |
|-----------|--------|----------|----------|
| Backend 1:1 (с минимальной правкой imports) | 2 | ~28 | `cms.module.ts`, `media.module.ts` |
| Backend adapt | 6 | ~750 | `cms.controller`, `cms.service`, `media.controller`, `media.service`, `minio.service` (relocate), endpoints из profiles.controller |
| Backend new | 6 | — | tenant guard/decorator/als, dto, seed service, storage module |
| Schema adapt | 2 | ~115 | `cms-pages.ts`, `media.ts` |
| Schema new | 3 | — | `tenants.ts`, `tenant-design-tokens.ts`, `tenant-menu-items.ts`, (Phase 1) `cms-page-versions.ts`  |
| Frontend 1:1 | 6 | ~1370 | SandboxEditor, SandboxRenderer, TipTapEditor, pages/new wrappers, lib/tiptap-to-html, page list (с минор правками тем) |
| Frontend adapt | 5 | ~1170 | CmsPageEditor (убрать luxury тему), `/p/[slug]`, `/p/preview/[id]`, MediaPickerModal, TipTapToolbar |
| Frontend new | 3 | — | menu editor, media library (заменить эскорт-версию), `lib/tenant-context.ts` |

**Итого ES-файлов проанализировано:** 19 (включая ENTITY.md barbie для контекста — 20).

- **1:1 (с минимальной правкой imports):** 8 файлов
- **adapt:** 13 файлов
- **new (без ES-аналога):** ~12 файлов

---

## 11. История документа

- **2026-05-16** — создан. Источник: чтение всех CMS-связанных файлов в `F:\Users\a\Documents\_DEV\Tran\ES\` (api/cms, api/media, packages/db/src/schema, apps/web/components/cms, apps/web/app/dashboard/pages, apps/web/app/p). Не модифицировались никакие ES-файлы.
