# i18n / перевод тенантов — план и решения

**Статус:** Phase 0 (инфраструктура) — в работе · решения приняты оператором 2026-06-08.

## Решения (ратифицированы)
1. **Маршрутизация:** path-префикс `/{lang}/` (next-intl, `localePrefix: 'as-needed'` —
   `ru` без префикса, остальные `/en/...`, `/zh/...`). Даёт SEO/hreflang/шаринг.
2. **Источник переводов:** гибрид — машинный сидинг (LLM) + кэш, ручная вычитка
   ключевых страниц и **обязательно** юр/деньги (18+, оферта, цены) — машине не доверяем.
3. **Старт:** Phase 0 (механизм) + Phase 1 (общий UI-каркас).
4. **Библиотека:** `next-intl` (нативно App Router, server+client, locale-routing).
5. **Локали (7):** ru (default) · zh · en · fr · es · ar (RTL) · de.

## Пласты контента
1. **UI-каркас** — Shell-ы, LangSwitcher, SiteTouchpoints, формы. Общий, конечный набор → `messages/{locale}.json`, namespace `common`.
2. **Копирайт страниц-клонов** — захардкоженный RU в `(tenants)/*/page.tsx`. Объём. Phase 2.
3. **Динамика БД** — services/programs, CMS, touchpoints labels, girls.description. Phase 3 (JSONB `{ru,en,…}` или таблица `translations`).
4. **Юр/деньги** — только ручной перевод.

## Шаги реализации
### Phase 0 — инфраструктура
- [x] `docs/i18n-plan.md` (этот файл).
- [x] `src/i18n/locales.ts` — единый источник локалей (LOCALES, DEFAULT_LOCALE, RTL).
- [x] `messages/{ru,zh,en,fr,es,ar,de}.json` — namespace `common` (МТ-сид, ru — эталон).
- [x] `LangSwitcher` → единый источник + cookie `NEXT_LOCALE` (для SSR).
- [ ] `npm i next-intl`.
- [ ] `src/i18n/request.ts` + `src/i18n/routing.ts` (next-intl config).
- [ ] `middleware.ts` — матч только публичных tenant-путей (НЕ /admin), `localePrefix: 'as-needed'`.
- [ ] Перенос `app/(tenants)` → `app/[locale]/(tenants)` + `app/[locale]/layout.tsx` с `NextIntlClientProvider` + `setRequestLocale`. **/admin не локализуем.**
- [ ] Проверка: `next build` (не сломан роутинг 13 тенантов) + smoke `/en/5massage`.

### Phase 1 — UI-каркас
- [ ] Прокинуть `common` в Shell-ы/LangSwitcher/SiteTouchpoints/формы через `useTranslations`/`getTranslations`.

### Phase 2 — копирайт клонов (объём; гибрид МТ+кэш)
### Phase 3 — динамика БД (translations-слой + «авто-перевести» в админке)
### Phase 4 — SEO/RTL/форматы (hreflang, OG, sitemap, аудит ar, цены/телефоны)

## Сквозное
- Кэш МТ — Redis (в стеке) или таблица; перевод строки разовый.
- RTL (`ar`): `dir` уже ставится; нужен аудит вёрстки Shell-ов.
- Имена девушек не переводим (есть `nameEn`/латиница).
