# Menu Editor — мультитенантная навигация сайта

Документ описывает редактор главного меню сайта тенанта: выбор одного из трёх темплейтов навигации и редактирование пунктов меню из CRM-админки. Привязан к HTML-прототипам в `SITE1/menu-templates/{top-classic,mega-images,vertical-side}/index.html`.

---

## 1. Цель

Tenant-admin (роль `tenant-admin` / `salon-manager`) в CRM-админке:

1. Выбирает один из трёх темплейтов главной навигации сайта своего салона.
2. Редактирует пункты меню (добавить / переименовать / переставить / удалить / вложить).
3. Видит превью изменений в новой вкладке (`/preview/<tenant-slug>`).
4. Сохраняет в draft и публикует одной кнопкой.

Конечный пользователь (клиент салона) попадает на публичный сайт `https://<tenant-slug>.escort-spa.app/` или на custom domain — сервер рендерит выбранный темплейт со списком пунктов тенанта.

---

## 2. Дата-модель (Drizzle, PostgreSQL)

### 2.1 Расширение `tenant_design_tokens`

```ts
// packages/db/src/schema/tenant-design-tokens.ts
export const navTemplateEnum = pgEnum('nav_template', [
  'top-classic',
  'mega-images',
  'vertical-side',
]);

export const tenantDesignTokens = pgTable('tenant_design_tokens', {
  tenantId:    uuid('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  navTemplate: navTemplateEnum('nav_template').notNull().default('top-classic'),
  // ... остальные токены (цвета, шрифты) — отдельный набор полей
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 2.2 Таблица `tenant_menu_items`

```ts
// packages/db/src/schema/tenant-menu-items.ts
export const tenantMenuItems = pgTable('tenant_menu_items', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  parentId:    uuid('parent_id').references((): AnyPgColumn => tenantMenuItems.id, { onDelete: 'cascade' }),
  label:       varchar('label', { length: 60 }).notNull(),
  href:        varchar('href', { length: 500 }).notNull(),
  sortOrder:   integer('sort_order').notNull().default(0),
  imageKey:    varchar('image_key', { length: 200 }),  // S3/MinIO ключ превью (только для mega-images)
  icon:        varchar('icon', { length: 60 }),        // имя SVG-иконки из реестра (только для vertical-side)
  description: varchar('description', { length: 160 }),// краткое описание (только для mega-images)
  isCta:       boolean('is_cta').notNull().default(false), // выделенная кнопка в top-classic
  locale:      varchar('locale', { length: 8 }).notNull().default('ru'),
  payload:     jsonb('payload').$type<MenuItemPayload>().notNull().default({}),
  status:      varchar('status', { length: 16 }).notNull().default('draft'), // 'draft' | 'published'
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uqOrder:    unique('uq_menu_order').on(t.tenantId, t.parentId, t.sortOrder, t.locale),
  ixTenant:   index('ix_menu_tenant').on(t.tenantId, t.parentId, t.sortOrder),
  ixLocale:   index('ix_menu_locale').on(t.tenantId, t.locale, t.status),
}));

type MenuItemPayload = {
  // template-specific дополнительные поля (badge, featured flag, target=_blank, etc.)
  badge?:    string;
  featured?: boolean;
  target?:   '_self' | '_blank';
};
```

### 2.3 Constraints / индексы

- `UNIQUE (tenant_id, parent_id, sort_order, locale)` — нельзя иметь два пункта с одним порядком у одного родителя в одном языке.
- `FK parent_id → tenant_menu_items.id ON DELETE CASCADE` — удаление родителя каскадно удаляет children.
- `INDEX (tenant_id, parent_id, sort_order)` — основное чтение при рендеринге.
- `INDEX (tenant_id, locale, status)` — фильтрация по локали и черновикам.
- DB-level check: `nesting depth ≤ 2` поддерживается в сервисе, не в SQL (рекурсивный CTE при insert/update).

---

## 3. CRM UI (редактор)

Страница: `/cms/site/menu` (в Next.js admin app).

### 3.1 Лейаут (split-view)

```
┌────────────────────────────────────────────────────────────────────┐
│  Top bar                                                           │
│  [ top-classic ▣ ] [ mega-images □ ] [ vertical-side □ ]           │
│                                  [Preview ↗]  [Save Draft] [Publish]│
├──────────────────────────┬─────────────────────────────────────────┤
│ Tree (drag-drop)         │ Form (selected item)                    │
│                          │                                         │
│ ▾ Главная                │ Label:        [Услуги         ]         │
│ ▾ Услуги (3)             │ Href:         [/services      ]         │
│   ▸ Для лица             │ Icon:         [scissors ▾]              │
│   ▸ Для тела             │ Image:        [Upload preview...]       │
│   ▸ Ритуалы              │ Description:  [—                ]       │
│ ▾ Мастера                │ CTA-кнопка:   [ ]                       │
│   О нас                  │ Target:       (•) Same  ( ) New tab     │
│   Контакты               │ Locale:       [RU ▾]                    │
│ + Add item               │ ─────────────────────────────────────── │
│                          │             [Delete]  [Save]            │
└──────────────────────────┴─────────────────────────────────────────┘
```

### 3.2 Top bar

- Три карточки с превью темплейтов (180×120 px скриншот / CSS-art). Активная — с акцентным border. Клик переключает `nav_template` (с подтверждением «У темплейтов разные доступные поля — данные сохранятся, но некоторые поля будут скрыты»).
- Кнопка `Preview ↗` — открывает `/preview/<tenant-slug>?draft=1` в новой вкладке (использует draft-snapshot).
- `Save Draft` / `Publish` — две раздельные кнопки. Publish атомарно копирует draft → published.

### 3.3 Левая панель (дерево)

- Drag-and-drop reorder + nesting (max depth 2).
- Визуальные guidelines: пунктирная линия при перетаскивании, индикатор «Cannot nest deeper».
- Контекстное меню: Duplicate, Delete, Convert to CTA (только top-classic).
- Tooltip при hover: показывает href и количество детей.

### 3.4 Правая панель (форма)

Поля видимы в зависимости от темплейта:

| Поле          | top-classic | mega-images           | vertical-side |
|---------------|-------------|------------------------|---------------|
| `label`       | yes         | yes                   | yes           |
| `href`        | yes         | yes                   | yes           |
| `icon`        | no          | no                    | yes (required)|
| `imageKey`    | no          | yes (только у root с children) | no            |
| `description` | no          | yes (для child-items) | no            |
| `isCta`       | yes (max 1) | no                    | no            |
| `payload.badge`| no         | yes                   | yes           |
| `payload.target`| yes       | yes                   | yes           |

- Icon picker: модальное окно с 32 иконками из реестра (lucide-react subset).
- Image upload: drag-drop, превью 60×60, через `POST /uploads/menu-image`, сохраняет `imageKey`.
- Validation inline (на blur), с подсветкой ошибок.

### 3.5 Статусы

- `draft` — текущая редактируемая версия (отображается в CRM).
- `published` — опубликованная версия (отображается на сайте).
- Кнопка `Publish` копирует все draft-items → published; deletes published-items, у которых нет draft-аналога.

---

## 4. API endpoints (NestJS / контракты)

Все endpoints под `/api/cms/*`, защищены `JwtAuthGuard + TenantGuard + RolesGuard(['tenant-admin','salon-manager'])`.

### 4.1 Шаблон навигации

```
GET    /api/cms/menu
       Response: { template: 'top-classic'|'mega-images'|'vertical-side',
                   items: MenuItemTree[],          // draft, иерархия с children
                   publishedAt: ISO | null }

PUT    /api/cms/menu/template
       Body:     { template: 'mega-images' }
       Response: { template, updatedAt }
```

### 4.2 CRUD пунктов меню

```
POST   /api/cms/menu/items
       Body:     { parentId: uuid | null,
                   label: string,
                   href: string,
                   icon?: string,
                   imageKey?: string,
                   description?: string,
                   isCta?: boolean,
                   locale?: 'ru'|'en' = 'ru',
                   payload?: object }
       Response: MenuItem (with sortOrder appended to end)

PATCH  /api/cms/menu/items/:id
       Body:     Partial<MenuItem>
       Response: MenuItem

DELETE /api/cms/menu/items/:id
       Effect:   каскадно удаляет все children
       Response: { deletedIds: uuid[] }
```

### 4.3 Перестановка (drag-and-drop)

```
POST   /api/cms/menu/reorder
       Body:     { changes: [{ id: uuid, parentId: uuid|null, sortOrder: number }, ...] }
       Effect:   атомарно применяет в одной транзакции; пересчитывает sortOrder
                 у соседей при коллизии
       Response: { items: MenuItemTree[] }
       Validation: depth ≤ 2, top-level ≤ 8
```

### 4.4 Publish workflow

```
POST   /api/cms/menu/publish
       Body:     {}
       Effect:   копирует все draft items → published; удаляет осиротевшие published
       Response: { publishedAt: ISO, publishedCount: number }

POST   /api/cms/menu/revert
       Body:     {}
       Effect:   откатывает draft к последнему published-снимку
       Response: MenuItemTree[]
```

### 4.5 Публичный read-only endpoint (для рендеринга сайта)

```
GET    /api/public/tenants/:slug/menu?locale=ru
       Cache:    Cache-Control: s-maxage=60, stale-while-revalidate=300
       Response: { template, items: MenuItemTree[] }   // только status='published'
       Guard:    нет (public)
```

---

## 5. Frontend рендеринг на сайте тенанта

### 5.1 Архитектура

- Сайт тенанта живёт в `apps/web/app/(site)/[locale]/...` (Next.js App Router).
- `app/(site)/[locale]/layout.tsx` — Server Component:
  1. Резолвит tenant по hostname → `tenantId`.
  2. Параллельно запрашивает:
     - `GET /api/public/tenants/<slug>/menu?locale=<locale>` → `{ template, items }`
     - `GET /api/public/tenants/<slug>/design-tokens` → CSS-переменные
  3. Эмитит inline `<style>:root { --bg: ...; --accent: ... }</style>` для tenant-токенов.
  4. Подгружает один из трёх компонентов через dynamic import (code-split):

```tsx
const NavComponent = {
  'top-classic':  dynamic(() => import('@/components/site-nav/TopClassicMenu')),
  'mega-images':  dynamic(() => import('@/components/site-nav/MegaImagesMenu')),
  'vertical-side':dynamic(() => import('@/components/site-nav/VerticalSideMenu')),
}[template];
```

### 5.2 React-компоненты

Все три компонента имеют единый prop-интерфейс:

```ts
interface SiteNavProps {
  brand:    { name: string; subline?: string; markText: string };
  items:    MenuItemTree[];
  cta?:     { label: string; href: string };
  locale:   'ru' | 'en';
  phone?:   string;
  socials?: { telegram?: string; instagram?: string; whatsapp?: string };
}
```

- `TopClassicMenu` — копия `top-classic/index.html`, портированная на JSX + CSS Modules.
- `MegaImagesMenu` — копия `mega-images/index.html` с `<MegaPanel>` под-компонентом для каждой колонки.
- `VerticalSideMenu` — копия `vertical-side/index.html`; принимает `children` для основного контента справа.

### 5.3 Локали

- URL-сегмент `/[locale]/...` → `locale: 'ru' | 'en'`.
- Default locale = `ru` (можно override per-tenant в `tenant_design_tokens.default_locale`).
- Items фильтруются на сервере по `locale`. Fallback: если items для запрошенной локали нет — отдаём `ru`.

---

## 6. Tenant guard и ABAC

### 6.1 Защита CRM endpoints

```ts
@Controller('cms/menu')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('tenant-admin', 'salon-manager')
export class CmsMenuController { ... }
```

- `TenantGuard` извлекает `tenantId` из JWT (`req.user.tenantId`) и инжектит в request scope.
- Все запросы к БД фильтруются по `tenantId` (никаких cross-tenant утечек).
- `master` и `client` роли **не имеют доступа** к этому контроллеру.

### 6.2 Публичный API

- `/api/public/tenants/:slug/menu` — без auth, но:
  - Резолвит `slug → tenantId` через middleware.
  - Возвращает только `status='published'`.
  - Rate-limited: 60 req/min/IP.

---

## 7. Validation

Все правила — на уровне DTO (`class-validator`) + дополнительно сервисный слой.

### 7.1 Поля

| Поле          | Правило                                                                                  |
|---------------|------------------------------------------------------------------------------------------|
| `label`       | `IsString, MinLength(1), MaxLength(60)` — не пустое, без leading/trailing whitespace      |
| `href`        | Регекс: `^(\/[^\s]*|https?:\/\/[^\s]+|mailto:.+|tel:.+)$` — внутренний путь или абсолют   |
| `icon`        | Один из реестра `MENU_ICON_REGISTRY` (32 значения). Required для `vertical-side`         |
| `imageKey`    | S3/MinIO ключ. Разрешён ТОЛЬКО когда `template === 'mega-images'` и у item есть children |
| `description` | `MaxLength(160)`. Видим только в `mega-images`                                           |
| `isCta`       | bool. Максимум 1 `isCta=true` на tenant + locale (проверка в сервисе)                    |
| `locale`      | enum `['ru','en']`                                                                        |
| `parentId`    | uuid, должен принадлежать тому же tenantId; nesting depth ≤ 2                            |
| `sortOrder`   | integer ≥ 0                                                                              |
| `payload.badge` | `MaxLength(20)`                                                                        |
| `payload.target`| enum `['_self','_blank']`                                                              |

### 7.2 Бизнес-правила

- **max nesting depth = 2** (parent + child). Попытка вложить grandchild → `400 BadRequestException('Max nesting depth is 2')`.
- **max top-level items = 8** на (tenantId, locale). Девятый item → `409 ConflictException`.
- **max children per parent = 12** (UX-soft-limit для mega-menu). Превышение → warning в UI, но не блок.
- При смене `template` на `top-classic` или `vertical-side`: если у tenant есть items с `imageKey` или `description` → значения остаются в БД, но не рендерятся. Edit-форма скрывает поля.
- При смене на `vertical-side` без `icon` у items → автоматически назначается `icon='default'`.

### 7.3 Reorder validation

- Atomically check: после применения `changes` нет дубликатов `(tenantId, parentId, sortOrder, locale)`.
- Если valid → commit; иначе rollback и `409 ConflictException('Reorder collision')`.

---

## 8. Edge cases / Open questions

- **Drag-and-drop библиотека**: `@dnd-kit/core` + `@dnd-kit/sortable` (рекомендуется) vs встроенный handler через `pointerdown` + `pointermove`. Default — `@dnd-kit` (a11y, touch, nested-collision).
- **Caching public endpoint**: 60s s-maxage + tag-based revalidation через `revalidateTag('menu:'+tenantId)` при publish.
- **Real-time preview**: можно ли отправлять draft напрямую в preview-вкладку через postMessage, минуя БД? Решение: пока нет — preview берёт draft из БД (свежесть ≤ 1s).
- **i18n labels для UI редактора**: ключи в `apps/web/i18n/locales/{ru,en}/cms-menu.json`.
- **Reset to template defaults**: при первом выборе темплейта тенант получает дефолтный набор из 5–6 пунктов (seeded). Если тенант удалил все items — кнопка `Reset to defaults`.

---

## 9. Связь с HTML-прототипами

| Темплейт         | Прототип                                                  |
|------------------|-----------------------------------------------------------|
| `top-classic`    | `SITE1/menu-templates/top-classic/index.html`             |
| `mega-images`    | `SITE1/menu-templates/mega-images/index.html`             |
| `vertical-side`  | `SITE1/menu-templates/vertical-side/index.html`           |

CSS-переменные в прототипах (`--bg`, `--text`, `--surface`, `--surface-2`, `--border`, `--accent`, `--accent-soft`, `--head-font`, `--body-font`) — это и есть контракт с `tenant_design_tokens`: при портировании в React компоненты значения переменных эмитятся через inline `<style>:root{...}</style>` в layout.
