# i18n — PLANOID execution plan (epic-граф)

> **Что это:** операционализация ратифицированного `docs/i18n-plan.md` (решения Оператора 2026-06-08) в исполняемый epic-граф от лица **PLANOID**. Решения по библиотеке/маршрутизации/локалям НЕ пересматриваются (HISTORIAN: no silent contradiction) — здесь *как строим, в каком порядке, чем верифицируем, как откатываем*.
> **Статус:** Proposed-by-Planoid · ждёт Operator OK на E0 (spine).
> **Дата:** 2026-06-15.

## Kernel-рамка (что держим всю дорогу)
- **SENTINEL (экзистенциально):** локаль-роутинг НЕ трогает tenant-изоляцию. middleware матчит только публичные tenant-пути, **`/admin` и `/api` не локализуются**. Переводы БД-контента остаются tenant-scoped (`tenant_id`, I-5). Утечка между тенантами через общий словарь запрещена.
- **Priority Ladder:** 1) не сломать роутинг 13 тенантов (correctness) → 2) операционная живучесть (ru всегда работает) → 3) maintainability. Скорость/красота — ниже.
- **Immutables:** I-7 миграции только forward-only (E5) · I-9/I-12 i18n живёт в `apps/web` (+ слой переводов БД через api/db, не размывая границы) · стек неизменен.
- **Reversibility:** `localePrefix: 'as-needed'` ⇒ `ru` остаётся на `/` без префикса. На каждом шаге ru-поведение неизменно; откат = снять middleware + вернуть папку.
- **Замки:** E0..E2 — **spine** (перенос `app/`, новая зависимость, middleware, root layout) → только с Operator OK. push/deploy — никогда без команды. Коммиты локальные, чекпоинтами.
- **Honest horizon (§1):** это **macro** → multi-run. Один прогон = ограниченный верифицированный инкремент + чекпоинт + план следующего, не «весь i18n за ночь».

## Поправка к записи (HISTORIAN)
В `i18n-plan.md` Phase 0 часть галочек оптимистична — по факту: `next-intl` НЕ установлен, `middleware.ts` нет, словарей `messages/` нет, `app/[locale]` не сделан, `LangSwitcher` пишет в **localStorage** (а не cookie `NEXT_LOCALE`) и **не навигирует**. Считаем Phase 0 невыполненной; галочки исправить.

## Ключевое дополнение к ратифицированному плану — СНИМОК
`nebesaspa.com` = статический снимок (нет Node/middleware на домене). next-intl-middleware работает на живом `/nas`, но на домене работает только то, что **закраулено**. Поэтому добавлены E2 (per-locale crawl) и требование: `LangSwitcher` должен **переходить на префиксный URL**, а не только ставить класс.

---

## Epic-граф (зависимости → порядок)

### E0 · Spine pre-flight + Operator OK  ⟶ GATE: явный OK
Зафиксировать spine-касания и план отката, завести ветку. Без OK дальше не идём.
Spine: `app/(tenants)`→`app/[locale]/(tenants)`, dep `next-intl`, `middleware.ts`, root/`[locale]` layout.

### E1 · Механизм маршрутизации (repo-wide, ru-поведение неизменно)  [spine]
- `npm i next-intl`; `src/i18n/routing.ts` (locales из `locales.ts`, default `ru`, `localePrefix:'as-needed'`), `src/i18n/request.ts`.
- `middleware.ts` — matcher только публичные tenant-пути; **исключить** `/admin`, `/api`, `/_next`, статику.
- Перенос `app/(tenants)` → `app/[locale]/(tenants)`; `[locale]/layout.tsx` с `NextIntlClientProvider` + `setRequestLocale`; `generateStaticParams` по локалям.
- `LangSwitcher` → навигация на локализованный путь (next-intl `Link`/`useRouter`), cookie `NEXT_LOCALE`, сохранить localStorage как UX-память.
- **GATE:** `next build` зелёный · smoke: 13 тенантов всё ещё `200` на `/` · `/en/nebesaspa` `200` · `/admin` не локализован/работает · `typecheck`+`lint`. SENTINEL: ни один tenant-роут не потерян.

### E2 · Адаптация снимка (закрывает gap)  [spine-adjacent]
- `scripts/publish-snapshot.mjs`: перебор локалей тенанта, краул каждого `/{locale}/...`, запись в `/var/www/<домен>` с локаль-подпапками.
- Решение Оператора: набор локалей для домена (все 7 или старт ru+en+zh — снимок ×N).
- **GATE:** в снимке есть `/en/...` · `nebesaspa.com/en/` `200` · переключатель реально меняет язык на статике · `ru`-снимок не изменился.

### E3 · UI-каркас — namespace `common` (общий для всех тенантов)
- `messages/{ru,zh,en,fr,es,ar,de}.json` (`common`): Shell-ы, LangSwitcher, SiteTouchpoints labels, формы, age-gate, футер, навигация.
- Прокинуть `useTranslations`/`getTranslations` в общие Shell-ы.
- МТ-сид 7 языков (генерю я, `ru` — эталон); **ручная вычитка age-gate/18+**.
- **GATE:** смена локали меняет общий UI · `ru` эталон не тронут · нет missing-message (next-intl падает на отсутствующем ключе) · ar — dir=rtl применяется.

### E4 · Копирайт nebesa (nebesa-first)
- Извлечь захардкоженный RU из `NebesaHome` + страниц `(tenants)/nebesaspa/*` в namespace `nebesa.*`.
- МТ + **ручная вычитка денег/юр** (цены, оферта, 18+).
- **GATE:** визуальный smoke nebesa по локалям (WebKit/iOS тоже) · цены/юр вычитаны человеком · ru без регрессий.
- **Тиражирование:** E4 повторяется по тенантам как отдельные под-эпики (5massage, imperium, soho, …). Механизм (E1–E3) — общий, не повторяется.

### E5 · Динамика БД (tenant-scoped)
- Слой переводов: JSONB `{ru,en,…}` на переводимых полях **или** таблица `translations(tenant_id, entity, field, locale, value)` — **tenant_id обязателен (I-5)**, миграция forward-only (I-7).
- Покрыть: программы/категории, `girls.description`, touchpoint labels, адрес/SEO тенанта.
- Админка: действие «авто-перевести» (api) + кэш МТ (Redis/таблица, перевод строки разовый).
- **GATE:** `check:tenant-coverage` зелёный · миграция forward-only · локализованные имена программ рендерятся · fallback на `ru` при отсутствии перевода.

### E6 · SEO / RTL / форматы
- hreflang, OG per-locale, sitemap per-locale, аудит вёрстки `ar` (RTL) в Shell-ах, форматы цен/телефонов/чисел.
- **GATE:** валидный hreflang · визуальный аудит ar · SEO-smoke.

---

## Порядок прогонов (multi-run)
`E0 (OK)` → `E1+E2` (один прогон, repo-wide механизм+снимок) → `E3` → `E4 nebesa` → `E4×тенанты` → `E5` → `E6`.
Каждый эпик: обратимый, чекпоинт-коммит локально (без push), kernel-гейты зелёные = эпик ратифицирован.

## Риски (SENTINEL)
- Перенос `app/` ломает роутинг 13 тенантов → митигация: `as-needed` (ru на `/` не меняется) + полный build-smoke до коммита.
- `/admin` случайно локализуется → matcher middleware исключает явно; smoke `/admin`.
- Снимок ×N тяжелеет → Оператор выбирает набор локалей для домена.
- МТ врёт на деньгах/юр → ручная вычитка обязательна (money-correctness).
- Переводы БД утекают между тенантами → строго `tenant_id`-scoped (I-5), проверка `check:tenant-coverage`.

## Решения от Оператора (блокируют старт)
1. **OK на E0/E1 spine** (перенос `app/`, dep, middleware)?
2. **Локали для домена-снимка:** все 7 сразу или старт ru+en+zh?
3. **Режим исполнения:** AVTONOM (рою сам до зелёных гейтов, чекпоинты) или MANUAL по spine-шагам?
4. Переводы генерю я (LLM, вычитка ключевого тобой) — подтверждаешь?
