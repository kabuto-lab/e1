# Каталог: временно только Москва — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** в ряду кнопок городов каталога `/models` показывать только «Москва» (плюс «Все»), остальные города временно скрыть.

**Architecture:** отдельная константа `CATALOG_CITIES` в `apps/web/lib/cities.ts` (подмножество `CITIES`); каталог рендерит кнопки из неё, анкета по-прежнему использует `CITIES`.

**Tech Stack:** Next.js (apps/web), TypeScript, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-26-catalog-moscow-only-design.md`

## Global Constraints

- Ветка `feature/catalog-moscow-only` от `main`; `git push` — только пользователь.
- Бэкенд, БД и spine-файлы не трогать.
- `CITIES` и `buildCityOptions` не менять (селект «Город» в анкете остаётся с 4 городами).
- Кнопка «Все» в каталоге остаётся.

## Review Focus

- Выбор «Москва» и затем «Все» сбрасывает фильтр как раньше — поведение `handleLocationSelect` не меняется.
- `CATALOG_CITIES` должен оставаться подмножеством `CITIES` (иначе кнопка даст пустой каталог) — закреплено типом `satisfies readonly City[]` и тестом.

---

### Task 1: `CATALOG_CITIES` и кнопки каталога

**Files:**
- Modify: `apps/web/lib/cities.ts` (после `type City`)
- Modify: `apps/web/app/models/ModelsClientPage.tsx:19` (импорт), `:689` (`CITIES.map` → `CATALOG_CITIES.map`)
- Test: `apps/web/lib/cities.test.mts`

**Interfaces:**
- Produces: `export const CATALOG_CITIES = ['Москва'] as const satisfies readonly City[];` с комментарием «временно: только города, где есть анкеты; вернуть остальные из CITIES, когда появятся».

- [ ] **Step 1: Падающий тест** в `cities.test.mts`, импорт `CATALOG_CITIES`:
  `test('CATALOG_CITIES — временно только Москва и подмножество CITIES')`: `assert.deepEqual([...CATALOG_CITIES], ['Москва'])`; для каждого `c` — `assert.ok(CITIES.includes(c))`.
- [ ] **Step 2:** `node --experimental-strip-types --test apps/web/lib/cities.test.mts` (из корня) → FAIL (нет экспорта).
- [ ] **Step 3:** добавить `CATALOG_CITIES` в `cities.ts`; в `ModelsClientPage.tsx` импортировать и использовать вместо `CITIES` в ряду кнопок (импорт `CITIES` убрать, если больше не используется).
- [ ] **Step 4:** тот же тест → PASS (все тесты файла); `cd apps/web && npx tsc --noEmit` → без новых ошибок.
- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/lib/cities.ts apps/web/lib/cities.test.mts apps/web/app/models/ModelsClientPage.tsx docs/superpowers/specs/2026-11-26-catalog-moscow-only-design.md docs/superpowers/plans/2026-11-26-catalog-moscow-only.md
  git commit -m "feat(web): каталог временно показывает только город Москва"
  ```
