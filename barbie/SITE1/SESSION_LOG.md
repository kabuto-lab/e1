
---

## 2026-06-08 · PLANOID (epic) · Точки касания: дека-редактор → БД → публичный сайт

**Запрос:** заполнить 7 кнопок деки `/admin/projects` ссылками; клик по кнопке (напр. popup) → попап-редактор с полями текст/картинка/ссылка; сохранил в деке → на сайте появляется попап. Оператор ратифицировал: **новая таблица (spine-OK)**, картинка → **MinIO-upload**, пилот публичного рендера → **salonmassage**.

**Сделано (эпик, 6 частей):**

1. **Схема + миграция (SPINE, OK получен):** `packages/db/src/schema/tenant-touchpoints.ts` — таблица `tenant_touchpoints` (id, tenant_id FK cascade, key∈7 CHECK, enabled, label, value, image_key, ts). Зарегистрирована в `schema/index.ts`. Миграция `0006_lovely_doctor_faustus.sql` (forward-only) сгенерирована drizzle-kit и применена. Только новая таблица — без дрифта.
2. **API (piggyback на TenantsModule — без касания app.module.ts):**
   - `MediaService.uploadForTenant(file, tenantId, module)` (platform-scoped upload, без TenantContext) + `publicUrlForKey()`.
   - `TenantsService`: `getTouchpointsBySlug` (все 7 с дефолтами), `upsertTouchpointBySlug` (ON CONFLICT tenant_id,key), `uploadTouchpointImageBySlug`, `getPublicTouchpointsBySlug` (enabled, active-only). Валидация ключа по `TOUCHPOINT_KEYS`.
   - `TenantsController`: `GET/PATCH /v1/platform/tenants/:slug/touchpoints[/:key]` + `POST :slug/touchpoints/:key/image` (multipart). `PublicTenantsController`: `GET by-slug/:slug/touchpoints`.
   - DTO `dto/touchpoint.dto.ts`. Дымовой тест: GET 7 дефолтов ✓, PATCH upsert ✓, invalid key→400 ✓, public enabled-only ✓.
3. **Редактор деки:** `lib/tenants-touchpoints-api.ts` (клиент + `tenantSlugFromDomain`). `SalonColumn.tsx` — точки касания переведены с localStorage на API (GET on mount, PATCH on blur/toggle), добавлено **поле «Картинка»** (upload → MinIO через `POST …/image`, превью, удаление). Slug выводится из `project.domain` (дековые `project.id` ≠ slug, а domain совпадает со slug во всех 13 тенантах).
4. **Пред-заполнение:** `seed-touchpoints.sql` (идемпотентный, не миграция) — 46 точек по 12 тенантам из headless-рендер-скана (`touchpoints-render.json`); imperiumspa — полный набор из 7.
5. **Публичный рендер (пилот salonmassage = роут imperiumspa):** `lib/public-touchpoints-api.ts` (server fetch + `touchpointHref` нормализация @→t.me, телефон→tel). `SmTouchpoints.tsx` (client: попап картинка+текст+CTA с задержкой/sessionStorage + плавающий кластер call/telegram/operator). `SalonMassageHome.tsx` — фетч точек, booking-CTA из конфига, монтаж `SmTouchpoints`, footer-CTA. (`massazh-dlya-par` рендерится через `TenantSiteShell`, не salonmassage — вне пилота.)
6. **Верификация:** api+web typecheck exit 0; kernel-гейты `check:tenant-coverage` (0 failures) и `db:check-state` (coherent) зелёные; SSR `/imperiumspa` содержит `tel:+74958372246`, `t.me/Imperium_spa5`, `wa.me/79168657931`, footer `imperiumspa.ru/contacts`. Цикл «дека PATCH → БД → публичный сайт» рабочий.

**AI-Default решения:**
- **Piggyback на TenantsController/Service** вместо отдельного `TouchpointsModule` — чтобы НЕ трогать spine-файл `app.module.ts`. Связность чуть выше, но 0 лишних spine-касаний.
- **Slug из `project.domain`** (снятие TLD), т.к. хардкод `project.id` в `projects-data.ts` не везде == slug тенанта.
- **Картинка → `module='tenant'`** в media (нет enum-значения 'touchpoint'; не расширял media-DTO).
- **Пилот — только imperiumspa** (massazh-dlya-par оказался на другом рендер-пути `TenantSiteShell`).

**НЕ сделано / follow-up:**
- Unit-тесты на touchpoints (tenant-isolation spec по образцу chat) — отложено.
- Размножение публичного рендера на vanilia/nebesa/roxy/pentagon + `TenantSiteShell` (massazh) — следующий шаг.
- `/admin/media` как полноценный пикер (сейчас upload точечный из поповера).
- git-коммит — `git` отсутствует на машине; изменения в рабочем дереве, **коммит за оператором**. Push/deploy не делал.

**Spine:** `tenant_touchpoints` schema + migration 0006 — **с явным OK оператора**. `app.module.ts`/`ENTITY`/`CLAUDE`/`DESIGN` не трогал.

**Артефакты:** `touchpoints-map.html`, `touchpoints-render.json`, `scan-touchpoints.mjs`, `seed-touchpoints.sql`.

### Догон-2 (та же сессия): цвет точек, чистка виджетов, единый FAB, тенант barbiespa

- **Цвет кнопки (per-touchpoint):** миграция `0007` (`tenant_touchpoints.color`), проведён через DTO/service/фронт-клиент; в поповере деки — `<input type=color>` + сброс. На сайте кнопки = `color ?? site-accent` (accent задаётся per-шаблон: vanilia gold, nebesa sky, roxy cyan, pentagon red, barbiespa pink).
- **Убраны легаси плавающие виджеты** (накладывались на новый): `.chat` (vanilia), `.chat-wrap` (nebesa), `.fab` (roxy), `.wa` (pentagon) + мёртвые vars (`tipOpen`, `WA`).
- **Иконки:** emoji (☎/✈/💬) → чистые inline-SVG (телефон / телеграм-самолётик / чат).
- **Единый floating-виджет** (запрос оператора): был стек из 3 кружков → стал **одна кнопка-триггер**, по клику раскрывающая enabled-мессенджеры (callWidget/telegram/operator). Поля заполняются в деке как отдельные точки `Call`/`TG`/`Оператор`.
- **Новый тенант `barbiespa`** из прототипа `barbie/barbiespa/index.html`: scoped CSS `styles/barbiespa.css` (`.bs-site`), компоненты `barbiespa/BarbieSpaHome.tsx` + `BarbieMasterCard.tsx` (слайдер фото + видео-лайтбокс), ассеты → `public/tenants/barbiespa/` (81 файл), роут `/barbiespa` переключён с generic `TenantSiteShell` на bespoke-шаблон. Мастера — из NAS-каталога, флоатинг — общий `SiteTouchpoints` (pink). Верификация: web tsc exit 0, `/barbiespa` → 200.

### Догон (та же сессия): размножение рендера на все шаблоны + фикс blob'а

- **Общий клиентский компонент** `components/tenant-sites/shared/SiteTouchpoints.tsx` — попап + плавающий кластер; берёт точки из пропа `tp` (SSR) ИЛИ сам фетчит по slug (slug из первого сегмента пути, т.к. публичные роуты — `/{slug}`). `SmTouchpoints.tsx` удалён, salonmassage переведён на общий.
- Domонтирован в **vanilia / nebesa / roxy / pentagon** (по строке + accent-цвет). Покрывает все 12 «наших» роутов: vanilia(5massage,barbiespa,dachaspa,eroticmassaj,etalonspa), nebesa(nebesaspa,outcall-massage), roxy(roxy-spa,soho-spa,work-for-you), pentagon, salonmassage(imperiumspa). `massazh-dlya-par` — на `TenantSiteShell`, вне этого набора.
- **Фикс золотого blob'а** (`.sm-site .shiny-cta .blind`): CSS ждал `--mx/--my` (позиция курсора), но JS их не ставил → blob стоял в центре. Добавлен `salonmassage/ShinyCtaFx.tsx` — делегированный `pointermove` на документе ставит `--mx/--my` в px относительно наведённой `.shiny-cta`; смонтирован в `SalonMassageHome`. Теперь blob следует за мышью (в т.ч. на кнопке age-gate «Мне уже есть 18+»).
- Верификация: web typecheck exit 0; `/5massage` `/nebesaspa` `/roxy-spa` `/pentagon` → 200 (без SSR-краша).

---

## 2026-06-08 · PLANOID AUTON · Nebesa — последний внешний медиа-хотлинк → локальная статика

**Запрос:** продолжение деконтента — оператор подтвердил («давай») локализацию Nebesa после аудита списка из 15 доменов-доноров.

**Аудит (контекст):** роуты тенантов — демо-реплики на 5 шаблонах (`vanilia`, `salonmassage`, `nebesa`, `pentagon`, `roxy`); медиа привязано к шаблону, не к сайту. Внешний медиа-хотлинк остался ровно один — в `nebesa/NebesaHome.tsx`: массив `IMG` из 5 jpg с `https://nebesaspa.com/app/uploads/2026/04/*-hdr-scaled.jpg`, используется как **фолбэк** для карточек девушек без фото (стр. 414). Шаблон `nebesa` обслуживает 2 роута — `/nebesaspa` и `/outcall-massage`. Список доменов «не из нашей оперы» (нет роута): `5massage.com`, `zagorodgroup.ru`, `snegurochkimoscow.ru`.

**Сделано (non-spine):**
- Скачано 5 файлов в `apps/web/public/tenants/nebesaspa/gallery/` (`img_1727/1820/1932/1984/2103-hdr-scaled.jpg`), ~5.1 МБ. Путь `tenants/` (мн.ч.) — консистентно существующим локальным ассетам этого шаблона (`hero/`, `interior/`, `clouds/`).
- `NebesaHome.tsx` — массив `IMG` (5 полей) переписан с `nebesaspa.com/app/uploads/...` на `/tenants/nebesaspa/gallery/...`.

**AI-Default решения:**
- **Папка `public/tenants/nebesaspa/gallery/`** (мн.ч. `tenants`), а не `public/tenant/` (ед.ч., как у 5massage) — намеренно: внутри шаблона nebesa уже своя конвенция `public/tenants/nebesaspa/{hero,interior,clouds,icons,lottie}`. Консистентность внутри компонента важнее единообразия между разными шаблонами. (Расхождение `tenant/` vs `tenants/` — предсуществующее, не вводил.)
- **Не переиспользовал `interior/*.webp`** как фолбэк (хотя это похожие HDR-интерьеры и сэкономило бы байты): сохранил поведение 1:1 (оригинальные jpg-кадры фолбэка) + честно выполнил буквальную просьбу «выкачать». Дубликат ~5 МБ — допустимо.

**Проверка:** греп по всему `apps/web/src` на внешние медиа (`https://…(png|jpg|webp|gif|avif|mp4|webm)`) → **0 совпадений** (в проекте не осталось ни одного внешнего медиа-хотлинка). `GET /nebesaspa` и `/outcall-massage` → 200; gallery-ассеты → 200; в HTML обоих роутов `nebesaspa.com/uploads` = 0.

**НЕ сделано:** git-коммит — `git` отсутствует на машине. Изменения в рабочем дереве, **коммит за оператором**. Push/deploy не делал.

**Spine:** не трогал.

---

## 2026-06-08 · PLANOID AUTON · 5massage — деконтент-хотлинки → локальная статика

**Запрос:** «Выкачай из сторонних сайтов медиа и интегрируй нам.»

**Контекст:** публичная страница `/5massage` (компонент `VaniliaHome.tsx`, демо-реплика VANILIA) хотлинкала медиа напрямую с живого сайта-донора `https://5massage.ru/app/uploads/...` (11 файлов: webp/png/jpg + hero-mp4). У тенанта `5massage` (id `c2ed74a2…`, name VANILIA) **0** строк в `media`, **0** в `cms_pages`, **0** объектов в MinIO — страница не CMS-driven, а захардкоженный компонент с локальными ассетами (`/model-library/`, `/tenant/`).

**Сделано (non-spine):**
- Скачано 11 файлов в `apps/web/public/tenant/5massage/` (`shabl.webp`, `3d.png`, `3d1.png`, `3d-1.png`, `image-1910.png`, `1-1024x683-1.jpg`, `2-1024x683-1.jpg`, `heart-left.png`, `heart-right.png`, `2025-03-19_09-56-22.png` (постер), `posledovatelnost-01_1.mp4` 19.8 МБ). Суммарно ~22.9 МБ.
- `VaniliaHome.tsx` — `IMG`-карта (10 полей) + hero `<video>` src/poster переписаны с `https://5massage.ru/app/uploads/...` на `/tenant/5massage/...`. Грепом подтверждено: внешних `5massage.ru/app/uploads` в `apps/web/src` не осталось.

**AI-Default решения:**
- **Static `public/` вместо MinIO + media-table** (развилка, озвученная оператору в анализе). Причина: страница — захардкоженный демо-компонент, не проходит через media-pipeline; внешние ссылки лежали прямо в TSX. Static-путь консистентен существующим локальным ассетам (`/model-library/`, `/tenant/vanilia-cert-heart.webp`), обратим, без новых строк в БД/бакете. Если позже понадобится «правильный» tenant-flow — мигрировать в `tenant/<id>/...` MinIO + `media`-rows отдельным шагом.
- **Имена файлов = basename донора** (без переименования) — uploads-даты у всех уникальны, коллизий нет.
- **`IMG.hero` (`shabl.webp`)** скачан, хотя в рендере сейчас не используется (hero — видео) — чтобы карта оставалась валидной.

**Проверка:** локальные ассеты `GET 200` (webp/png/mp4); `GET /5massage` → 200; в отрендеренном HTML 0 хотлинков на донора, 13 локальных `/tenant/5massage/` ссылок.

**НЕ сделано:** git-коммит — `git` отсутствует на машине (нет в PATH/обычных путях). Изменения в рабочем дереве, **коммит за оператором**. Push/deploy не делал.

**Spine:** не трогал.

---

## 2026-06-04 · PLANOID AUTON · /admin/projects → TweetDeck-дека салонов

**Запрос:** переработать интерфейс и функционал страницы «Салоны». TweetDeck-стиль: вертикальные колонки + горизонтальный скролл (цель ~6 в зоне видимости). В колонке сверху вниз: визитка · 5 квадратных кнопок с иконками · SEO-секция главной · аккордеон «Услуги» (заголовок + текст внутри).

**Сделано (non-spine):**
- `apps/web/src/app/admin/projects/page.tsx` — grid заменён на горизонтальный скролл-ряд колонок (`overflow-x-auto`, высота деки `calc(100vh-165px)`, `snap-x`). Шапка и `NewTenantDropdown` сохранены; подзаголовок «визитки тенантов» → «дека тенантов».
- `apps/web/src/components/admin/sections/projects/SalonColumn.tsx` (новый) — колонка: `ProjectCard` (визитка, как есть, API-backed токены) + `QuickActions` (5) + `SeoSection` + `ServicesAccordion`. Колонка `w-[320px] h-full overflow-y-auto` — вертикальный скролл внутри, как в TweetDeck.
- `apps/web/src/lib/salon-draft.ts` (новый) — localStorage-персистентность черновика {seoTitle, seoDescription, services} per-tenant (паттерн projects-storage).

**AI-Default решения:**
- **5 кнопок** (per-salon, выбраны так, чтобы не вести в 404): Главная `/{slug}` · Анкеты `/{slug}/models` (обе — новая вкладка) · Страницы `/admin/cms` · Услуги `/admin/services` · Настройки `/admin/settings` (router.push). Набор/таргеты — первая итерация, легко переназначить.
- **SEO + Услуги persist в localStorage** (DRAFT MODE), НЕ в API. Источники для будущей проводки определены: SEO → `cms_pages(slug='home').meta_title/meta_description`, услуги → таблица `services`. Сохранение — на blur, флэш «сохранено».
- **Ширина колонки 320px фикс** (TweetDeck-стиль); «6 столбцов» = зона видимости на широком вьюпорте, остальное горизонтальным скроллом. Высота деки `100vh-165px` — подстраиваемая константа (зависит от topbar+заголовок).
- Аккордеон «Услуги» по умолчанию свёрнут.

**Проверка:** `GET /admin/projects` → 200, `✓ Compiled` без ошибок. Рендер контента — за auth-гейтом (AdminShell), визуально проверяется после логина.

**НЕ сделано:** API-проводка SEO/услуг (отдельный шаг); визуальный скриншот за логином; реальные данные услуг пока не подтягиваются (textarea-черновик).

**Spine:** не трогал.
