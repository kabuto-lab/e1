# Города: фильтр в каталоге + селект в анкете — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кнопки городов вместо статуса/сортировки в каталоге и селект города вместо текстового поля в трёх веб-формах анкеты.

**Architecture:** Один источник списка — `apps/web/lib/cities.ts` (константа + чистая функция опций селекта). Каталог переиспользует существующее состояние `selectedCity` → параметр `city=` в `GET /models`. Формы используют существующий `SelectDropdown` через `setValue`, как соседние селекты «Грудь/Тип фигуры».

**Tech Stack:** Next.js (App Router), React, react-hook-form, TypeScript. Тест чистой функции — встроенный `node:test` Node 22 с `--experimental-strip-types` (без новых зависимостей; в `apps/web` нет тест-раннера).

**Spec:** `docs/superpowers/specs/2026-11-24-catalog-city-filters-design.md`

## Global Constraints

- Бэкенд (`apps/api`) не трогаем. Новые зависимости не добавляем.
- Города, точные строки и порядок: `'Москва', 'Санкт-Петербург', 'Казань', 'Сочи'`.
- Старый код **не удаляем — комментируем** на месте с пометкой причины (образец — закомментированный `LocationSidebar` в `ModelsClientPage.tsx`).
- Ничего сверх спеки: диапазоны в «Все фильтры», поле «Страна» в формах, `filters.district`, `components/LocationSidebar.tsx` — без изменений.
- Запрос каталога продолжает слать `orderBy=rating&order=desc&limit=15` (дефолты `filters`); меняется только `city`.
- Подписи: «Все» (кнопка каталога), «Не указан» (пустой пункт селекта), `<значение> (не из списка)` (пункт для значения вне списка).
- Город в анкете необязателен.
- Перед UI-правками — `DESIGN.md`; новые элементы строятся из существующих `Pill` / `SelectDropdown`, без новых стилей.

## Review Focus

1. Анкета с городом не из списка («СПб») в админке → селект показывает «СПб (не из списка)», сохранение без правки оставляет «СПб». — тест `buildCityOptions` в Task 1 + ручная проверка Task 3.
2. Анкета с городом с пробелами по краям («Москва ») → считается не из списка, показывается как есть (не схлопывается молча в «Москва»). — тест в Task 1.
3. Пустой город → выбран «Не указан», лишнего пункта нет. — тест в Task 1.
4. Переключение города на 2-й+ странице каталога → запрос уходит с `offset` 0, а не со старым offset. — ручная проверка Task 2.
5. «Сбросить фильтры» при выбранном городе → активна «Все», `city` исчезает из запроса. — ручная проверка Task 2.

---

### Task 1: Список городов и опции селекта

**Files:**
- Create: `apps/web/lib/cities.ts`
- Test: `apps/web/lib/cities.test.mts`

**Interfaces:**
- Produces:
  - `export const CITIES: readonly ['Москва', 'Санкт-Петербург', 'Казань', 'Сочи']`
  - `export type City = (typeof CITIES)[number]`
  - `export function buildCityOptions(current: string | null | undefined): { value: string; label: string }[]` — `[{ value: '', label: 'Не указан' }, ...CITIES]`, плюс в конце `{ value: current, label: \`${current} (не из списка)\` }`, если `current` непустой и не входит в `CITIES` (сравнение строгое, без trim/регистра).
- Файл без импортов (чтобы тест запускался голым Node).

- [ ] **Step 1: Написать падающий тест** `apps/web/lib/cities.test.mts` (`import { test } from 'node:test'; import assert from 'node:assert/strict'; import { CITIES, buildCityOptions } from './cities.ts';`):
  - `CITIES` deepEqual `['Москва', 'Санкт-Петербург', 'Казань', 'Сочи']`;
  - `buildCityOptions('')`, `(undefined)`, `(null)` → 5 пунктов, первый `{ value: '', label: 'Не указан' }`, далее города с `label === value`;
  - `buildCityOptions('Казань')` → те же 5 пунктов;
  - `buildCityOptions('СПб')` → 6 пунктов, последний `{ value: 'СПб', label: 'СПб (не из списка)' }`;
  - `buildCityOptions('Москва ')` → 6 пунктов, последний `{ value: 'Москва ', label: 'Москва  (не из списка)' }`.

- [ ] **Step 2: Убедиться, что падает**
  Run: `node --experimental-strip-types --test apps/web/lib/cities.test.mts` (из корня репо)
  Expected: FAIL — `Cannot find module ... cities.ts`.

- [ ] **Step 3: Реализовать `apps/web/lib/cities.ts`** по Interfaces.

- [ ] **Step 4: Тест проходит**
  Run: та же команда. Expected: `# pass 5`, `# fail 0` (по числу `test(...)`).
  Run: `npx tsc --noEmit -p apps/web` → без новых ошибок. (`.mts` не входит в `include` web-tsconfig — тест не проверяется tsc и не попадает в сборку Next; подход проверен на Node 22.23.)

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/lib/cities.ts apps/web/lib/cities.test.mts
  git commit -m "feat(web): shared city list and select options"
  ```

### Task 2: Каталог — кнопки городов, скрыть статус/сортировку и блок локации

**Files:**
- Modify: `apps/web/app/models/ModelsClientPage.tsx` — filter bar (~строки 664–692), `FilterPanelContent` блок «Локация» (~1013–1047)

**Interfaces:**
- Consumes: `CITIES` из `@/lib/cities` (Task 1).
- Существующее: `selectedCity`, `handleLocationSelect(country: string, city: string)` (ставит страну/город и сбрасывает `offset` в 0 — `ModelsClientPage.tsx:401`), `Pill`, `resetAllFilters`.

- [ ] **Step 1: Закомментировать в filter bar** пилюли «Все»/«Свободна» (`availabilityStatus`), разделитель, подпись «Сортировка», `SORT_OPTIONS.map(...)` — одним JSX-комментарием с пометкой `{/* Скрыто по требованию заказчика 2026-11-24: вместо статуса/сортировки — города. Сортировка продолжает уходить дефолтом rating desc. */}`.

- [ ] **Step 2: Добавить кнопки городов** на место закомментированного: `Pill` «Все» (`active={!selectedCity}`, клик → город `''`) и `CITIES.map` → `Pill` с `active={selectedCity === city}`, клик → этот город. Клик вызывает `handleLocationSelect('', city)` (страна всегда `''`). Разделитель перед «Все фильтры» оставить.

- [ ] **Step 3: «Все фильтры» — подсветка** только по открытой панели: в `active` закомментировать `|| Boolean(selectedCountry) || Boolean(selectedCity)` (оставить `showFiltersPanel`).

- [ ] **Step 4: `FilterPanelContent`** — закомментировать JSX-блок «Локация» (оба `SelectDropdown`: «Страна», «Город») с пометкой причины. Пропсы и `const cities = …` не трогать; если lint/tsc ругается на неиспользуемое — закомментировать и его.

- [ ] **Step 5: Импорты/переменные**, ставшие неиспользуемыми (`SORT_OPTIONS`, `setSort`, `AVAILABILITY_CLIENT_*`) — комментировать, только если на них ругается `npx tsc --noEmit -p apps/web` или `npm run lint --workspace=@escort/web`.

- [ ] **Step 6: Проверка типов и lint**
  Run: `npx tsc --noEmit -p apps/web` → без новых ошибок; `npm run lint --workspace=@escort/web` → без новых ошибок в этом файле.

- [ ] **Step 7: Ручная проверка** (API в контейнере `:4000`, фронт `cd apps/web && npx next dev -p 4001`, http://localhost:4001/models, DevTools → Network):
  - ряд: `[вид] [Все] [Москва] [Санкт-Петербург] [Казань] [Сочи] | [Все фильтры]`; «Все» активна при открытии;
  - клик «Москва» → `GET /models?city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0&orderBy=rating&order=desc&limit=15` (без `offset` или `offset=0`); локально выдача пустая — ожидаемо;
  - на 2-й странице «Все» → клик города → запрос без старого `offset` (Review Focus 4);
  - «Все» → `city` пропал; «Сбросить фильтры» при выбранном городе → активна «Все» (Review Focus 5);
  - «Все фильтры» → нет «Страна/Город», диапазоны на месте; мобильная ширина (375px) — ряд скроллится, «Санкт-Петербург» не обрезан.

- [ ] **Step 8: Commit**
  ```bash
  git add apps/web/app/models/ModelsClientPage.tsx
  git commit -m "feat(web): city pills in catalog, hide status/sort and location filters"
  ```

### Task 3: Селект города в трёх формах анкеты

**Files:**
- Modify: `apps/web/app/dashboard/models/create/page.tsx:1310-1319`
- Modify: `apps/web/app/dashboard/models/[id]/edit/page.tsx:1262-1265`
- Modify: `apps/web/app/model/profile/page.tsx:475-478`

**Interfaces:**
- Consumes: `buildCityOptions` из `@/lib/cities` (Task 1).
- Паттерн в каждом файле — как у соседнего селекта «Тип фигуры» в том же файле:
  `<SelectDropdown value={formData.physicalAttributes?.city ?? ''} onChange={(v) => setValue('physicalAttributes.city', v, { shouldDirty: true })} options={buildCityOptions(formData.physicalAttributes?.city)} … />` — в админке с `light={L}`, в «Моей анкете» без `light`, размер как у соседних селектов файла.

- [ ] **Step 1: create** — закомментировать `<input {...register('physicalAttributes.city')} … />` с пометкой `{/* Город — селект из lib/cities.ts (2026-11-24); свободный ввод только в TG-боте */}`, под ним `SelectDropdown`. Дефолт `city: 'Москва'` в `defaultValues` не трогать.

- [ ] **Step 2: edit** — то же. Загрузка `if (a.city) setValue('physicalAttributes.city', a.city)` не трогать: значение не из списка попадёт в селект через `buildCityOptions`.

- [ ] **Step 3: «Моя анкета»** (`app/model/profile/page.tsx`) — то же, без `light`.

- [ ] **Step 4: Проверка типов**
  Run: `npx tsc --noEmit -p apps/web` → без новых ошибок. Если `setValue('physicalAttributes.city', v, …)` не проходит по типу — тот же приём, что у соседних селектов (`v as any` там уже используется).

- [ ] **Step 5: Ручная проверка** (вход `admin`, фронт :4001):
  - создание модели: город по умолчанию «Москва», список: Не указан / 4 города; сохранить с «Казань» → в Network тело `POST` содержит `"city":"Казань"`;
  - редактирование: выбрать «Не указан» → сохранить → `city` отсутствует/пустой (как раньше при пустом поле);
  - редактирование анкеты с городом не из списка: временно выставить через psql `update model_profiles set physical_attributes = jsonb_set(coalesce(physical_attributes,'{}'), '{city}', '"СПб"') where id = '<id>';` → открыть → в селекте «СПб (не из списка)»; сохранить, не трогая город → в БД осталось «СПб» (Review Focus 1); вернуть значение обратно;
  - «Моя анкета» (вход под моделью, если есть учётка; иначе — только tsc + визуально через админку) — тот же список.

- [ ] **Step 6: Commit**
  ```bash
  git add apps/web/app/dashboard/models/create/page.tsx "apps/web/app/dashboard/models/[id]/edit/page.tsx" apps/web/app/model/profile/page.tsx
  git commit -m "feat(web): city select in model profile forms"
  ```

---

**Примечание по коммитам:** в репозитории не настроены `user.name`/`user.email` — до первого коммита их задаёт пользователь. Сообщения коммитов заканчиваются трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git push` — только пользователь.
