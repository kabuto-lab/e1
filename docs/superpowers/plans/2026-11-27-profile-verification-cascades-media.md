# Каскад решения по анкете на её медиа — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** «Верифицировать»/«Отклонить» у анкеты в очереди модерации применяет то же решение ко всем её ожидающим файлам.

**Architecture:** Чистая функция-оркестратор в `apps/web/lib/` (API-вызовы инжектятся — тестируется `node:test` без сети), компонент `ModerationQueueBoard` вызывает её из кнопок анкеты. Бэкенд не меняется.

**Tech Stack:** Next.js / React / TypeScript, тесты — `node:test` + `.test.mts` (как `lib/cities.test.mts`), Node 22.

**Spec:** `docs/superpowers/specs/2026-11-27-profile-verification-cascades-media-design.md`

## Global Constraints

- Только фронтенд; `apps/api` не трогать.
- Порядок: сначала статус анкеты, файлы — только после успеха.
- Причина отклонения файлов — ровно `Анкета отклонена`.
- Файлы обрабатываются последовательно; сбой одного файла не останавливает остальные.
- Итоговая ошибка при сбоях файлов — `Не удалось обработать N файлов` (N — число).
- Новых зависимостей не добавлять. Стиль — по текущей карточке и `DESIGN.md`.

## Review Focus

- Бэкенд отказал по анкете (400 «Нельзя верифицировать анкету без верификационного фото и видео») → ни один файл не тронут, ошибка показана.
- У анкеты 0 ожидающих файлов → поведение как раньше, подсказки «+ N файлов» нет.
- Файлы других анкет и файлы с `modelId: null` не затрагиваются.
- Часть файлов упала → остальные обработаны, сообщение с точным N, очередь перезагружена.
- Повторное нажатие во время обработки — кнопки заблокированы (`busyId`) до конца каскада.

---

### Task 1: Оркестратор каскада

**Files:**
- Create: `apps/web/lib/profile-moderation-cascade.ts`
- Test: `apps/web/lib/profile-moderation-cascade.test.mts`

**Interfaces:**
- Produces:
  ```ts
  export type ProfileDecision = 'verified' | 'rejected';
  export const CASCADE_REJECT_REASON = 'Анкета отклонена';
  export function pendingMediaIdsForProfile(profileId: string, media: { id: string; modelId: string | null }[]): string[];
  export async function cascadeProfileDecision(
    profileId: string,
    decision: ProfileDecision,
    mediaIds: string[],
    deps: {
      setProfile: (profileId: string, d: ProfileDecision) => Promise<unknown>;
      approveMedia: (mediaId: string) => Promise<unknown>;
      rejectMedia: (mediaId: string, reason: string) => Promise<unknown>;
    },
  ): Promise<{ failedMediaIds: string[] }>;
  ```
  Ошибка `setProfile` пробрасывается наружу (файлы не трогаются).

- [ ] **Step 1: Write the failing tests** (`node:test`, `assert/strict`, импорт из `./profile-moderation-cascade.ts`; deps — фейки, пишущие вызовы в массив `calls`)
  - `pendingMediaIdsForProfile` возвращает id только с `modelId === profileId` в исходном порядке; `modelId: null` и чужие отброшены.
  - `verified`: `calls` = `[['setProfile','p1','verified'],['approve','m1'],['approve','m2']]`, результат `{ failedMediaIds: [] }`.
  - `rejected`: каждый файл — `['reject', id, 'Анкета отклонена']`, `setProfile` первым.
  - `setProfile` бросает → `assert.rejects`, в `calls` нет ни одного approve/reject.
  - `approveMedia` бросает на `m1` → `m2` всё равно обработан, результат `{ failedMediaIds: ['m1'] }`.
  - пустой `mediaIds` → только `setProfile`.

- [ ] **Step 2: Run, expect FAIL** — `cd apps/web && node --test lib/profile-moderation-cascade.test.mts` → ошибка импорта модуля.

- [ ] **Step 3: Implement** в `apps/web/lib/profile-moderation-cascade.ts` по сигнатурам выше; файлы — последовательный `for` с `try/catch` на каждый.

- [ ] **Step 4: Run, expect PASS** — та же команда, все тесты `ok`; заодно `node --test lib/cities.test.mts` остаётся зелёным.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/lib/profile-moderation-cascade.ts apps/web/lib/profile-moderation-cascade.test.mts
  git commit -m "feat(web): оркестратор каскада решения по анкете на её медиа"
  ```

### Task 2: Подключение в ModerationQueueBoard + подсказка

**Files:**
- Modify: `apps/web/components/ModerationQueueBoard.tsx` (функция `run` ~стр. 143–154, карточка анкеты ~стр. 222–272)

**Interfaces:**
- Consumes: `pendingMediaIdsForProfile`, `cascadeProfileDecision`, `ProfileDecision` из `@/lib/profile-moderation-cascade`; `api.moderateProfileVerification`, `api.approveProfileMedia`, `api.rejectProfileMedia` (существующие).

- [ ] **Step 1: Обработчик** `decideProfile(p: ModProfile, decision: ProfileDecision)` внутри компонента: через `run(\`p-${p.id}\`, …)` вызывает `cascadeProfileDecision(p.id, decision, pendingMediaIdsForProfile(p.id, media), { setProfile: api.moderateProfileVerification, approveMedia: api.approveProfileMedia, rejectMedia: api.rejectProfileMedia })`; если `failedMediaIds.length > 0` — бросает `Error(\`Не удалось обработать ${n} файлов\`)`. `run` должен и в этом случае перезагрузить очередь: поменять `run` так, чтобы `loadQueue()` вызывался в `finally` (до `setBusyId(null)`), а не только при успехе.

- [ ] **Step 2: Кнопки** «Верифицировать»/«Отклонить» анкеты вызывают `decideProfile(p, 'verified')` / `decideProfile(p, 'rejected')`.

- [ ] **Step 3: Подсказка** — при `pendingMediaIdsForProfile(p.id, media).length > 0` над кнопками строка `+ N файлов` (класс `text-[10px] ${t.muted}`, как строка даты), с `title="Решение по анкете применится и к её файлам на модерации"`.

- [ ] **Step 4: Проверка типов** — `cd apps/web && npx tsc --noEmit -p .` → без новых ошибок в `ModerationQueueBoard.tsx` и `lib/profile-moderation-cascade.ts`.

- [ ] **Step 5: Ручная проверка** (`npx next dev -p 4001`, API :4000, логин `admin`): анкета с ≥2 pending-фото → «Верифицировать» → анкета и её фото исчезли из колонок, чужие фото на месте; повторить с «Отклонить» на другой анкете; самозарегистрированная анкета без верификационного видео → ошибка, её фото остались в очереди.

- [ ] **Step 6: Commit**
  ```bash
  git add apps/web/components/ModerationQueueBoard.tsx
  git commit -m "feat(web): решение по анкете применяется ко всем её файлам на модерации"
  ```
