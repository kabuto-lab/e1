# SESSION LOG

## 2026-05-16 · 15:00–17:30 MSK · AVTONOM

**Plan:** `NON_PROJECT/session-plans/2026-05-16-1500-AVTONOM.md`
**Workspace:** `F:\Users\a\Documents\_DEV\Tran\ES\barbie\`
**Phase:** `barbie-multi-tenant · bootstrap-foundation` (TLA Level 1 + 2)
**Spine status:** clean (никаких spine-файлов не тронуто и не создано)

---

### Executive summary

Запрос: «AVTONOM: начать разрабатывать мульти-теннантную систему методом TLA, опираясь на контент 10 прототипов, интегрировать CMS из ES. Также 3 темплейта главного меню + редактирование из CRM.»

Поскольку Level 3 (имплементация по файлам) требует per-file approval, в эту сессию выполнен **TLA Level 1 (стратегия)** и **Level 2 (архитектура + схема)** — фундамент, который человек сможет ревьюить целиком, и от которого далее идти к коду по согласованию.

**Что выпущено:**
- 4 архитектурных документа (multi-tenant, DB-schema, RBAC, CMS-port)
- 3 HTML-темплейта главного меню + спецификация редактора
- 1 файл реального контента 10 тенантов (для будущих seed'ов)
- 1 session-plan

### Artifacts

| Артефакт | Путь | Строк |
|----------|------|-------|
| Session plan | `NON_PROJECT/session-plans/2026-05-16-1500-AVTONOM.md` | ~110 |
| Real content of 10 tenants | `barbie/SITE1/data/tenants-real-content.json` | (38 programs, 40 rooms, 53 staff) |
| Multi-tenant architecture | `barbie/SITE1/docs/ARCHITECTURE.md` | 14 sections |
| DB schema (21 tables) | `barbie/SITE1/docs/DB-SCHEMA.md` | 17 P0 + 4 P1 |
| RBAC matrix (5 roles) | `barbie/SITE1/docs/ROLES-RBAC.md` | full matrix |
| CMS port plan (19 ES files) | `barbie/SITE1/docs/CMS-INTEGRATION.md` | 647 |
| Menu editor spec | `barbie/SITE1/docs/MENU-EDITOR.md` | 353 |
| Menu template: top-classic | `barbie/SITE1/menu-templates/top-classic/index.html` | 545 |
| Menu template: mega-images | `barbie/SITE1/menu-templates/mega-images/index.html` | 837 |
| Menu template: vertical-side | `barbie/SITE1/menu-templates/vertical-side/index.html` | 628 |

**Total new content:** ~3000 строк HTML/CSS/JS + ~2000 строк markdown + 1 JSON.

### AI-Default решения (зафиксированы и применены)

| # | Решение | Где зафиксировано |
|---|---------|-------------------|
| AI-Default-1 | TLA-режим = Level 1 + Level 2. Level 3 откладывается. | session-plan, этот лог |
| AI-Default-2 | Резолвинг тенанта — subdomain-based + fallback на `X-Tenant-Domain`. | `ARCHITECTURE.md §2` |
| AI-Default-3 | Tenant ID = UUID v7 (хроносортируемый). | `DB-SCHEMA.md §1` |
| AI-Default-4 | CMS-порт = прямой форк из ES с tenant-context адаптацией. | `CMS-INTEGRATION.md §3` |
| AI-Default-5 | Subscriptions/ и payments/ — раздельные модули. | `ARCHITECTURE.md §10` |
| AI-Default-6 | Деньги — BigInt копейки + value object `Money`. | `DB-SCHEMA.md §6` |
| AI-Default-7 | Все таблицы — `tenant_id NOT NULL` (кроме `tenants`, `platform_admins`, `audit_log_platform`, `subscription_plans`). | `DB-SCHEMA.md` |
| AI-Default-8 | Postgres RLS — не используем в Phase 0; defence-in-depth через guard + drizzle-helper + NOT NULL. | `ARCHITECTURE.md §4` |
| AI-Default-9 | Прототипы и mock-CRM сохраняются как design reference. | session-plan |
| AI-Default-10 | DnD библиотека для menu-editor = `@dnd-kit/core` + `/sortable`. | `MENU-EDITOR.md` |
| AI-Default-11 | Real-time preview меню = draft-через-БД (≤1s свежесть), не postMessage. | `MENU-EDITOR.md` |
| AI-Default-12 | i18n fallback для menu — на `ru` (главная локаль). | `MENU-EDITOR.md` |

### Skip log (spine-touch)

**Нет.** Ни один spine-файл не был тронут или создан.

Что НЕ создавали (отложено до Level 3 / явного одобрения):
- `packages/db/src/schema/*.ts` (фактическая Drizzle-схема)
- `apps/api/src/app.module.ts`
- `apps/api/src/<module>/<module>.module.ts` (TenantContextModule, CmsModule, MediaModule, MenuModule)
- `apps/api/src/<module>/<module>.controller.ts`, `<module>.service.ts`
- `apps/web/src/...` (страницы и компоненты CRM-админки)
- `docker-compose.dev.yml`, `.env.example`
- `ecosystem.config.cjs`

### Open questions (требуют решения пользователя перед Level 3)

Сводно из всех 4 агентов:

**Архитектура и стек:**
1. Reserved slug list для тенантов — финализировать (`www`, `api`, `admin`, `app`, `cdn`, `mail`, `crm`, `platform` — стартовый список) — *ARCHITECTURE §14.3*
2. Punycode/IDN slugs — ASCII-only в Phase 0, IDN позже? — *ARCHITECTURE §14.1*
3. Tenant data export для GDPR — JSON vs CSV per-table? — *ARCHITECTURE §14.4*
4. Backup granularity — pg_dump full-DB достаточно для MVP, без per-tenant restore? — *ARCHITECTURE §14.5*

**База данных:**
5. `appointments` overlap protection — GIST exclusion constraint в Phase 0 или app-level lock до Phase 1? Дефолт выбран: app-level. — *DB-SCHEMA §6.1*
6. Multi-currency в Phase 0 — колонка `currency` во всех money-таблицах хотя пока только RUB? — *DB-SCHEMA §6.4*
7. `media.sha256` — nullable или required? — *DB-SCHEMA §6.3*
8. `platform-support` read-only роль — добавить в Phase 1 RBAC? — *DB-SCHEMA §1.5*

**Роли:**
9. Multi-role per tenant — разрешить `tenant-admin` + `master` одновременно на одном user, или строго одна роль? Дефолт: строго одна. — *ROLES-RBAC §10.1*
10. Impersonation hard cap — 240 минут устраивает? — *ROLES-RBAC §10.4*

**CMS (из ES):**
11. ES CMS использует гибрид TipTap (WYSIWYG) + Sandbox (блочный) — копировать оба или унифицировать в один? — *CMS-INTEGRATION §3*
12. Sandbox кнопки и CTA не имеют `href` — добавить в Phase 0? — *CMS-INTEGRATION*
13. Media-логика разорвана между `media/` и `profiles/minio.service.ts` в ES — консолидировать при порте? — *CMS-INTEGRATION*
14. `customCss` в Sandbox применяется inline без sanitize — добавить DOMPurify-like sanitizer? — *CMS-INTEGRATION*
15. Slug uniqueness — глобальная (ES) или per-tenant `(tenant_id, slug, locale)`? Дефолт: per-tenant. — *CMS-INTEGRATION*
16. Block types в Phase 0 — какой минимум (hero/text/image/cta)? — *CMS-INTEGRATION*
17. `content` jsonb валидация — Zod-схема для каждого block type — приоритет в Phase 0? — *CMS-INTEGRATION*
18. Soft-delete vs status enum в CMS — отказаться от soft-delete полностью? — *CMS-INTEGRATION*
19. Performance cache (Redis) — нужен в Phase 0 или Phase 1? — *CMS-INTEGRATION*
20. Page versioning — Phase 0 или Phase 1? — *CMS-INTEGRATION*

**Меню:**
21. Real-time preview через postMessage vs draft-через-БД — текущий дефолт draft-через-БД (≤1s) устраивает? — *MENU-EDITOR*
22. Reset-to-defaults пункты меню при первом выборе темплёта — продуктовый дизайн дефолтов? — *MENU-EDITOR*

### Recommended next steps

**Сессия 2 (TLA Level 3 — реальная имплементация, по одному файлу за раз, с per-file согласованием):**

Предлагаемый порядок (от фундамента к коже):
1. **Bootstrap monorepo:** `barbie/SITE1/package.json`, `tsconfig.json`, `turbo.json` (или `npm workspaces`), `barbie/SITE1/.env.example` *(spine — нужно явное «ок»)*
2. **Docker:** `barbie/SITE1/docker-compose.dev.yml` *(spine)* — Postgres, Redis, MinIO на портах 5442/6389/9011-9012 (согласованы в ENTITY §5)
3. **DB пакет:** `packages/db/package.json`, `drizzle.config.ts`, затем по одной таблице в `schema/*.ts` *(каждый файл spine)* в порядке: tenants → tenant_design_tokens → users → platform_admins → tenant_users → salons → services → staff + M2M → clients → appointments → sessions → audit × 2 → media → cms_pages → tenant_menu_items
4. **API скелет:** `apps/api/package.json`, `tsconfig.json`, `src/main.ts`, `src/app.module.ts` *(spine)*, базовые модули: TenantContextModule (ALS) → TenantGuard → AuthModule (JWT) → TenantsModule (CRUD)
5. **Web скелет:** `apps/web/package.json`, `next.config.js`, `app/layout.tsx`, базовый admin shell

После 1-3 ответом на 20+ open questions станет проще — много вопросов «висят» на конкретных решениях, которые проще принять, когда руки в коде.

**Параллельно (без блокировок):**
- Менять `dashboard-2077.html` на API-driven (после API скелета) — переключатель тенантов начнёт реально менять данные дашборда
- Перенести 10 прототипов в `apps/web/app/(public)/[tenant]/page.tsx` с tenant-aware рендером (после CMS-порта)

### Git

- **Local commit:** будет создан в этой сессии с трейлером `AI-Assisted: Claude Code`
- **Push:** только пользователь (правило AVTONOM)

---

*Документ сохранён в корне репо `F:\Users\a\Documents\_DEV\Tran\ES\SESSION_LOG.md` — append-only для будущих сессий.*
