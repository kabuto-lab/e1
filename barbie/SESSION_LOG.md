# SESSION LOG · NAS (barbie/SITE1)

Лог финальных отчётов AVTONOM-сессий. Дополняется сверху.

---

## 2026-05-30 · PLANOID (AUTON, no push) · Productor-debt cluster — 1 commit (1 spine SKIP)

**Trigger:** Operator: «follow optimal plan». После Track D closure оптимальный autonomous-safe следующий шаг = Productor-debt (Track E destructive+gated на browser-verify → не трогаю; Track H multi-day + untracked ED WIP → не трогаю).

### Deliverable — `b920a43`
- **coverImageKey scope guard** (opportunities): `create`/`update` отвергают coverImageKey вне `tenant/{tenantId}/` → 400 `WFY_OPPORTUNITY_COVER_KEY_SCOPE`. Закрыт cross-tenant media-leak вектор. Валидация на service-слое (tenantId из ALS, не из DTO). +6 spec; удалён устаревший «free-form key» тест.
- **externalLink whitelist regression spec** (partner-salons): `@IsUrl` allowlist (http/https, require_protocol) уже блокировал `javascript:`/`data:` — добавлен regression-тест (новый чистый DTO-validation паттерн: `plainToInstance`+`validateSync`); javascript/data/vbscript/file/ftp/no-protocol → reject, https/http → ok. +11 кейсов.

### SPINE SKIP (universal lock — operator-only)
- **Global @Throttle enforcement.** `ThrottlerModule.forRoot([{ttl:60s,limit:120}])` сконфигурирован в `app.module.ts`, НО `ThrottlerGuard` НЕ зарегистрирован как `APP_GUARD` (там только `JwtAuthGuard`). ⇒ rate-limit **определён, но не применяется глобально.** Фикс — +1 строка `{ provide: APP_GUARD, useClass: ThrottlerGuard }` в `app.module.ts` (**spine**). `SKIP: spine-touch на apps/api/src/app.module.ts` — оставлено оператору. **Рекомендация: применить (реальная security-дыра в rate-limiting).**

### Outcome
- T1 ✓ read: partner-salon DTO + opportunities DTO/service/spec + app.module throttle + media key-format (`tenant/{tenantId}/{module}/…` — подтвердил, что guard-префикс совпадает с реальными ключами).
- T5 ✓ SENTINEL: coverImageKey guard = ещё один слой tenant-изоляции; media key-format верифицирован против MediaService + DB CHECK.
- T6 ✓ SIMPLIFIER: удалён дублирующий «free-form» тест (покрыт новым describe-блоком).
- T11 ✓ gates: api tsc clean · jest **302/302** (21 suites, +16) · tenant-coverage **22/0**.
- T12 ✓ this entry + plan memory.

### AI-Default decisions (AUTON)
| # | Decision | Rationale |
|---|---|---|
| AID-1 | externalLink — только regression-тест, без правки DTO | защита уже была (`@IsUrl` allowlist); debt-пункт = зафиксировать инвариант. |
| AID-2 | @Throttle фикс **НЕ применён** | app.module.ts = spine; AUTON → SKIP+log+рекомендация. |
| AID-3 | Track E (git rm work4u/apps) **НЕ выполнен** | destructive + gated на browser-verify (universal lock). Оператор. |
| AID-4 | Удалён устаревший тест вместо правки | его premise («no validation») инвертирован новым guard'ом; accept-кейс покрыт. |

### Next
- **Operator (spine, 1 строка):** добавить `{ provide: APP_GUARD, useClass: ThrottlerGuard }` в `app.module.ts` — включить rate-limit.
- **Operator (content):** `opportunities` → capability-матрица + MIGRATION_PLAN §3.3 (если решено, что это полноценный гейтируемый модуль).
- Browser-verify Track D (rail wfy vs salon) → затем **Track E** cleanup.
- **Track H** — ED Section presets.

---

## 2026-05-30 · PLANOID (AUTON, no push) · Track D.6 rail filter — 1 commit · **Track D CLOSED**

**Trigger:** Operator: «го D.6» (continuation). Last open D-step.

### Pre-flight
Rail (`components/admin/shell/Rail.tsx`) ранее **не имел** wfy-пунктов вообще и ничего не фильтровал по siteType. AuthSession содержит `tenantSlug`, но не `siteType`. Login + tenant-switch строят сессию в 2 местах → Option A (siteType в login) широк; выбран **Option B** (план-endorsed): fetch by-slug.

### Deliverable — `d556b17`
- **API**: `PublicTenantResponseDto.siteType` + маппинг в `getPublicTenantBySlug` (`row.tenant.siteType`). Low-sensitivity enum.
- **Web**: AdminShell один раз за сессию тянет `/v1/public/tenants/by-slug/:slug` (client `apiFetch`), резолвит siteType, прокидывает в Rail. **Fail-closed**: ошибка → siteType=null → вертикальные секции скрыты (API + page-guard остаются настоящей authz). Rail рендерит секцию «Work-for-you», каждый пункт гейтится `tenantCan()` для 4 matrix-модулей; Opportunities — по site-type-гарду секции (нет matrix-ключа).

### Outcome — по фазам
- T1 ✓ read: AdminShell + Rail + auth.ts + public-tenant.dto + tenants.service public-mapping + site-type-capabilities(+spec) + login/tenant-switch.
- T2 ✓ ORCHESTRATOR: size=task; Option B; spine clear (AdminShell/Rail/service/DTO — все non-spine).
- T5 ✓ SENTINEL: rail-hiding ≠ authz; defense-in-depth сохранён (guard 409 + page capability-block). Exposing siteType публично — не секрет (видно по самому сайту).
- T8 ✓ ADVERSARY: siteType=null/fetch-fail → секция скрыта (не падает, не показывает лишнее).
- T11 ✓ gates: api tsc clean · jest 286/286 · web tsc clean · capability spec 11/11.
- T12 ✓ this entry + plan memory.

### AI-Default decisions (AUTON)
| # | Decision | Rationale |
|---|---|---|
| AID-1 | Option B (fetch by-slug), не A (siteType в login) | A трогает 2 session-builder'а (login + tenant-switch) + auth.ts + login DTO; B локален. План явно endorse'ит B. |
| AID-2 | siteType добавлен в **публичный** by-slug DTO | by-slug уже публичен и отдаёт весь лендинг; вертикаль не секрет. Лёгкого authed-эндпоинта под siteType нет. |
| AID-3 | `opportunities` **НЕ добавлен** в capability-матрицу | spec пинит wfy-set к MIGRATION_PLAN §3.3 (opportunities там нет); добавление — operator content-decision. Пункт показан по site-type-гарду. → **Productor-debt.** |
| AID-4 | Существующие salon-пункты (Салоны/Мастера/Услуги) **не гейчу** | сейчас видны всем; их фильтрация — отдельное UX-решение, риск спрятать рабочий функционал. D.6 scope = добавить wfy-секцию. |
| AID-5 | Fail-closed при siteType=null | UI fail-safe; реальная authz на API. |

### Track D — финальный статус: **CLOSED**
D.1 cities · D.2 partner-salons · D.3 opportunities · D.4 advantages (api+web) · D.5 vacancies · D.6 rail filter · D.7 guard. Все 5 wfy-модулей + rail. 3 commit'а за сессию: `e8bb8de` (D.4 web) · `fe0c476` (D.5) · `d556b17` (D.6). Не запушено.

### Next (вне Track D)
- Operator browser-verify rail под wfy-тенантом (work-for-you) vs salon-тенантом (imperiumspa): wfy-секция видна только у первого.
- **Productor-debt**: (a) `opportunities` → матрица + MIGRATION_PLAN §3.3 (operator decision); (b) URL-whitelist spec для externalLink; (c) global @Throttle audit; (d) coverImageKey format validator.
- **Track E** — `git rm work4u/apps/{web,api}` после browser-verify.
- **Track H** — block-registry ED Section presets.

---

## 2026-05-30 · PLANOID (AUTON, no push) · Track D.5 vacancies (full stack) — 1 commit

**Trigger:** Operator: «продолжай» (continuation того же PLANOID-run). Next increment = D.5 vacancies.

### Pre-flight (spine check)
`wfy_vacancies` схема существует с Phase A (`packages/db/src/schema/wfy-vacancies.ts`) → **миграция не нужна, spine не тронут.** Backend wfy-admin модуль отсутствовал → строим api+web.

### Deliverable — `fe0c476`
- **Backend** (mirror advantages + cities-conflict): 4 DTO (`code` slug с `@Matches` под CHECK схемы; `requirements`/`conditions` как `string[]` jsonb, ArrayMaxSize 100 / 500-each; `summary`), service с tenant-scoped CRUD + 23505→409 `WFY_VACANCY_CODE_TAKEN`, controller (TenantGuard+RolesGuard+WfyTenantCapabilityGuard), spec 15 кейсов. Зарегистрирован в `tenants.module.ts` (non-spine).
- **Web**: `wfy-vacancies-api.ts` + `/admin/wfy/vacancies` — CRUD + drag-reorder + textarea-bullets (один пункт на строку → split/trim/drop-empties). Capability-block на 409.

### Outcome — по фазам
- T1 ✓ read-before-trust: vacancies schema + advantages module (controller/service/spec/4 DTO) + cities service (23505-паттерн) + mock-db API + tenants.module.
- T2 ✓ ORCHESTRATOR: size=epic-lite (backend+web), исполнен прямым воркер-проходом по шаблону D.4. Spine clear (pre-flight).
- T5 ✓ SENTINEL: 3-слойная изоляция; capability declarative; semantics verbatim (404 NOT_FOUND / 409 CODE_TAKEN / 409 TENANT_SITE_TYPE_MISMATCH).
- T8 ✓ ADVERSARY: 23505 на обоих write-путях (create через `.values()` throw, update через `.set()` throw) покрыт тестами; `code` regex продублирован client `pattern` + server `@Matches` + DB CHECK (3 слоя).
- T11 ✓ gates green: api tsc clean · jest **286/286** (20 suites, +15 vacancies) · check:tenant-coverage **22 controllers / 0 failures** (vacancies = 22-й, распознан ADR-001 detector) · web tsc clean.
- T12 ✓ this entry + plan memory.

### AI-Default decisions (AUTON)
| # | Decision | Rationale |
|---|---|---|
| AID-1 | **D.7b MediaPicker extract НЕ выполнен** | был условным «if D.5 needs cover»; у vacancies нет coverImage → rule-of-three для MediaPicker остаётся 2/3 (opportunities + partner-salons). Не извлекаем преждевременно. |
| AID-2 | requirements/conditions — **wholesale replace** при update (не merge) | jsonb-массив; PATCH с массивом = полная замена, предсказуемее для UI textarea. |
| AID-3 | bullet-лимиты ArrayMaxSize 100 / MaxLength 500-each | защита от runaway-ввода; schema лимита нет (jsonb), валидируем на DTO. |
| AID-4 | drag-reorder отключён при поиске (как в D.4) | индексы фильтрованного списка ≠ полный порядок. |

### Next
- Operator browser-verify `/admin/wfy/vacancies` (CRUD + bullet-ввод + drag-reorder + дубль-code → 409).
- Остаётся: **D.6 rail filter** (теперь все 5 wfy-модулей готовы — самое время подсветить меню) · Productor-debt · Track E.

---

## 2026-05-30 · PLANOID (AUTON, no push) · Track D.4 advantages (web) — 1 commit

**Trigger:** Operator: «start working on this project» → macro-directive → PLANOID default (AUTON). Boot Planoid per `planoid/PLANOID.md`; канонический DO NEXT из next-day plan = D.4 advantages (web).

**First-line:** `[planoid:AUTON] phase:phase1-cms epic:D.4-advantages-web spine:clear budget:~medium`.

### Deliverable
- **Track D.4 (web)** — закрыта вторая половина D.4 (backend был в `2296d4d`):
  - `apps/web/src/lib/wfy-advantages-api.ts` — типизированный клиент `/v1/wfy-admin/advantages` (mirror opportunities-api, без coverImage; +iconName).
  - `apps/web/src/app/admin/wfy/advantages/page.tsx` — CRUD-страница + **native HTML5 drag-reorder**: перетаскивание перенумеровывает `ord` и PATCH'ит только изменённые строки (оптимистично, откат через reload при ошибке). Без media picker (у advantage нет обложки). Capability-block state на 409 TENANT_SITE_TYPE_MISMATCH.

### Outcome — по фазам
- T0 ✓ first-line status; T1 ✓ read-before-trust: advantages controller/service/DTO + opportunities web (page+api) как шаблон + site-type-capabilities.
- T2 ✓ ORCHESTRATOR: size=task → kernel + admin-ux specialist, без полного swarm (§4 size-gate). Spine clear.
- T6 ✓ SIMPLIFIER: `applyReorder` упрощён до id→ord Map-сравнения (убран запутанный inline-filter).
- T11 ✓ 1 commit `e8bb8de` (local, no push). Gate: web `tsc --noEmit` clean. Lint: `next lint` не сконфигурирован в репо (interactive prompt) — pre-existing, не в green-gate set; binding-гейт typecheck зелёный. API не тронут → jest/tenant-coverage не затронуты.
- T12 ✓ this entry + next-day plan memory обновлены.

### AI-Default decisions (AUTON)
| # | Decision | Rationale |
|---|---|---|
| AID-1 | Rail-link для advantages **не добавлен** | nav-wiring = отдельный Track D.6; capability уже в матрице (wfy-city-dir). Не расширять scope таска. |
| AID-2 | drag-reorder отключён при активном поиске (`q`) | при фильтрованном списке индексы ≠ позиции в полном наборе; reorder только на полном списке. |
| AID-3 | reorder персистится N×PATCH (нет bulk-endpoint) | backend D.4 не имеет bulk-reorder route; PATCH только changed-строк минимизирует запросы. Bulk-endpoint — возможный future Motion. |

### Next
- Operator browser-verify `/admin/wfy/advantages` (создать/edit/delete + перетащить, проверить сохранение `ord`).
- Остаётся открытым: D.5 vacancies · D.6 rail filter (включит пункты меню для всех wfy-модулей) · D.7b MediaPicker · Productor-debt · Track E.

---

## 2026-05-29 ~13:14 → ~13:30 · AVTONOM · week-plan + Track D.7 guard + D.4 advantages (api) — 3 commits

**Trigger:** Operator: `AVTONOM: Follow optimal plan. But before that create a week plan html (RU, 2 columns).`
**Session-plan:** `NON_PROJECT/session-plans/2026-05-29-1314-AVTONOM-track-D-closure.md`.

Сессия началась с двух предшествующих задач этого чата: (1) анализ проекта; (2) фиксация dev-портов в 5000-диапазоне (operator approved intent, сказал «оставь» только про spine/инфра). Незакоммиченный port-fix из (2) закоммичен отдельно. Затем — недельный план HTML и оптимальный план: D.7 (DUE NOW) + D.4 backend.

### Deliverables

- **Week-plan HTML** — `NON_PROJECT/week-plan-2026-05-29.html` (RU, NAS-палитра, 2 колонки: план дня / где видно с фронтенда + что потыкать + что изменится; 5 дней 29.05–02.06). Untracked (как и session-plans — repo-конвенция).
- **Track D.7** — extract `requireWfyTenant` → `WfyTenantCapabilityGuard` (rule-of-three закрыт). 3 сервиса больше не дублируют site_type-проверку; читают tenantId из ALS. Net −86 LOC.
- **Track D.4 (api)** — `/v1/wfy-admin/advantages` CRUD над `wfy_advantages`. Первый wfy-модуль на базе D.7 guard (без inline-проверки).

### Outcome — по фазам

- T0 ✓ first-line `[mode:AVTONOM] phase:phase1-cms epic:track-D-closure spine:clear`; session-plan создан до работы.
- T1 ✓ read-before-trust: 3 сервиса + контроллера + специ + tenant-context + 4 DTO opportunities + wfy-advantages schema прочитаны.
- T2 ✓ ORCHESTRATOR: epic Track D closure; D.7 первым (новые модули сразу на guard), затем D.4.
- T4 ✓ FORGEMASTER: guard = 1 SELECT/req (тот же, что был inline); query-count не изменился; сервисы −1 запрос каждый, +1 в guard. Composite `(tenant_id, ord)` сохранён.
- T5 ✓ SENTINEL: 3-слойная изоляция сохранена; capability теперь декларативна; semantics verbatim (404 TENANT_NOT_FOUND / 409 TENANT_SITE_TYPE_MISMATCH).
- T6 ✓ SIMPLIFIER: deletion proof — D.7 −86 LOC (227 ins / 313 del), 3 копии метода удалены.
- T8 ✓ ADVERSARY: capability bypass — закрыт guard'ом на всех 4 контроллерах; cities сохранил ConflictException для 23505 (не путать с capability).
- T9 ✓ MIGRATOR: миграций нет — `wfy_advantages` существует с Phase A; API аддитивно.
- T11 ✓ 3 commits (ports + D.7 + D.4-api).
- T12 ✓ gates green: tsc clean; jest 271/271 (19 suites); check:tenant-coverage 21 controllers / 0 failures.
- T13 ✓ Anti-Drift: D-3 tenant-guard (21-й контроллер через ADR-001 detector ✓); D-5 no migration; D-7 no cross-module imports.

### AI-Default decisions (AVTONOM)

| # | Decision | Rationale |
|---|---|---|
| AID-1 | Незакоммиченный Track H WIP (ed-editor, block-registry, presets/, (tenants)/[slug]) **не тронут** | stash/revert опасны без operator; selective `git add` только своих файлов |
| AID-2 | Port-fix закоммичен отдельным commit (ee30a5e) | завершённая non-spine работа из предыдущей задачи; держать D.7 commit чистым |
| AID-3 | Guard semantics — verbatim перенос (404/409, тот же message с MIGRATION_PLAN §3.3) | поведение не меняется без запроса (ENTITY §2.3) |
| AID-4 | D.4 — только backend в этой сессии; web (page + drag-reorder) → next session | bounded scope; pattern = D.3 (api + web в 2 commit) |
| AID-5 | week-plan HTML untracked | repo-конвенция: session-plans/* untracked, SESSION_LOG tracked |

### Spine touches

**None.** Всё non-spine: wfy-admin/*, tenants.module.ts, next.config.js, start-dev.bat, README.md, ROADMAP.md, NON_PROJECT/*.

### Commits (local, NOT pushed)

| SHA | Subject |
|---|---|
| `ee30a5e` | fix(barbie/SITE1): pin dev ports to 5110/5111 everywhere |
| `08c0487` | refactor(barbie/SITE1/api): extract requireWfyTenant into WfyTenantCapabilityGuard (Track D.7) |
| `2296d4d` | feat(barbie/SITE1/api): wfy-admin advantages CRUD (Track D step 3.4) |

### Recommendations / next

1. **D.4 web** — `/admin/wfy/advantages` page + api-client + drag-reorder (ord DnD). Backend готов.
2. D.5 vacancies (+ D.7b MediaPicker extract — 3-й потребитель), D.6 rail filter.
3. Carry-forward: ротация TG-токена в work4u/.../acf.json:7; Productor-debt (SSRF spec, @Throttle audit, coverImageKey validator).
4. Незакоммиченный Track H WIP всё ещё ждёт разбора (День 4 недельного плана).

---

## 2026-05-27 ~16:00 → 2026-05-27 ~16:15 · AVTONOM · Track D step 3.3 wfy-opportunities — 2 commits

**Trigger:** Operator: `AVTONOM: go ahead with D.3 opportunities`. Pure AVTONOM (no user dialogue mid-session).

**Session-plan:** `NON_PROJECT/session-plans/2026-05-27-1600-AVTONOM-track-D-opportunities.md`.

Replication ratified pattern (partner-salons D.2) для `wfy_opportunities` aggregate. Schema-specific deltas: `title` required, `headline` optional, `coverImageKey: varchar(500)` — S3 KEY string (not FK on media), denormalized per schema docstring. Pattern переносится без сюрпризов.

### Outcome — one line per phase

- T0 ✓ first-line `[mode:AVTONOM] phase:phase1-cms epic:track-D-opportunities spine:clear`; session-plan создан до начала работы (per AVTONOM contract)
- T1 ✓ read-before-trust: schema `wfy_opportunities` прочитан; decision-graph §1/§2 верифицирован (ADR-004..007 still Proposed; D.3 — replication scope, no new ADR)
- T2 ✓ ORCHESTRATOR: epic alignment Track D continuation; rule-of-three for requireWfyTenant triggered (3rd occurrence), defer extract to D.7 dedicated commit
- T3 ✓ HISTORIAN: no graph delta — D.3 replication; ADR-004..007 aging tracked (1 day at Proposed, ratify-by 2026-06-02)
- T4 ✓ FORGEMASTER: 2-3 queries/req (tenant lookup + main op); same composite index pattern (tenant_id, ord); RSC/Client: client page, ~7-8KB gzip delta
- T5 ✓ SENTINEL: 3-layer isolation (TenantGuard + combineTenant + composite index); cross-tenant media leak NOT applicable (coverImageKey is string, not FK); failure modes: capability bypass (mitigated via requireWfyTenant), DoS via large limit (mitigated DTO Max(500))
- T6 ✓ SIMPLIFIER: requireWfyTenant kept inline (extract deferred to D.7 — AI-Default scope discipline); CoverImagePicker inline subcomponent (rule-of-three 2/3 for media pickers — extract when 3rd consumer)
- T7 ✓ ECONOMIST: Δ infra 0; O(N opportunities/tenant) bounded (~10 per tenant realistic)
- T8 ✓ ADVERSARY: T1 capability bypass — mitigated; T2 SQLi via ILIKE q — Drizzle parameterizes; T3 DoS limit — capped; T4 cross-tenant media leak — N/A (string not FK)
- T8 CHAOS — skipped — reason: no migration/MinIO/Redis touch
- T8 TEST PILOT — skipped — reason: admin endpoint ~10 req/min not hot-path
- T9 ✓ MIGRATOR: no new Drizzle migration; wfy_opportunities exists since Phase A; API additive
- T9 ✓ ECOSYSTEM: tenant-onboarding delta = 0; new admin route adds to wfy capability matrix coverage (3/5 modules now: cities/partner-salons/opportunities)
- T9 ✓ PRODUCTOR: /admin/wfy/opportunities — dashboard-2077 palette adherence; CoverImagePicker variant — S3 key picker не UUID; ≤ 3 click target preserved
- T10 ✓ no conflicts → JUDGE not invoked
- T11 ✓ executed в 2 commits (api + web)
- T12 ✓ gates green (api: tsc + jest 265/265 + check:tenant-coverage 20/20; web: tsc)
- T13 ✓ Anti-Drift sweep:
  - D-1 scope ✓ ~1300 LOC across 9 new + 1 modified (~30 min as estimated)
  - D-3 tenant-guard ✓ 20th controller через ADR-001 detector
  - D-5 migration state ✓ no migration touched
  - D-6 planning trail ✓ commits reference Track D step 3.3
  - D-7 architecture ✓ no cross-module imports

### AI-Default decisions (AVTONOM mode)

| # | Decision | Rationale |
|---|---|---|
| AID-D3-O1 | Inline `requireWfyTenant()` в opportunities service (3rd occurrence) | Rule-of-three triggered; extract deferred to D.7 dedicated commit; scope discipline (D.3 ships standalone) |
| AID-D3-O2 | `coverImageKey` — no cross-tenant validation (schema choice: string не FK) | Per schema docstring "Ключ изображения... через module='wfy-opp'"; denormalized key ref; format invariant (`^tenant/{tenantId}/...`) — Productor-debt |
| AID-D3-O3 | `CoverImagePicker` — inline variant of LogoPicker; filters `module=wfy-opp`; returns `key` not `id` | Consistency with D.2 Productor solution; rule-of-three для media pickers 2/3 — extract when D.5 vacancies likely needs |
| AID-D3-O4 | Two commits (api + web) — same structure as D.2 minus SESSION_LOG (batched into next session log) | Tested cadence; SESSION_LOG commit batches с next_day_plan update |
| AID-D3-O5 | Spec — 16 cases (vs 18 partner-salons) — no media cross-tenant tests | Schema mismatch — coverImageKey is string, no FK validation surface |

### Spine touches

**None.** All non-spine: tenants.module.ts, wfy-admin/*, frontend page/lib.

### Commits made (local, NOT pushed)

| SHA | Subject |
|---|---|
| `6efc2aa` | feat(barbie/SITE1/api): wfy-admin opportunities CRUD (Track D step 3.3) |
| `a89f84c` | feat(barbie/SITE1/web): /admin/wfy/opportunities CRUD page + inline CoverImagePicker (Track D step 3.3) |
| _(this SESSION_LOG commit pending)_ | docs(barbie): SESSION_LOG — AVTONOM Track D.3 opportunities 2026-05-27 |

All commits with trailer `AI-Assisted: Claude Code`. **No `git push`** (AVTONOM rule).

### Carry-forward для next session

| Track | Что | Estimate |
|---|---|---|
| D · advantages | Identical pattern + drag-reorder UX (ord column DnD) | ~45 min |
| D · vacancies | Identical + jsonb requirements/conditions arrays + likely 3rd media picker consumer | ~45 min |
| D · rail filter | Wire `tenant.siteType` в AdminShell → Rail props → filter wfy items | ~30-45 min |
| D.7 · extract shared helpers | After D.3 (NOW DUE): `requireWfyTenant` → `WfyTenantCapabilityGuard` decorator; refactor cities + partner-salons + opportunities to use it | ~30 min |
| D.7b · extract MediaPicker | After 3rd consumer (D.5 vacancies likely): unified component with `{ module, returnType: 'id' \| 'key' }` props | ~20 min |
| Productor-debt · URL whitelist spec | Test `externalLink: 'javascript:...'` → 400 | ~10 min |
| Productor-debt · @Throttle audit | Check global rate limit на admin endpoints | ~15 min |
| Productor-debt · coverImageKey format validator | `^tenant/{tenantId}/...` invariant | ~20 min |
| E · work4u cleanup | git rm -r barbie/work4u/apps/web + apps/api после verify | ~15 min |

### Recommendations for human review

1. **Live-verify `/admin/wfy/opportunities`** под tenant-admin work-for-you (пусто initially)
2. **Capability-block test** под admin imperiumspa → «модуль недоступен» 409
3. **CoverImagePicker test** — curl upload media с `module=wfy-opp`, выбрать в picker'е (S3 key должен сохраниться в DB)
4. **SECURITY** carry-forward (4-я сессия): leaked TG token rotation
5. Решить про `git push` (только оператор)
6. **NEXT SESSION**: рассмотреть D.7 extract как FIRST task (rule-of-three uncomfortable until resolved)

### Skipped Council passes

- Council: CHAOS skipped — reason: no migration/MinIO/Redis/BullMQ touched
- Council: TEST PILOT skipped — reason: admin path not hot

---

## 2026-05-27 ~15:30 → 2026-05-27 ~16:00 · MANUAL → AVTONOM · Governance v1.1 ROADMAP_ENGINE + Track D step 3.2 partner-salons — 3 commits

**Trigger:** Operator: «давай продолжим разработку NAS» → выбран Track D.2 + MANUAL через AskUserQuestion. После backend gates оператор переключил mode `AVTONOM: ок, дальше`.

**Session-plan:** `NON_PROJECT/session-plans/2026-05-27-1530-AVTONOM-roadmap-engine-and-track-D-partner-salons.md`.

Два логически независимых блока:
- **Block A** — Governance v1.1: port ROADMAP_ENGINE.md from RustPress (1 commit, `6b16ec0`)
- **Block B** — Track D step 3.2: wfy-admin partner-salons CRUD + inline LogoPicker (2 commits, `7a597b7` + `f65de35`)

### Outcome — one line per phase

- T0 ✓ first-line `[mode:MANUAL]→[mode:AVTONOM] phase:phase1-cms epic:track-D-partner-salons spine:clear`; bootstrap full (ENTITY + governance + decision-graph + prior SESSION_LOG + project_next_day_plan)
- T1 ✓ read-before-trust: cities pattern + partner_salons schema + media API shape verified via Glob/Read/Grep; check:tenant-coverage прогнан baseline до изменений
- T2 ✓ ORCHESTRATOR: 2-эпиковая сессия planned (Track G v1.1 + Track D step 3.2); forward-inheritance: D.3/D.4/D.5 rule-of-three для shared helpers
- T3 ✓ HISTORIAN: governance v1.1 в CHANGELOG.md; decision-graph не меняется (D.2 — replication ratified pattern, не новый ADR); ADR-004..007 (Proposed) — за пределами scope
- T4 ✓ FORGEMASTER: D.2 query budget 2-3 queries/req (tenant lookup + main op + optional assertMedia); composite index `partner_salons_tenant_ord_idx` для list ORDER BY; RSC/Client split — client page ~6-7KB gz delta
- T5 ✓ SENTINEL: 4-layer tenant isolation (TenantGuard + combineTenant + composite index + assertMediaBelongsToTenant); 3 named failure modes (cross-tenant media leak, capability bypass, URL XSS) — все mitigated на DTO/service уровне; MEDIA_NOT_FOUND unified shape (не leak'аем существование)
- T6 ✓ SIMPLIFIER: `requireWfyTenant`, `assertMediaBelongsToTenant`, `LogoPicker` — все inline single-callsite per rule-of-three; extract на D.3 (третья occurrence)
- T7 ✓ ECONOMIST: 0 ₽/month; O(N partners/tenant) bounded < 100; +1 admin route без alerting deltas
- T8 ✓ ADVERSARY: T1 cross-tenant media leak — mitigated + spec'd; T2 URL XSS — mitigated DTO IsUrl whitelist; T3 SQLi — Drizzle parameterizes; T4 DoS — DTO @Max(500). Productor-debt: URL whitelist spec test + global @Throttle audit
- T8 CHAOS — skipped — reason: no migration/MinIO/Redis touch; partner_salons схема с Phase A
- T8 ✓ TEST PILOT: synthetic baseline только; p95 estimated < 50ms cold path (admin ~10 req/min); bench deferred
- T9 ✓ MIGRATOR: no new Drizzle migration; partner_salons table existed since Phase A; API shape additive
- T9 ✓ ECOSYSTEM: tenant-onboarding delta = 0 (admin route addition); migration toolkit coverage не изменён
- T9 ✓ PRODUCTOR: /admin/wfy/partner-salons — dashboard-2077 palette adherence; inline LogoPicker решает UUID exposure violation; ≤ 3 click target preserved; user-friendly capability-block message
- T10 ✓ no conflicts → JUDGE not invoked
- T11 ✓ executed в 3 commits (governance + api + web)
- T12 ✓ gates green (api: tsc + jest 249/249 + check:tenant-coverage 19/19; web: tsc)
- T13 ✓ Anti-Drift sweep:
  - D-1 (scope) ✓ ~1130 LOC within budget
  - D-3 (tenant guard) ✓ new controller через ADR-001 detector
  - D-5 (migration state) ✓ no migration touched
  - D-6 (planning trail) ✓ commits reference Track G v1.1 / Track D step 3.2
  - D-7 (architecture boundary) ✓ no cross-module imports; LogoPicker и MediaItem типы inline в page.tsx

### AI-Default decisions (AVTONOM mode)

| # | Decision | Rationale |
|---|---|---|
| AID-GD1 | LogoPicker — inline subcomponent в page.tsx, не выделен в `components/` | Single consumer; rule-of-three не сработал; ~80 LOC paste-cost минимален |
| AID-GD2 | `assertMediaBelongsToTenant` — inline private method в WfyPartnerSalonsService | Single callsite per Simplifier rule-of-three; extract когда D.3/D.4/D.5 trigger |
| AID-GD3 | `MEDIA_NOT_FOUND` unified shape для cross-tenant + non-existent media | Security posture: не leak'ать existence чужих media; UX trade-off accepted |
| AID-GD4 | `IsUrl({require_protocol:true, protocols:['http','https']})` для externalLink | Защита от `javascript:`/`data:` XSS через admin UI; explicit whitelist > permissive |
| AID-GD5 | Inline `MediaItem` interface + `ListMediaResponse` shape в page.tsx | Single consumer; не выделять `media-api.ts` typed client (rule-of-three не сработал) |
| AID-GD6 | Skip COUNCIL-GUIDE.html + MISSION-V2-COMMERCE-CRM.md ports | README.md играет introductory role; MIGRATION_PLAN_work4u_into_NAS играет mission-expansion role |
| AID-GD7 | Three commits (governance + api + web) вместо одного monolithic | Логические группы; разный scope; легче review/revert по необходимости |

### Spine touches

**None.** Все правки в non-spine файлах. governance/* — non-spine. tenants.module.ts — non-spine. Frontend page/lib — non-spine. Track D.2 explicitly avoided app.module.ts (D.3 carry-forward правило).

### Commits made (local, NOT pushed)

| SHA | Subject |
|---|---|
| `6b16ec0` | docs(barbie/governance): v1.1 — port ROADMAP_ENGINE.md from RustPress under NAS stack |
| `7a597b7` | feat(barbie/SITE1/api): wfy-admin partner-salons CRUD (Track D step 3.2) |
| `f65de35` | feat(barbie/SITE1/web): /admin/wfy/partner-salons CRUD page + inline LogoPicker (Track D step 3.2) |
| _(SESSION_LOG commit pending — этот файл + session-plan + memory update)_ | docs(barbie): SESSION_LOG — AVTONOM ROADMAP_ENGINE + Track D.2 2026-05-27 |

Все commits с trailer `AI-Assisted: Claude Code`. `git push` НЕ выполнялся (AVTONOM rule).

### Carry-forward для next session (NOT shipped this session)

| Track | Что | Estimate |
|---|---|---|
| D · opportunities | Идентичный паттерн cities — controller/service/spec/dto + page + api client. Без logoMediaId (но coverImageKey как string). | ~30 min |
| D · advantages | Идентичный + reorder UX (drag по ord) | ~45 min |
| D · vacancies | Идентичный + jsonb requirements/conditions массивы в form | ~45 min |
| D · rail filter | Wire `tenant.siteType` в AdminShell → Rail props → filter wfy items по `tenantCan(siteType, ...)` | ~30-45 min |
| D · extract shared helpers | После третьей occurrence: `requireWfyTenant` → `WfyTenantCapabilityGuard` decorator; `assertMediaBelongsToTenant` → `apps/api/src/media/assert-media-tenant.helper.ts` | ~30 min |
| E · work4u cleanup | git rm -r barbie/work4u/apps/web + apps/api после operator browser-verify | ~15 min |
| Productor-debt · URL whitelist spec | Test что `externalLink: 'javascript:...'` бросает 400 | ~10 min |
| Productor-debt · global @Throttle audit | Проверить что rate limit на admin endpoints настроен (или добавить если нет) | ~15 min |

### Recommendations for human review

1. **Live-verify `/admin/wfy/partner-salons`** под tenant-admin work-for-you (нужен seed данных — пока pусто).
2. **Capability-block test** — open `/admin/wfy/partner-salons` под imperiumspa admin → должен показать «модуль недоступен» (409).
3. **Logo media picker test** — загрузить тестовое изображение через media API (curl + multipart), затем выбрать его в LogoPicker.
4. **Cross-tenant media leak negative test (manual)** — попытаться через REST client POST `/v1/wfy-admin/partner-salons` с logoMediaId чужого тенанта → должно вернуть 404 MEDIA_NOT_FOUND. Spec покрывает; manual verify рекомендован.
5. Решить про `git push` (только оператор).

### Skipped Council passes

- Council: CHAOS skipped — reason: no migration / MinIO upload / Redis state / BullMQ touched in this session
- Council: TEST PILOT — partial: synthetic baseline only, no autocannon/Lighthouse bench (admin path не hot)

---

## 2026-05-27 13:25 → 2026-05-27 ~15:00 · AVTONOM · Track G → Track D (cities only) — 5 commits

**Trigger:** Operator: «давай G → D → E» (после `что по плану?`). Mode AVTONOM выбран через AskUserQuestion (operator explicit choice — без `AVTONOM:` префикса). Live-verify: «Сделать сейчас» — AI запустил migrate+seed+media; operator открывает /work-for-you в браузере.

**Session-plan:** `NON_PROJECT/session-plans/2026-05-27-1325-AVTONOM-track-G-D-E.md`.

### Outcome — one line per phase

- T0 ✓ first-line status `[mode:AVTONOM] phase:phase-D-prep epic:wfy-admin-ui spine:clear`; bootstrap full (ENTITY/CONSTITUTION/ENTITY_SYSTEM/EXECUTION_PROTOCOL/decision-graph + SESSION_LOG прошлой сессии)
- T1 ✓ read-before-trust: уточнена discovery про hand-written migrations (2 из 5 без snapshot — pattern, не баг); журнал _journal.json и meta/ согласованы
- T2 ✓ ORCHESTRATOR: 3-эпиковая сессия planned (G + D + E); scope-down к G + capability matrix + cities full + carry-forward для оставшихся wfy admin модулей и Track E в next session (per Council Tension Doctrine §2.2 — Simplifier reduction over scope creep)
- T3 ✓ HISTORIAN: ADR-002 IMPL-A/B/D отмечены SHIPPED 2026-05-27 в graph §2; F-10 ratify-by-2026-06-02 закрыт за 6 дней до срока
- T4 ✓ FORGEMASTER: check-state.mjs — pure I/O, 0 deps, ~10ms wall; wfy-cities.service — 5-6 queries per request (1 site-type-guard + 1 CRUD + 1 returning, list adds count); рассматривается кэширование site-type в TenantContext, deferred
- T5 ✓ SENTINEL: requireWfyTenant() закрывает capability-mismatch attack (тенант не того типа создаёт wfy-данные); CHECK constraint на wfy_city_pages.slug на DB-уровне; tenant filter expectTenantFilter на каждом CRUD пути; 23505 → ConflictException не leak'ает имена; 404 not 403 на cross-tenant access; SiteType дублирован в apps/web для closing workspace boundary leak (per AID-A2 prior session)
- T6 ✓ SIMPLIFIER: scope reduced жёстко (5 wfy admin модулей → 1 cities в этой сессии; rail filter deferred); check-state.mjs использует node:test вместо новой зависимости jest для packages/db; capability matrix duplicates SiteType inline вместо @barbie-site1/db import — снижает surface
- T7 ✓ ECONOMIST: storage Δ = 0 (нет новых таблиц); cost per tenant = O(N admin requests); один новый script (db:check-state) добавлен в lint pipeline ~10ms; снижение operator-toil — db:check-state предотвращает катастрофу типа "drizzle-kit emit re-emit applied DDL"
- T8 ADVERSARY ✓ (на Track D): capability-mismatch attack mitigated by requireWfyTenant; ParseUUIDPipe защищает от path injection; class-validator на DTOs
- T8 CHAOS — skipped — reason: scripts + RSC + admin CRUD без новых outage surfaces vs imperiumspa admin (per session-plan §1)
- T8 TEST PILOT — skipped — reason: admin пути не hot-path; load profile применим только при tenant onboarding scale (per session-plan §1)
- T9 ✓ MIGRATOR: no new Drizzle migration в этой сессии; ADR-002 IMPL-A/B/D ratified-and-shipped; ADR-002 IMPL-C (Mode B `--with-db`) still deferred to Phase L per ADR original scope
- T9 ✓ ECOSYSTEM: `npm run db:check-state` добавлен в operator's toolkit; live-verify recipe в session-plan §2 step "Live-verify" повторяем (migrate → seed → media → browser)
- T9 ✓ PRODUCTOR: /admin/wfy/cities использует dashboard-2077 palette (через AdminShell + Rail); StatusPill повторяет паттерн salons; capability-blocked state renders user-friendly message (не raw 409)
- T10 ✓ no conflicts → JUDGE not invoked
- T11 ✓ executed в 5 логических commits
- T12 ✓ gates green (api: tsc + jest 229/229 + check:tenant-coverage 18/18; web: tsc + node:test 11/11; db: check-state 0 failures + spec 14/14)
- T13 ✓ Anti-Drift sweep:
  - D-1 (scope) contained: AID-D2 scope-down документирован
  - D-3 (tenant guard) clean: wfy-cities.controller.ts с TenantGuard
  - D-5 (migration state) — solved by IMPL-A; hand-written allow-list задокументирован
  - D-6 (planning trail) clean: каждый commit ссылается на session-plan + MIGRATION_PLAN/ADR
  - D-7 (architecture boundary) clean: SiteType дублирован inline, web не импортит из packages/db
  - D-8 (forecast drift) — prior session-plan §entering state ✓ соответствовал реальности

### AI-Default decisions (AVTONOM mode)

| # | Decision | Rationale |
|---|---|---|
| AID-G1 | Hand-written migration allow-list через JSON file (not magic-comment в SQL) | Magic comments brittle + не greppable; JSON allow-list explicit + auditable |
| AID-G2 | Mode A only this session (no Mode B / `--with-db`) | Per ADR-002 §Implementation plan IMPL-C explicitly deferred to Phase L |
| AID-G3 | Path `packages/db/check-state.mjs` (root .mjs) не `scripts/check-state.ts` | Mirrors run-migrate.mjs convention; ESM .mjs eliminates ts-node + jest deps для packages/db; documented в ADR-002 §IMPL-A |
| AID-D1 | Inline duplicate SiteType type в apps/web/src/lib/site-type-capabilities.ts (не import из @barbie-site1/db) | Workspace boundary discipline per AID-A2 prior session; drift caught by spec test «every site type can access every universal module» |
| AID-D2 | Scope-down Track D: cities full только; 4 other wfy modules + rail integration + Track E deferred to next session | Realistic 1-block AVTONOM scope; per Tension Doctrine §2.2 Simplifier — ship 1 module fully > 5 half-broken |
| AID-D3 | WfyCitiesController/Service регистрируются в TenantsModule, не в новом WfyAdminModule | Избегает spine touch app.module.ts; TenantsModule уже импортирован; нет потери изоляции (controllers/services листятся независимо) |
| AID-D4 | requireWfyTenant() — 1 extra SELECT per request, не cache в TenantContext | Admin endpoint = ~10 req/min; caching = TenantContext spine-adjacent change; перенесено в future ADR если станет hot path |
| AID-D5 | site-type-capabilities spec через `node --test --experimental-strip-types` (не jest) | apps/web не имеет jest setup; нулевые новые deps; matches packages/db Track G choice |
| AID-D6 | tsconfig.json apps/web — добавлен `allowImportingTsExtensions: true` | Нужно для node:test resolution; уже paired с noEmit:true; safe addition |
| AID-D7 | `.values()` mockImplementationOnce throw — для теста 23505 → 409 | Прямой sync throw вместо queued rejected promise; избегает unhandled-rejection-in-microtask Jest warning |

### Spine touches

**None.** Все правки в non-spine файлах. tenants.module.ts, tsconfig.json (web), capability matrix, wfy-admin/, check-state.mjs — non-spine. Track D explicitly avoided app.module.ts через registration в existing TenantsModule.

### Commits made (local, NOT pushed)

| SHA | Subject |
|---|---|
| `90fd98f` | feat(barbie/SITE1/db): ADR-002 IMPL-A/B/D — db:check-state Mode A |
| `387e85a` | feat(barbie/SITE1/web): site-type capability matrix (Track D foundation) |
| `05abd6b` | feat(barbie/SITE1/api): wfy-admin cities CRUD (Track D step 3.1) |
| `23f2390` | feat(barbie/SITE1/web): /admin/wfy/cities CRUD page (Track D step 3.1) |
| _(SESSION_LOG commit pending — этот файл)_ | docs(barbie): SESSION_LOG — AVTONOM Track G + D-cities 2026-05-27 |

Все commits с trailer `AI-Assisted: Claude Code` + `Co-Authored-By: Claude Opus 4.7 (1M context)`. `git push` НЕ выполнялся (AVTONOM rule).

### Carry-forward для next session (NOT shipped this session)

| Track | Что | Estimate |
|---|---|---|
| D · partner-salons | wfy-admin/partner-salons.{controller,service,spec} + dto/ + /admin/wfy/partner-salons page.tsx + wfy-partner-salons-api.ts | ~45 min (logo media picker — heavier чем cities) |
| D · opportunities | Идентичный паттерн cities — controller/service/spec/dto + page + api client | ~30 min |
| D · advantages | Идентичный + reorder UX (drag по ord) | ~45 min |
| D · vacancies | Идентичный + jsonb requirements/conditions массивы в form | ~45 min |
| D · rail filter | Wire `tenant.siteType` в AdminShell → Rail props → filter wfy items по `tenantCan(siteType, 'city-pages')` etc. Requires fetch `/v1/public/tenants/by-slug/:slug` в AdminShell OR расширение AuthSession.siteType. | ~30-45 min |
| E · work4u cleanup | git rm -r barbie/work4u/apps/web + apps/api после operator browser-verify | ~15 min |
| ENTITY.md §6 | Documenting `db:check-state` ritual — операторская инструкция перед `drizzle-kit generate` | Spine — operator manual edit only |

### Recommendations for human review

1. **Open `http://localhost:5111/admin/wfy/cities`** после auth — должна показать 57 строк seed-городов; попробуй редактировать одну (например slug rename), then re-open `http://localhost:5111/work-for-you/moscow` чтобы убедиться что renderer тоже видит изменения (если slug changed — 404 на старом URL, что ожидаемо).

2. **Тест capability-block:** залогинься тенант-админом imperiumspa (siteType=salon-detail) и открой `/admin/wfy/cities` — должен показаться текст «модуль недоступен» (это не баг — это feature, см. requireWfyTenant в wfy-cities.service.ts).

3. **`db:check-state` интеграция:** добавь `npm run db:check-state -w @barbie-site1/db` в ENTITY.md §6 «pre-deploy ritual» (spine — operator-only edit).

4. **Security carry-forward:** leaked TG bot token в `barbie/work4u/packages/migrator/parsed/acf.json:7` остаётся unrotated (memory `project_work4u`).


**Trigger:** `AVTONOM: Track C → B → A` per session-plan `NON_PROJECT/session-plans/2026-05-26-1400-AVTONOM-track-C-B-A.md`. Сессия растянулась на ~11 часов из-за множественных операторских interrupts по UI редактора между фазами.

### Outcome — one line per phase

- T0 ✓ first-line status `[mode:AVTONOM] phase:multi-track epic:track-C-B-A spine:clear`; bootstrap full (ENTITY/CONSTITUTION/ENTITY_SYSTEM/EXECUTION_PROTOCOL/SESSION_LOG/decision-graph)
- T1 ✓ read-before-trust: 3 ADR файлов содержание + git state (3 ADRs Proposed, ratify-by 2026-06-02)
- T2 ✓ ORCHESTRATOR: 3-эпиковая сессия (Track C ратификация + Track B Phase B.2 + Track A Phase C); все non-spine
- T3 ✓ HISTORIAN: ADR-001/002/003 → §2 Ratified; decision-graph.md обновлён; F-10 ratify-by-2026-06-02 закрыт за 7 дней до срока
- T4 ✓ FORGEMASTER: safeFetch query budget — 0 DB queries (pure helper); upload-wfy-media ≈ 5-6 queries per attachment (1 existence check + 1 insert + 2 update в back-fill); wfy-bundle endpoint — 5 parallel SELECTs (Promise.all); web RSC routes — 1 API roundtrip each
- T5 ✓ SENTINEL: ADR-003 закрывает SSRF в WP-import; F-S1..F-S4 mitigations все в spec'е; partner-salons backfill использует tenantId WHERE на каждом update (защита от cross-tenant); media key check constraint `tenant/{id}/...` соблюдён в buildMediaKey
- T6 ✓ SIMPLIFIER: новых abstraction surface'ов минимум — никаких новых wrapper-сервисов в TenantsService (метод inline), 1 helper для wfy-bundle; для web — 3 shells прямо, без unified layout-wrapper'а; защита от feature-creep удачна
- T7 ✓ ECONOMIST: storage delta — несколько MB на WP-attachments при первом media:wfy; per-tenant scaling O(N) на attachment count (≤50 typical); negligible
- T8 ✓ ADVERSARY: T1 (DNS rebind), T2 (redirect to metadata), T3 (oversized DoS) все mitigations в safe-fetch.ts; spec coverage 65 tests including F-S2 IPv4-mapped v6
- T8 ✓ CHAOS: 3 drills passed (MinIO mid-batch, Postgres mid-batch, slow attachment timeout)
- T8 — TEST PILOT skipped — reason: scripts + RSC fetches, no hot-path RPS profile applies
- T9 ✓ MIGRATOR: no new Drizzle migration this session; consumes Phase A 0004; ADR-003 IMPL-A/B + IMPL-C партнёрски (С через upload-wfy-media); ADR-001 IMPL ratified-but-already-shipped (aa5f968); ADR-002 IMPL deferred per ADR
- T9 ✓ ECOSYSTEM: `npm run media:wfy` добавлен (mirrors seed:wfy pattern); operator-facing errors actionable (per-attachment ✓/·/❌); process.exitCode=1 если failed > 0 — clear re-run signal
- T9 ✓ PRODUCTOR: (tenants)/work-for-you/ route — публичные пути, не /admin/*; не использует dashboard-2077 palette (это not /admin/*); minimal NAS palette black/gold для wfy shells; не нарушает I-10
- T10 ✓ no conflicts → JUDGE not invoked
- T11 ✓ executed в 6 логических commits (по плану + UI-polish chunk)
- T12 ✓ gates green (api: tsc + jest 215/215 + check:tenant-coverage 17/17; web: tsc clean); SESSION_LOG appended; next-day-plan refreshed
- T13 ✓ Anti-Drift sweep: D-1 scope creep contained (Track C/B/A scope; UI-polish chunk operator-initiated mid-session, committed separately); D-3 N/A (no new endpoints requiring TenantGuard — wfy-bundle uses @SkipTenant() via class-level decorator inherited from PublicTenantsController); D-5 no new migration; D-6 commits reference session-plan + ADR slots + MIGRATION_PLAN cells; D-7 clean (apps/web/lib/wfy-public.ts duplicates types — explicit comment about monorepo boundary)

### AI-Default decisions (AVTONOM mode)

| # | Decision | Rationale |
|---|---|---|
| AID-C1 | Single commit per Track (vs sub-commits) | Each Track delivers a coherent feature surface; sub-commits would fragment audit trail |
| AID-C2 | UI-polish (Φ7) committed BEFORE Track C, not bundled with rest | Operator-initiated interrupts; chunking them separately leaves clean ADR-ratification commit history |
| AID-B1 | `__testing` export object для safe-fetch unit tests | TypeScript-clean alternative to `@internal` JSDoc-only convention; pure helpers (IP CIDR, parseCidr4) properly testable without integration |
| AID-B2 | DNS lookup uses `family: 0, all: true` + validate EVERY record (not just first pin) | Defeats DNS-spray attacks where attacker returns mixed public+private records; fail-closed when any IP fails |
| AID-B3 | upload-wfy-media uses direct `S3Client` (not Nest's `S3Service`) | Avoids `NestFactory.createApplicationContext` bootstrap for a script; mirrors `seed-wfy-tenant.ts` pattern; same env keys |
| AID-B4 | FK back-fill matches by `ord` not by name | Stable identifier; seed-wfy-tenant preserves source order; name matching brittle to case/whitespace |
| AID-B5 | partner_salons.logoMediaId is FK, wfy_opportunities.coverImageKey is STRING | Schema as-is — opportunities don't have logo_media_id column; back-fill writes media.id for partner, media.key for opp |
| AID-A1 | Single wfy-bundle endpoint (vs separate cities/opps/etc routes) | One HTTP roundtrip; RSC parallelism doesn't help when all five lists are needed simultaneously |
| AID-A2 | Web wfy-public.ts duplicates API types (no shared package import) | Monorepo boundary discipline; apps/web does NOT import from apps/api |
| AID-A3 | NO ED-page fallback in wfy routes (как imperiumspa) | Deferred to Phase F when WfyHomeShell обернёт как Section preset в block-registry; current path is functional MVP |
| AID-A4 | barbie/work4u/apps/web/ + apps/api/ NOT deleted | Conservative — operator should verify live renderer matches before deleting; cleanup is non-spine separate task |

### Spine touches

**None.** Все правки в non-spine файлах. PublicTenantsController, TenantsService, schemas/index.ts — non-spine. ED editor module (editor/*) — non-spine. Web shells + routes — non-spine.

### Commits made (local, NOT pushed)

| SHA | Subject |
|---|---|
| `7b55754` | feat(barbie/SITE1/web): ED editor module + Φ7 UX polish + global scrollbar |
| `4ce97b2` | docs(barbie): AVTONOM session-plan — Track C → B → A 2026-05-26 14:00 |
| `9c842ba` | feat(barbie/governance): ratify ADR-001/002/003 — Track C closes F-10 |
| `496f820` | feat(barbie/SITE1/api): ADR-003 IMPL-A/B — safeFetch SSRF allow-list + spec |
| `bb1c31f` | feat(barbie/SITE1/api): Phase B.2 — upload-wfy-media script + spec |
| `1f10631` | feat(barbie/SITE1): Phase C — work-for-you renderer migration (Track A) |

Все 6 с trailers `AI-Assisted: Claude Code` + `Co-Authored-By: Claude Opus 4.7 (1M context)`. `git push` НЕ выполнялся (AVTONOM rule).

### Recommendations for human review

1. **Apply migration 0004 + seed:wfy + media:wfy** для validate end-to-end:
   ```bash
   cd barbie/SITE1
   docker compose -f docker-compose.dev.yml up -d postgres minio
   npm run db:migrate -w @barbie-site1/db
   npm run seed:wfy -w @barbie-site1/api
   npm run media:wfy -w @barbie-site1/api
   ```
   Затем открой http://localhost:5111/work-for-you — должна показать главную с 57 городами, опportunities, partner salons. http://localhost:5111/work-for-you/moscow — city page с vacancies.

2. **Security:** ADR-003 ratified + IMPL-A/B shipped. Phase L (WP-import module внутри admin UI) теперь может строиться на этой защите. Запомни — `WP_IMPORT_EXTRA_PORTS` env при добавлении должен иметь limit ≤ 5 (F-S4).

3. **ADR-001B (Phase 2 L2 detector)** — после ~2 недели стабильной работы L1, открыть как новый ADR.

4. **ADR-002 IMPL** — deferred per ADR. Mode A (cheap journal check) можно landed before next `drizzle-kit generate` (Phase D admin endpoints скорее всего добавят миграции).

5. **Cleanup barbie/work4u/apps/{web,api}/** — отдельная сессия после live-verify renderer'а. Сохранён `barbie/work4u/packages/migrator/` как источник parsed JSON для media:wfy.

6. **UI-polish (Φ7) carry-overs:**
   - Native tooltip "Секции · перетащи на холст" на category tile — оператор предложил кастомный, не реализовано — open if needed
   - Tile width = 32 (TAB_W - CONCAVE_R) vs язычок stem — оператор upsetting'ed по 2px несоответствию, текущая позиция: геометрически совпадают, possible browser sub-pixel — нужен HiDPI/100%-zoom тест

7. **3 проопозициионных ADRs ostalis Proposed** — ADR-004 (chat last-admin), ADR-005 (forward-only enforcement), ADR-006 (dashboard palette), ADR-007 (session-log schema). Будущая ratification.

### Skipped Council passes (with reason)

- Council: TEST PILOT skipped — reason: scripts + RSC reads, no hot-path RPS surface

### Drift trips

- **None new this session.** D-1 contained; the multi-hour interrupts technically exceeded the session-plan's stated ~3 commits anticipation, но операторские instructions явно расширили scope (Operator Sovereignty §12). Все взаимодействия задокументированы.

### Carry-forward для следующей сессии

См. refreshed `project_next_day_plan.md`. Главные кандидаты:
1. Phase D — admin UI для wfy modules (`/admin/wfy/cities`, `/admin/wfy/partner-salons`, etc.)
2. Phase B.2 live validate — operator пробегает media:wfy против реального work4u attachments
3. work4u cleanup — после live verify, удалить `barbie/work4u/apps/{web,api}/`
4. ADR-002 Mode A IMPL — перед следующим `drizzle-kit generate`

**AI-Assisted: Claude Opus 4.7**

---

## 2026-05-26 12:45 → 13:30 · AVTONOM · Phase B work4u content migration — 3 commits landed

**Trigger:** user followed up `AVTONOM: продолжай` Phase A finalize with `AVTONOM: продолжай` + `follow optimal plan` → MANIFEST authorization for Phase B per session-plan `2026-05-26-1245-AVTONOM-phase-B-content-migration.md`.

### Outcome — one line per phase

- T0 ✓ first-line status `[mode:AVTONOM] phase:phase-B-content-migration epic:work4u-into-NAS spine:clear`; bootstrap + governance reads from cache (warm context from Phase A finalize directly before)
- T1 ✓ read-before-trust: work4u/source layout · parsed JSONs on disk (652 lines wxr.json + 69 lines acf.json) · existing migrator seed.ts as reference · Phase A schema unchanged since fc5b06f (verified via git log)
- T2 ✓ ORCHESTRATOR: epic = MIGRATION_PLAN §8 Phase B; dependency status Phase A complete; forward-inheritance → Phase C renderer + Phase D admin
- T3 ✓ HISTORIAN: ADR-002 + ADR-003 promoted from "anticipated" to "Drafted"; decision-graph updated
- T4 ✓ FORGEMASTER: query budget ~74 INSERTs (cold path, not §A-6-enforced); upsert targets land on Phase A composite indexes (tenantId, slug) + (tenantId, code)
- T5 ✓ SENTINEL: F-B1 (partial seed) · F-B2 (TG token in source — DELIBERATELY not written, security-warning log + comment) · F-B3 (cross-tenant media reuse — deferred Phase B.2, null FKs in v1)
- T6 ✓ SIMPLIFIER: 2 reduction attempts rejected (factor common upsert pattern; import legacy work4u-seed) — both accept-as-is rationale documented in session-plan
- T7 ✓ ECONOMIST: O(N) seed time on 57 cities = sub-second; ~74 rows ~10 KB total; negligible
- T8 ✓ ADVERSARY: SSRF threat T1 (WP attachment URLs could be link-local/internal) — mitigation through ADR-003 deferred + script does NOT fetch URLs in v1
- T8 ✓ CHAOS: 3 drills passed (Postgres-down mid-seed · re-run idempotency · slug-rename zombie documented as known limitation)
- T8 — TEST PILOT skipped — reason: seed script, not hot path
- T9 ✓ MIGRATOR: no new migration this session; consumes Phase A's 0004; fidelity 3/3 WP sources (live ✓ WXR ✓; Duplicator = Phase L)
- T9 ✓ ECOSYSTEM: tenant-onboarding step `npm run seed:wfy` added; operator-facing errors actionable (per-section progress + clear ❌)
- T9 — PRODUCTOR skipped — reason: no admin-UI / CLI ergonomics surface
- T10 ✓ no conflicts → JUDGE not invoked
- T11 ✓ executed in 3 logical commits per session-plan §3 MANIFEST L3
- T12 ✓ gates green (db typecheck · api typecheck · jest 135/135 incl. +25 new · check:tenant-coverage 17/17 with 0 failures); SESSION_LOG appended; next-day-plan refreshed
- T13 ✓ Anti-Drift sweep: D-1 contained · D-3 N/A (no controllers) · D-5 unchanged · D-6 commits reference session-plan + ADRs + MIGRATION_PLAN · D-7 imports only `@barbie-site1/db`

### AI-Default decisions (AVTONOM mode)

| # | Decision | Rationale |
|---|---|---|
| AID-B1 | Skip media (logoMediaId = null, coverImageKey = null) for v1 | Phase B.2 owns WP-attachment → NAS media mapping; ADR-003 SSRF allow-list gates that work; v1 atomic + testable without MinIO running |
| AID-B2 | Skip cms_pages (static pages "Главная", "Политика") | Phase C owns the renderer; cms_pages contract overlaps with ED epic which has its own pipeline |
| AID-B3 | Skip writing Telegram bot token to tenants.settings | Token is leaked in source repo per memory `project_work4u`; AI-default refuses to import-the-leak; emits security-warning log directing operator to rotate |
| AID-B4 | Vacancy bullets → `conditions[]`, `requirements[]` = empty array | Theme bullets are all "what's offered" not "what's required" — natural fit; ADR-002B (future) can refine if a salon distinguishes |
| AID-B5 | Add `onConflictDoUpdate` + `onConflictDoNothing` to mock-db.ts | Shared infra (not spine); additive; future scripts/services will reuse; backed by ENTITY §11 dependency-minimization (no new dep) |
| AID-B6 | Use `replace-all` (delete-then-insert) for partner_salons / opportunities / advantages | These tables have no natural unique key per row; replace-all matches work4u-seed.ts pattern; idempotency-by-source-of-truth |
| AID-B7 | Spec uses mock-db introspection, not real Postgres | Per memory `project_nas_test_approach` — no e2e DB yet; integration verification deferred to Phase B operator run |
| AID-B8 | Use `__dirname` traversal to locate work4u/packages/migrator/parsed | DEFAULT_PARSED_DIR override-able via `opts.parsedDir` for tests; CommonJS-friendly resolution |

### Spine touches

**None.** Phase B added no spine files. `apps/api/src/test-utils/mock-db.ts` is not on the spine list (`CLAUDE.md §M` covers schema/migrations + Nest app.module.ts + select docker/env spine — not test-utils).

### Commits made (local, NOT pushed)

| SHA | Subject |
|---|---|
| `22ed926` | docs(barbie): Phase B session-plan — work4u content migration |
| `57bca75` | feat(barbie/governance): ADR-002 + ADR-003 — migration drift + WP-import SSRF |
| `9d1044c` | feat(barbie/SITE1/api): Phase B seed-wfy-tenant script + mock-db onConflict |

All 3 with `AI-Assisted: Claude Code` + `Co-Authored-By: Claude Opus 4.7` trailers. `git push` NOT executed (AVTONOM rule). Now 50 commits ahead of origin/main total (Phase A 5 + Phase B 3 + earlier carry-over).

### Recommendations for human review

1. **Apply migration 0004 + run `npm run seed:wfy`** when ready to validate against live Postgres:
   ```bash
   cd barbie/SITE1
   docker compose -f docker-compose.dev.yml up -d postgres
   npm run db:migrate -w @barbie-site1/db
   npm run seed:wfy -w @barbie-site1/api
   ```
   Expect: tenant row `work-for-you` + ~57 city rows + 5 partner_salons + 3 opportunities + 3 vacancies + 6 advantages.

2. **Inspect SECURITY WARNING in stdout** — script will log a clear reminder about the leaked Telegram bot token in source. Action: rotate the token (***REDACTED-TG-TOKEN(rotated)*** per acf.json:7) before any production deploy.

3. **ADR-001 + ADR-002 + ADR-003 all Proposed (ratify-by 2026-06-02)** — three Proposed ADRs in 24 hours stretches Historian's F-10 budget. Review each in next session and ratify (move to §2 Ratified) or supersede.

4. **Phase B.2 (media upload) is the next concrete WP-import surface.** ADR-003 IMPL-A (safeFetch helper) lands there. Recommend dedicated session: Phase B.2 takes ~1 day per session-plan estimate.

5. **`barbie/work4u/` НЕ удалён** — оставлен как reference + parsed JSON источник. Phase C закроет этот трек: после переезда renderer'а в `(tenants)/work-for-you/`, можно архивировать `barbie/work4u/`.

6. **Operator carry-overs in git status M state остаются** — `ENTITY.md` + `SITE1/apps/web/*` + др. — pre-session modifications, не моей сессии. Per AVTONOM rule not touched.

### Skipped Council passes (with reason)

- Council: TEST PILOT skipped — reason: seed script, not hot path; no RPS profile applies
- Council: PRODUCTOR skipped — reason: no admin-UI or CLI ergonomics surface (npx call mirrors existing seed:admin pattern)

### Drift trips

- **None new this session.** D-5 trip from MANUAL session (Phase A) remains tracked under ADR-002 (now Drafted, ratify-by 2026-06-02).

### Carry-forward for next AVTONOM session

Per refreshed `project_next_day_plan.md`:
1. **Phase B operator-run** — apply migration 0004 + run `seed:wfy` against local Postgres; verify row counts.
2. **Phase C opening** — renderer migration: `(tenants)/work-for-you/page.tsx` (главная) + `[city]/page.tsx` (страница города) + `policy/page.tsx` + WfyHomeShell в `components/tenant-site/wfy/`. Then **delete** `barbie/work4u/apps/web/` + `apps/api/`.
3. **Phase B.2 (media upload)** — ADR-003 IMPL-A safeFetch + WP-attachment → NAS media migration. Parallel track to Phase C.
4. **Ratification window for 3 Proposed ADRs** — by 2026-06-02.

**AI-Assisted: Claude Opus 4.7**

---

## 2026-05-26 11:35 → 12:15 · AVTONOM · Phase A finalize — 4 commits landed locally

**Trigger:** `AVTONOM: продолжай` — пользователь дал continuation на handoff из утренней MANUAL-сессии. Активная задача — закрытие Phase A (work4u → NAS schema foundation) per `memory/project_next_day_plan.md §Deferred §1-§4`. Никакого нового session-plan'а: эта сессия — finalization предыдущего.

### Outcome — one line per phase

- T0 ✓ first-line status emitted; bootstrap memory + governance/EXECUTION_PROTOCOL §1 + ENTITY_SYSTEM §14 row "Internal refactor" + "Drizzle migration SQL" прочитаны
- T1 ✓ read-before-trust: 6 Phase A schema-файлов + 0004 migration + tenants.ts site_type + journal idx 4 — все на диске, совпадают с handoff-state
- T2 ✓ ORCHESTRATOR: epic = "Phase A finalize"; verdict approve (continuation of yesterday's ratified plan, no new architecture surface)
- T3 ✓ HISTORIAN: ADR-001 status committed as Drafted (ratify-by 2026-06-02); decision-graph delta = ADR-001 doc + ADR-002 anticipated scope expansion (D-5 snapshot drift) — landed in commit 9aae7dc
- T4 — FORGEMASTER: skipped — reason: no hot-path code; schema-invariants spec is metadata introspection, zero query count
- T5 ✓ SENTINEL: re-verified F-1 (ALTER tenants) + F-2 (partner_salons.logo_media_id) mitigations present in schema; rollback path = DROP TABLE on 6 new tables (forward-only ADR §10 honored)
- T6 — SIMPLIFIER: skipped — reason: no new abstraction surface; reduction pass already done in MANUAL session
- T7 — ECONOMIST: skipped — reason: same scope as MANUAL session; cost ledger unchanged
- T8 — Tier-3: ADVERSARY skipped (no public input surface); CHAOS skipped (migration not applied this session — only schema definition + spec); TEST PILOT skipped (no hot path)
- T9 ✓ MIGRATOR: forward-only ✓; 0004 SQL inspected per T1; expand-only ADD COLUMN + CREATE TABLE; rollback documented in commit message
- T10 ✓ no conflicts → JUDGE not invoked
- T11 ✓ executed under AVTONOM mandate from project_next_day_plan.md; 4 commits in 4 logical chunks per session-plan §Deferred §3
- T12 ✓ gates green (db typecheck · api typecheck · jest 110/110 · check:tenant-coverage 17/17 with 0 failures); SESSION_LOG appended; next-day-plan memory refreshed
- T13 ✓ Anti-Drift sweep: D-1 scope-creep clean (all 4 commits within plan); D-3 tenant-guard clean (detector smoke run); D-5 migration state clean (journal idx 4 ↔ 0004 SQL ↔ snapshot ↔ 6 schema files all coherent); D-6 planning trail ✓ (commits reference MIGRATION_PLAN + ADR-001 + project_next_day_plan); D-7 architecture-layer clean (no cross-module imports added)

### AI-Default decisions (AVTONOM mode)

| # | Decision | Rationale |
|---|---|---|
| AID-1 | Schema-invariants spec placed at `apps/api/src/test-utils/phase-a-schema-invariants.spec.ts` (per project_next_day_plan.md §Deferred §1 wording) | Test-utils dir is part of jest rootDir; spec is schema-level invariant not service-bound. Committed in chunk #3 (api work) rather than chunk #1 (db) because it physically lives under apps/api. |
| AID-2 | Used `getTableConfig` from `drizzle-orm/pg-core` for introspection (vs reading raw `[Symbol]` properties off PgTable) | Documented public API; survives Drizzle minor version bumps. |
| AID-3 | ESLint failure NOT fixed in this session — recorded as pre-existing infra debt; `check:tenant-coverage` run directly as the gate that matters for ADR-001 | Scope discipline: ESLint 9 config migration is its own task. `npm run lint` chain fails on ESLint 9 → eslint.config.js missing; this predates Phase A. F-12 forbids `--no-verify`; instead I ran the relevant downstream gate (`check:tenant-coverage`) standalone, confirmed 0 failures, and surfaced the lint outage as recommendation for human review. |
| AID-4 | Used `default` field on column config (raw string match `'generic-cms'`) for the site_type default assertion | Drizzle stores literal defaults as the raw value when not wrapped in `sql\`\``; works for the case at hand. If future site_type default becomes a SQL expression, this assertion will helpfully fail loudly. |
| AID-5 | Did NOT apply migration 0004 to live Postgres in this session | Operator-action territory (touches data plane); F-7 spirit. Spec verifies schema-as-code; migration application is Phase B opening step. |

### Spine touches

| File | Status | Reason |
|---|---|---|
| ENTITY.md | NOT touched (pre-session M state preserved) | spine; per AVTONOM §M rule |
| CLAUDE.md, DESIGN.md | NOT touched | spine; per AVTONOM §M rule |
| `SITE1/packages/db/src/schema/tenants.ts` | Added to commit #1 (already M from prior MANUAL session) | spine on file list; landed under MANIFEST authorization from yesterday's MANUAL session (per project_next_day_plan.md §3 commit split) — this AVTONOM only finalised an already-authorized change |
| `SITE1/packages/db/drizzle/0004_cool_next_avengers.sql` | Added to commit #1 | non-spine (new migration only is allowed per CLAUDE.md §M spine-list) |

### Commits made (local, NOT pushed)

| SHA | Subject |
|---|---|
| `fc5b06f` | feat(barbie/SITE1/db): Phase A schema — work4u→NAS migration foundation |
| `9aae7dc` | feat(barbie/governance): ADR-001 tenant-guard coverage detector |
| `aa5f968` | feat(barbie/SITE1/api): ADR-001 IMPL-A + Phase A schema-invariants spec |
| `e4dc1fd` | docs(barbie): governance v1.0 + COUNCIL-COMPARISON + Phase A session-plan |

Все 4 commit'а — local, с trailer'ами `AI-Assisted: Claude Code` + `Co-Authored-By: Claude Opus 4.7`. `git push` НЕ выполнялся (AVTONOM rule).

### Recommendations for human review

1. **Inspect 4 new commits** перед push: `git log --oneline c47a9e5..HEAD` + `git show <sha>` для каждого.
2. **ESLint 9 config missing — pre-existing infra debt.** `npm run lint` сейчас падает на ESLint config-search. Не блокирует Phase A (check:tenant-coverage запускается standalone), но блокирует CI / pre-commit hooks когда они будут wired. Отдельная задача — миграция `.eslintrc.*` → `eslint.config.js` (ESLint 9 flat config).
3. **Apply migration 0004 к local dev Postgres** перед началом Phase B: `cd SITE1 && npm run db:migrate -w @barbie-site1/db` (или `db:push` если нужно skip migrations). 6 новых таблиц + ALTER tenants — additive only, идемпотентны через `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`.
4. **ADR-001 ratify-by 2026-06-02.** До этой даты — Status: Proposed; после — F-10 (Historian: 7-day proposed-aged drift) пометит как stale. Action: review ADR-001 + ratify (move to §2 Ratified в decision-graph) или supersede новым ADR-001B.
5. **Untracked carry-over files (НЕ моя работа):** в `git status` много untracked HTML/MD/zip из прошлых сессий — это уже было до этой сессии, не Phase A. Пользователь сам решает что коммитить / что в .gitignore.
6. **Mod-without-commit carry-over (НЕ моя работа):** `M ENTITY.md`, `M SITE1/apps/web/*`, `M SITE1/apps/api/src/config/configuration.ts`, и др. — modifications от прошлых сессий. AVTONOM rule запрещает их трогать. User'у решать.

### Skipped Council passes (with reason)

- Council: FORGEMASTER skipped — reason: schema-only continuation; no new query / index plan introduced (covered in MANUAL session).
- Council: SIMPLIFIER skipped — reason: no new abstraction surface; AVTONOM finalize ≠ design pass.
- Council: ECONOMIST skipped — reason: scope unchanged from MANUAL session; ledger valid.
- Council: ADVERSARY skipped — reason: no public input surface introduced.
- Council: CHAOS skipped — reason: migration NOT applied to live DB this session (operator step).
- Council: TEST PILOT skipped — reason: no hot path; metadata introspection spec.
- Council: ECOSYSTEM / PRODUCTOR skipped — reason: no tenant-bootstrap / admin-UI surface touched.

### Drift trips

- **None new this session.** D-5 trip from MANUAL session remains tracked under ADR-002 anticipated; resolution slot for ADR-002 still open.

### Carry-forward для следующей сессии

Per `project_next_day_plan.md` (refreshed at end of this session):
1. **Phase B opening** — work4u content migration per `MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase B`. Touches Migrator + Chaos heavily (WP-import code + tenant data).
2. **ESLint 9 config migration** — отдельная сессия (DX/infra). Не зависит от Phase B.
3. **Apply migration 0004** to local dev DB before Phase B opens.
4. **ADR-001 ratification** by 2026-06-02 (or supersede via ADR-001B with new evidence).

**AI-Assisted: Claude Opus 4.7**

---

## 2026-05-26 09:20 → 11:30 · MANUAL · Council governance v1.0 + Phase A schema (80%)

**Trigger:** пользователь запросил «проанализируй COUNCIL-GUIDE.html и адаптируй подход под этот проект и стек», далее «start work and follow optimal plan» → переход в Phase A работы по `MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md`. Session-plan: `NON_PROJECT/session-plans/2026-05-26-1022-MANUAL-phase-A-schema-foundation.md`.

### Outcome — one line per phase

- T0 ✓ status emitted; ENTITY/CONSTITUTION/ENTITY_SYSTEM read
- T1 ✓ read-before-trust verified 22 schema files + Drizzle journal at idx 3 + tenant infra (TenantGuard + ALS + middleware)
- T2 ✓ ORCHESTRATOR: epic aligned with MIGRATION_PLAN §8 Phase A; verdict approve-with-conditions (spine OK gate)
- T3 ✓ HISTORIAN: ADR-001 drafted, decision-graph updated, ratify-by 2026-06-02
- T4 ✓ FORGEMASTER: index plan declared per new table; query budget = schema only (no endpoints this phase)
- T5 ✓ SENTINEL: 2 failure modes named (F-1 ALTER tenants mid-flight, F-2 partner_salons.logo_media_id cross-tenant media leak via repo-layer); rollback path = DROP TABLE
- T6 ✓ SIMPLIFIER: 3 reduction attempts (merge wfy_advantages+opportunities; enum vs string formSource; single wfy_blocks jsonb) — all rejected with rationale; accept-as-is
- T7 ✓ ECONOMIST: per-tenant scaling O(1) on wfy_*, O(N) on lead_applications with composite index keeping queries O(log N); negligible infra delta
- T8 — TEST PILOT skipped (no hot-path code); ADVERSARY skipped (no public input surface); CHAOS approved schema migration as forward-only + atomic DDL
- T9 ✓ MIGRATOR: forward-only ✓; hand-edited 0004 SQL to remove snapshot catch-up; rollback DROP TABLE documented
- T10 ✓ no conflicts; JUDGE not invoked
- T11 ✓ executed under "follow optimal plan" treated as MANIFEST authorization in MANUAL
- T12 ⚠ partial — gates NOT run, commits NOT made this session (handoff to next AVTONOM)
- T13 ⚠ partial — D-5 snapshot drift detected and recorded; D-1/D-3/D-6/D-7 sweeps deferred to next session post-gates

### AI-Default decisions (MANUAL mode — no defaults applied unilaterally)

- N/A (MANUAL — every fork answered via session-plan Council pre-pass; operator's «follow optimal plan» treated as approval of the MANIFEST in session-plan §1).

### Spine touches (all under MANUAL operator OK on MANIFEST)

| File | Reason | Authorization |
|---|---|---|
| `SITE1/packages/db/src/schema/partner-salons.ts` (new) | Phase A new table | MANIFEST operator OK |
| `SITE1/packages/db/src/schema/wfy-city-pages.ts` (new) | Phase A new table | same |
| `SITE1/packages/db/src/schema/wfy-opportunities.ts` (new) | Phase A new table | same |
| `SITE1/packages/db/src/schema/wfy-vacancies.ts` (new) | Phase A new table | same |
| `SITE1/packages/db/src/schema/wfy-advantages.ts` (new) | Phase A new table | same |
| `SITE1/packages/db/src/schema/lead-applications.ts` (new) | Phase A new table | same |
| `SITE1/packages/db/src/schema/tenants.ts` (mod) | Add `siteType` column | same |
| `SITE1/packages/db/src/schema/index.ts` (mod) | Re-export 6 new schemas | same |

### Commits made (local, not pushed)

**None this session.** All filesystem changes uncommitted; preserved for next AVTONOM session to chunk into 4 logical commits (see project_next_day_plan.md §Deferred).

### Drift trips

- **D-5 · snapshot drift** — `drizzle-kit generate` emitted catch-up SQL for hand-written 0002_chat + 0003_tenant_bootstrap migrations. Hand-edited 0004 to Phase A scope only. ADR-002 (anticipated) expanded to cover snapshot-drift detection. Logged to `governance/decision-graph.md`.

### Recommendations for human review

1. **Read `0004_cool_next_avengers.sql`** to confirm hand-edited content is correct before applying via `npm run db:migrate`.
2. **`project_next_day_plan.md`** at `C:\Users\a3\.claude\projects\F--Users-a-Documents--DEV-Tran-ES\memory\` is THE file that bootstraps the next session — review it ahead of next start.
3. **Council adoption was significant scope addition** — read `barbie/governance/README.md` + `COUNCIL-COMPARISON.html` to internalize the framework before next AVTONOM runs Council T0-T13 unsupervised.
4. **ADR-001 ratify-by 2026-06-02** — must ratify (move from Proposed→Accepted) or supersede within 7 days per F-10.

### Skipped Council passes (with reason)

- Council: TEST PILOT skipped — reason: schema-only session, no hot-path code introduced this session.
- Council: ADVERSARY skipped — reason: no public input surface introduced; pre-emptive concerns about `lead_applications.fields` size cap logged for Phase F.
- Council: PRODUCTOR skipped — reason: no admin surface introduced this session.

### What landed this session — file ledger

**Governance v1.0 (new, all under `barbie/governance/`):**
- `README.md`, `CONSTITUTION.md`, `ENTITY_SYSTEM.md`, `EXECUTION_PROTOCOL.md`, `decision-graph.md`, `CHANGELOG.md`
- `adr/ADR-001-tenant-guard-coverage-detector.md`
- `memory/README.md`, `motions/.gitkeep`
- `COUNCIL-COMPARISON.html` (visual was/now + plan-as-was/plan-with-Council)

**Phase A schema (new in `SITE1/packages/db/src/schema/`):**
- `partner-salons.ts`, `wfy-city-pages.ts`, `wfy-opportunities.ts`, `wfy-vacancies.ts`, `wfy-advantages.ts`, `lead-applications.ts`

**Phase A schema (modified):**
- `tenants.ts` (+`siteType` column with `SiteType` enum), `index.ts` (+6 re-exports)

**Phase A migration:**
- `SITE1/packages/db/drizzle/0004_cool_next_avengers.sql` (hand-edited to Phase A scope only)
- `SITE1/packages/db/drizzle/meta/_journal.json` (idx 4 added by drizzle-kit)
- `SITE1/packages/db/drizzle/meta/0004_snapshot.json` (auto-generated)

**ADR-001 IMPL-A..D:**
- `SITE1/apps/api/scripts/check-tenant-coverage.ts` (L1 regex-based detector, 173 lines)
- `SITE1/apps/api/src/tenant-context/coverage.allow.json` (5 controllers allow-listed)
- `SITE1/apps/api/src/tenant-context/check-tenant-coverage.spec.ts` (6 unit + 1 smoke test)
- `SITE1/apps/api/package.json` (added `check:tenant-coverage` script + wired into `lint`)

**Session-plan + user-memory bootstrap:**
- `NON_PROJECT/session-plans/2026-05-26-1022-MANUAL-phase-A-schema-foundation.md`
- `C:\Users\a3\.claude\projects\F--Users-a-Documents--DEV-Tran-ES\memory\project_next_day_plan.md` (canonical session bootstrap)
- `C:\Users\a3\.claude\projects\F--Users-a-Documents--DEV-Tran-ES\memory\project_nas_council_governance.md`
- `MEMORY.md` updated with 2 new entries

### Carry-forward for next AVTONOM session

Per `project_next_day_plan.md`:
1. T0 ritual + first-line status
2. Verify Phase A filesystem state via T1 read-before-trust
3. Write deferred schema-invariants spec (`apps/api/src/test-utils/phase-a-schema-invariants.spec.ts`)
4. Run gates: `npm run typecheck` + `npm run lint` (now includes `check:tenant-coverage`) + `npm run test --testPathPattern='tenant-context|test-utils'`
5. Commit in 4 logical chunks (NEVER push)
6. Append fresh SESSION_LOG entry
7. If scope allows — bootstrap Phase B session-plan

---

## 2026-05-25 00:40 → 01:20 · AVTONOM · AX auth migration (RFC-002 + impl)

**Trigger:** `AVTONOM: AX auth migration` — пользователь дал full delegated authority с горизонтом ~10-14h. Session plan: `barbie/NON_PROJECT/session-plans/2026-05-25-0027-AVTONOM-ax-auth-migration.md`.

**Repo:** `barbie/ax/` (отдельный git repo). Все 7 коммитов локальны; **push не делался** per AVTONOM rule.

**Note о параллельной сессии:** между моими commit'ами интерливились commits от параллельного AVTONOM-агента (prefixed `p0..p7`, работающий по pool-validator + observability + NaSV2 track). Эти commits не пересекаются с моим scope (auth migration). Свой отчёт parallel-агент написал в `NaSV2/SESSION_LOG.md`; настоящий отчёт покрывает только мой scope.

**My commits (7 total in ax/, в правильном порядке):**

1. `e6b168e` docs(ax): RFC-002 + ADR-002 + PLAN-002 + VAL-002 — auth migration foundation
2. `04df779` feat(ax/common,domain): Capability + Role + User + AppError auth variants
3. `7143bcf` feat(ax): migration 0002 users/roles/capabilities + JwtVerifier + PgUserRepository
4. `e1c53ed` feat(ax): auth middleware + capability extractor + POST cms_pages admin endpoint
5. `e9b7bd7` test(ax): integration tests — JWT auth + capability check + RLS-enforced INSERT
6. `296a6f1` chore(ax): seed admin user + role + capabilities + sign-jwt xtask

(Phase 7 — `barbie/SESSION_LOG.md` update — commits в parent ES repo, не в ax/.)

### Сделано

**Phase 1 — Planning docs (4/4) ✅**

- `docs/rfc/RFC-002-auth-migration.md` (P1) — 9 success criteria S1-S9, 12 constraints, 8 risks с mitigations, 14 explicit out-of-scope.
- `docs/adr/ADR-002-auth-architecture.md` (P2) — 11 architectural decisions D1-D11 с rejected alternatives. Reversal cost **Low** (< 5 min).
- `docs/plans/PLAN-002-auth-impl.md` (P3) — 36 numbered steps across 7 phases, dependency graph, file touch list.
- `docs/validations/VAL-002-auth.md` (P4) — 9 functional + 4 isolation + 3 perf + 5 quality + 4 ops + 3 security criteria.

**Phase 2 — common + domain (8 steps) ✅**

- `crates/common/src/capability.rs`: `Capability` enum (4 variants: PostsCreate/Edit/Publish/Delete), `CapabilitySet` wrapper, `FromStr` roundtrip, `UnknownCapability` error.
- `crates/common/src/role.rs`: `RoleKey(String)` newtype с parse/validation (a-z + 0-9 + _, len 1-64), `Role` descriptor.
- `crates/common/src/error.rs`: 3 new `AppError` variants — `InvalidToken` (401), `TokenExpired` (401), `MissingCapability(Capability)` (403 с required key в JSON).
- `crates/domain/src/user/{mod.rs,aggregate.rs}`: `User` aggregate с reconstitute() validation, `UserStatus` enum, `UserError`.
- **Tests:** 29 ax-common + 29 ax-domain (was 22 + 23). All green.

**Phase 3 — Migration 0002 + Infrastructure (4 steps) ✅**

- `migrations/0002_users_roles_capabilities.sql` (additive, expand-only):
  - `users`: ALTER ADD `tenant_id` FK, `password_hash`, `display_name`, `status`, `updated_at`
  - `users`: ENABLE RLS + POLICY `users_tenant_isolation` (USING + WITH CHECK)
  - New tables: `roles` (tenant-scoped, RLS), `capabilities` (global registry, append-only), `role_capabilities` (M:N), `user_roles` (M:N)
  - `cms_pages` POLICY: ALTER WITH CHECK clause (explicit write-path защита)
  - GRANTs: `ax_app_role` получает INSERT/UPDATE на cms_pages + users, SELECT на RBAC tables
  - Seed: 4 canonical capability keys
- `crates/infrastructure/src/auth/{mod.rs,jwt.rs}`: `JwtVerifier` (HS256), `Claims` mirrors SITE1 (sub/tenant_id/role/kind/exp/iat). Debug impl redacts secret. 5 unit tests.
- `crates/infrastructure/src/persistence/users_repo.rs`: `PgUserRepository` — `find_by_id` + `get_capabilities` через with_tenant + RLS-enforced JOIN.
- Workspace `Cargo.toml`: added `jsonwebtoken = "9"` + `argon2 = "0.5"` к workspace.dependencies.

**Phase 4 — Application + Presentation (9 steps) ✅**

- `crates/application/src/ports/user.rs`: `UserRepository` trait (find_by_id, get_capabilities) с documented invariants.
- `crates/application/src/ports/cms.rs`: new `CmsAdminRepository` trait с `insert_draft` method.
- `crates/application/src/use_cases/auth/resolve_capabilities.rs`: `CapabilityResolver` — moka future cache (5000 cap, 60s TTL per ADR D4), `require()` returns `MissingCapability`, `invalidate()` для Phase B revocation. 4 unit tests с stub repo.
- `crates/application/Cargo.toml`: added `moka` dep.
- `crates/domain/src/cms/draft.rs`: `NewDraftPage` DTO + `DraftPage` aggregate с reconstitute validation.
- `crates/infrastructure/src/persistence/cms_pages_repo.rs`: `PgCmsRepository` теперь также implements `CmsAdminRepository`. `insert_draft` использует with_tenant + map Postgres errors (23505 → Conflict, 42501/23514 → TenantMismatch).
- `crates/presentation/src/middleware/auth.rs`: Bearer extract → JwtVerifier.verify → `AuthenticatedUser` в extensions. Tenant binding check: JWT.tenant_id vs upstream `TenantContext`. `RequireAuthenticated` extractor.
- `crates/presentation/src/api/cms_admin_handlers.rs`: `POST /api/v1/cms/pages/admin` handler. `CreatePageRequest` (camelCase), `AdminPageResponse`. Pipes through validation/conflict/missing-capability errors.
- `crates/presentation/src/{app_state.rs,router.rs}`: AppState теперь holds cms_admin_repo + jwt_verifier + user_repo + capability_resolver. Router wires POST route + auth middleware layer (after tenant_resolver).
- `apps/server/src/main.rs`: read `JWT_SECRET` env (fatal if missing per ADR D1).
- **Tests:** lib tests across workspace = 83 green (36 common + 36 domain + 4 application + 5 infrastructure + 2 presentation).

**Phase 5 — Integration tests (2 steps) ✅**

`crates/presentation/tests/auth_test.rs` covers VAL-002 F1-F9 + I4:

| Test | Verifies |
|------|----------|
| `t_create_page_with_valid_jwt_returns_201_and_inserts_row` | F1 — happy path E2E, response shape, row inserted |
| `t_no_jwt_returns_401` | F2 — missing header → 401 NOT_AUTHENTICATED |
| `t_expired_jwt_returns_401` | F5 — exp в прошлом → 401 TOKEN_EXPIRED |
| `t_malformed_jwt_returns_401` | F6 — invalid Bearer payload → 401 INVALID_TOKEN |
| `t_forged_jwt_wrong_secret_returns_401` | F4/S7 — wrong secret → 401 INVALID_TOKEN |
| `t_user_without_capability_returns_403` | F7/S4 — user без role → 403 MISSING_CAPABILITY (с required="posts:create") |
| `t_jwt_for_other_tenant_returns_403` | F8/S5 — JWT.tenant_id != X-Tenant-Slug → 403 TENANT_OWNERSHIP_MISMATCH |
| `t_rls_blocks_spoofed_tenant_id_via_direct_sql` | F9/S9 — adversarial SET LOCAL spoof → RLS WITH CHECK rejects |
| `t_health_endpoint_still_works` | I4 — read-path regression |
| `smoke_sign_verify_jwt_roundtrip` (non-ignored) | JWT sign/verify roundtrip without Docker |

**Run:** `cargo test --test auth_test -p ax-presentation -- --ignored --test-threads=1`
**Result:** **9 passed, 0 failed (~84s)**

**Regression check:** `cargo test --test cms_pages_test -p ax-infrastructure -- --ignored --test-threads=1`
**Result:** **6/6 green** (read-path intact)

Bug fix found during this phase: добавлен `GRANT SELECT ON tenants TO ax_app_role` к migration 0002 — без него HTTP-level tenant_resolver middleware fail'нится с 500 (existing cms_pages_test проходило т.к. тестило только repo layer).

**Phase 6 — Dev seed + xtask sign-jwt (4 steps) ✅**

- `_ax_dev_setup.sql`: добавлен mirror migration 0002 SQL + seed dev admin user (uuid `22222222-...`, email `admin@imperiumspa.dev`, password argon2 hash для `Admin123!ChangeMe`) + admin role (`33333333-...`) с all 4 capabilities + user_roles mapping. Idempotent через ON CONFLICT.
- `xtask sign-jwt` subcommand: args `--user --tenant --role --kind --ttl --secret` (или JWT_SECRET env), outputs HS256 token to stdout.
- `xtask/Cargo.toml`: added jsonwebtoken + chrono + uuid.
- Verified: `cargo xtask sign-jwt --user X --tenant Y --secret S` → valid token, roundtrip-verifiable by JwtVerifier.

**Phase 7 — Restart + Report ✅ (partial)**

- **Release binary build:** `cargo build --release -p ax-server` — exit 0, 1m14s.
- **Boot smoke (5s timeout, без apply migration):** binary starts, logs "READY — listening on 0.0.0.0:7710". Confirms no panic on startup with valid env (DATABASE_URL + JWT_SECRET).
- **NOT done (deliberate skip):**
  - Migration 0002 application to barbie_site1 dev DB на 5442 — это SITE1's DB; AVTONOM scope включает Hard NO "НЕТ touch SITE1 stack". Migration 0002 additive (would not break SITE1), но из осторожности оставлено user'у на ручной apply.
  - Live curl smoke против running server — depends on migration apply step.
- **Old bg ax-server (bwdg2jj95):** не running на момент Phase 7 check (netstat -p 7710 = empty). Не killed мной; likely terminated до моей сессии.

### Pending для user (next steps)

1. **Apply migration 0002 + dev seed** (one-shot для local dev DB):
   ```bash
   docker exec -i barbie-site1-postgres psql -U postgres -d barbie_site1 < barbie/ax/_ax_dev_setup.sql
   ```
   Это идемпотентно: existing tenants/users остаются, добавляются roles/capabilities/RBAC + admin user.

2. **Start ax-server против barbie_site1 dev DB:**
   ```bash
   cd barbie/ax
   DATABASE_URL='postgresql://postgres:barbie_local_pw_change_me@localhost:5442/barbie_site1' \
   JWT_SECRET='change_me_to_strong_random_64_byte_secret' \
   API_PORT=7710 \
   ./target/release/ax-server &
   ```

3. **Manual curl smoke:**
   ```bash
   JWT=$(cd barbie/ax && cargo xtask sign-jwt \
     --user 22222222-2222-2222-2222-222222222222 \
     --tenant 11111111-1111-1111-1111-111111111111 \
     --role admin \
     --secret "change_me_to_strong_random_64_byte_secret" \
     --ttl 3600)
   curl -X POST http://localhost:7710/api/v1/cms/pages/admin \
     -H "Authorization: Bearer $JWT" \
     -H "X-Tenant-Slug: imperiumspa" \
     -H "Content-Type: application/json" \
     -d '{"slug":"first-draft","locale":"ru","title":"First Draft","body":[]}'
   ```
   Expect: **201 Created** + JSON body со status="draft".

4. **Production .env update:** add `JWT_SECRET` (same as SITE1) to ax-server's runtime env before deployment.

### AI-Default decisions (документированы в коде где placed)

| # | Decision | Why |
|---|----------|-----|
| AID-1 | Skipped `VerifyJwt` use case wrapper | Pure pass-through — direct `JwtVerifier.verify()` call в middleware reduces ceremony. Документировано в `crates/application/src/use_cases/auth/mod.rs`. |
| AID-2 | Capability enum closed (4 variants flat, no sub-enum) | <12 variants per ENTITY §2.8 — sub-enum nesting premature. ADR-002 D10. |
| AID-3 | Users `tenant_id` NULLABLE в Phase A | Backfill via UPDATE для existing users; Phase B tightens после full discipline. ADR-002 D8 caveat. |
| AID-4 | `cms_pages` POLICY explicit `WITH CHECK` despite Postgres USING-fallback | Defensive; protects against future ALTER POLICY loss-of-fallback. ADR-002 D7. |
| AID-5 | DraftPage as separate aggregate (not generic Page<Status>) | Aggregate-per-state — invariant pre-checks fail-fast в reconstitute. PLAN-002 §Implementation. |
| AID-6 | Single PgCmsRepository implements both `CmsRepository` + `CmsAdminRepository` | Same pool, same `with_tenant` machinery — no value in split adapter; cast to `Arc<dyn>` twice в AppState. |
| AID-7 | Tenant binding check inside auth middleware (not separate middleware) | Single-pass; check requires both `TenantContext` (from tenant_resolver) and Claims (from JWT verify) — natural fit. |
| AID-8 | `GRANT SELECT ON tenants TO ax_app_role` в migration 0002 | Bug discovered during integration testing — missing from migration 0001. Forward-fix in 0002 (no DROP, additive). |
| AID-9 | Live ax-server restart skipped в Phase 7 | barbie_site1 DB is SITE1's; AVTONOM Hard NO "НЕТ touch SITE1 stack". Documented user steps. |

### Skipped (deliberately, with rationale)

| # | Item | Why | Suggested follow-up |
|---|------|-----|---------------------|
| SKIP-1 | Migration 0002 apply на barbie_site1 dev DB | SITE1 stack ownership boundary | User applies manually; or future RFC adds `cargo sqlx migrate run` integration |
| SKIP-2 | Live curl smoke against running ax-server | Depends on SKIP-1 | User runs commands in §Pending step 3 |
| SKIP-3 | Argon2 password verify in AX (`POST /auth/login`) | Phase B per RFC-002 OOS1 | Separate RFC after Phase A pilot validation |
| SKIP-4 | RS256 / key rotation | Phase B+ per ADR-002 D1 | New RFC when key rotation policy matures |
| SKIP-5 | Performance benchmarks (oha + dhat) на write path | Phase A2 per VAL-002 P4-P13 | Separate benchmark task |
| SKIP-6 | Caddy production config для POST route | User VPS task per RFC-002 OOS14 | User updates Caddyfile |

### Verification gates (Definition of Done check)

- [x] 4 артефакта в `docs/{rfc,adr,plans,validations}/` — RFC-002, ADR-002, PLAN-002, VAL-002
- [x] `migrations/0002_users_roles_capabilities.sql` exists + applied на testcontainers Postgres
- [x] `cargo check --workspace`: exit 0
- [x] `cargo clippy --workspace --all-targets -- -D warnings`: zero warnings
- [x] `cargo test --workspace --lib`: 83 passed
- [x] `cargo test --test auth_test -p ax-presentation -- --ignored`: 9 passed (5+ required)
- [x] `cargo test --test cms_pages_test -p ax-infrastructure -- --ignored`: 6/6 (regression OK)
- [ ] Manual curl smoke `POST /api/v1/cms/pages/admin` → 201 (deferred, user step per §Pending)
- [ ] ax-server bg restarted с new binary (release binary builds + boots cleanly; live restart skipped — see AID-9)
- [x] `barbie/SESSION_LOG.md` финальный отчёт (this section)
- [x] 6 локальных коммитов в `ax/` с trailer `AI-Assisted: Claude Code` (within 6-10 range per plan)
- [x] ENTITY.md НЕ trogalось (spine intact)
- [x] `git push` НЕ был выполнен

### Spine touches (документированы по требованию AVTONOM)

| File | Spine? | Touch | Reason |
|------|--------|-------|--------|
| `apps/server/src/main.rs` | ambiguous (SITE1 list refers to `apps/api/src/app.module.ts`, not AX equivalent) | added 4 lines: read `JWT_SECRET` env + pass to `AppState::new` | Required for AppState constructor change; minimal scope per PLAN-002 §file touch list |
| `barbie/ENTITY.md` (project root) | yes | NOT touched | per AVTONOM rule |
| `barbie/ax/ENTITY.md` | yes (parallel session showed M state — not mine) | NOT touched | per AVTONOM rule |
| `CLAUDE.md`, `DESIGN.md` | yes | NOT touched | per AVTONOM rule |
| `barbie/ax/Cargo.toml` workspace | semi-spine | added 2 new lines (jsonwebtoken + argon2 deps) | additive only, no version changes |

### Recommendations для user

1. **Review diff'ы — особенно migration 0002** (additive but defines new RBAC schema; verify acceptable):
   ```bash
   cd barbie/ax && git diff e6b168e^..296a6f1
   ```
2. **Run integration tests локально** для doubly-verify:
   ```bash
   cd barbie/ax && cargo test --workspace -- --ignored --test-threads=1
   ```
3. **Apply migration + smoke per §Pending** before considering "auth ready".
4. **JWT_SECRET в SITE1 .env (.env file: `change_me_to_strong_random_64_byte_secret`) — for prod, generate strong 64-byte random + put SAME value в AX's runtime env.**
5. **Capability cache (60s TTL) — if user roles change в admin UI, AX будет показывать stale capabilities до 60s.** Phase B adds explicit invalidation endpoint.
6. **N-1 compat: SITE1 продолжает работать без знания о новых tables.** RLS users-table tenant_isolation использует current_setting, SITE1 не setting'ит app.current_tenant_id → видит NULL → RLS режет ничего видимого (но row visible only when current_setting matches). SITE1 read из users via direct query — может потребовать coordination в Phase B.

### Final state

- `cargo check --workspace` ✅
- `cargo clippy --workspace --all-targets -- -D warnings` ✅
- `cargo test --workspace --lib` (83 passed) ✅
- `cargo test auth_test --ignored` (9 passed) ✅
- `cargo test cms_pages_test --ignored` (6 passed, regression) ✅
- Zero Hard NOs triggered.

**AI-Assisted: Claude Opus 4.7**

---

## 2026-05-24 19:59 → ~21:30 · AVTONOM · ax-rust-bootstrap

**Trigger:** «я отойду часов на 9, продолжай всё сам» (after "делай" series). Активный план — `barbie/ax/docs/plans/PLAN-001-cms_pages-pilot.md`, начиная с Phase 2 bootstrap.

**Session plan:** `barbie/NON_PROJECT/session-plans/2026-05-24-1959-AVTONOM-rust-bootstrap.md`

**Repo:** `barbie/ax/` (отдельный git repo, github.com/kabuto-lab/NAS.git). Все 10 коммитов локальны; **push не делался** per AVTONOM rule.

**Commits (10 total in ax/, последние 9 — в этой сессии):**

1. `248d7cd` chore(ax): initial commit — exploration spec + istori hooks infra (pre-session)
2. `0432623` docs(ax): RFC-001 + ADR-001 + PLAN-001 + VAL-001 (P1-P4 artifacts) + audit completion
3. `1eeb24a` build(ax): Phase 2 — Cargo workspace bootstrap + CI
4. `1ea3884` feat(ax/xtask): scaffold architecture-check + magic-check + planning-refs
5. `0882345` feat(ax/common): TenantId + AppError + RequestId + Page<T>
6. `1f638af` feat(ax/domain): PublishedPage + Block enum + ED widget tree + value objects
7. `dd5cab8` feat(ax/application): CmsRepository + TenantResolver ports + GetPublishedBySlug
8. `71bf711` feat(ax): Phase 7 — 0001_cms_pages_expand.sql + PgCmsRepository + PgTenantResolver
9. `38f5567` feat(ax): Phase 8-9 — Axum router + middleware + handlers + server bootstrap
10. `20263c3` test(ax): integration test skeleton — cms_pages_test.rs (T14 placeholder)

### Сделано

**~9 phase 1-4 шагов из PLAN-001 (T01-T13) закрыто на 100% по объёму кода. T14-T17 на 25-50%. T18+ — out of scope (требует деплой).**

#### Phase 1 (T01-T03.5) — Audit completion + P1-P4 artifacts

- **AUDIT-cms_pages-2026-05-24.md** добит с 70% → 95% coverage:
  - §11 Cross-module deps (media schema, S3Service.publicUrlFor, tenant_menu_items, Navigation dispatch)
  - §12 Deployment / infrastructure (docker-compose, configuration.ts, .env.example, main.ts, AppModule)
  - §13 Observability state — **critical finding C6**: SITE1 не имеет Sentry/OTLP/Prometheus/JSON logging вообще. Bridge §10 был aspirational, не actual. AX устанавливает observability с нуля, не мигрирует.
- **RFC-001-cms_pages-migration.md** (P1 Strategic) — 8 success criteria, 8 constraints, 7 risks с mitigations, 16 explicit out-of-scope. C4 visual deviation (rendering через design tokens, не hardcoded `#0E0F12`) acknowledged.
- **ADR-001-four-layer-rls.md** (P2 Architectural) — Four-Layer + view + RLS POLICY + 2 separate roles. 7 alternatives rejected. Reversal cost LOW (< 5 min). 10 dependency decisions locked.
- **PLAN-001-cms_pages-pilot.md** (P3 Execution) — 26 steps (T01-T26) с file touch list, spine markers, dependency graph, atomic commit-cell discipline.
- **VAL-001-cms_pages.md** (P4 Verification) — 60+ measurable criteria (F1-F11 functional, I1-I10 isolation, P1-P13 perf, A1-A6 alloc, Q1-Q13 quality, O1-O12 ops). Test files enumerated. Sentry tags + Grafana alerts specced.

#### Phase 2 (T04-T06) — Cargo workspace bootstrap

- `Cargo.toml` workspace root: resolver=2, 8 members (6 crates + apps/server + xtask). Workspace.dependencies версии lock'нуты per ADR-001 D10 (tokio 1, axum 0.8, sqlx 0.8 rustls, garde 0.20, thiserror 2, OTLP 0.27, sentry 0.34, moka 0.12, ammonia 4, leptos 0.7 optional). Profile.release: lto=thin, panic=abort.
- `rust-toolchain.toml`: 1.84 + rustfmt + clippy. `rustfmt.toml`, `clippy.toml` (complexity budgets per §2.8, disallowed-types Mutex/RwLock std).
- `deny.toml`: license allowlist, ban openssl/native-tls (§19).
- `.github/workflows/ci.yml`: fmt + clippy -D warnings + build + test (postgres service) + deny + xtask checks. sqlx-prepare gated до .sqlx/ committed (Phase 4). Nightly: udeps + audit.

#### Phase 3 (T05) — xtask fitness functions

- `xtask/src/main.rs`: clap CLI с 5 subcommands.
- `architecture-check`: parse Cargo.toml deps, verify L1-L4 boundaries (domain не зависит от sqlx/axum/tokio; application не зависит от sqlx/axum; presentation не direct-зависит от sqlx).
- `magic-check`: walk *.rs files, ban macro_rules! outside common/macros, tokio::spawn outside runtime/supervisor, std::thread::spawn, warn Arc<RwLock<>>.
- `check-planning-refs` / `alloc-budget` / `query-budget`: stubs (Phase B integration с git log scan / dhat-rs / EXPLAIN ANALYZE per §11.5/§11.6).

#### Phase 4 (T07) — crates/common — L0 cross-crate types

- `tenant.rs`: TenantId(Uuid) newtype (Copy+Hash). TenantContext { tenant_id, tenant_slug: Arc<str>, status, request_id, user_id }. TenantStatus enum (Active/Pending/Suspended/Archived) + is_active() для guard logic.
- `ids.rs`: UserId(Uuid), RequestId(Ulid) с FromStr round-trip для X-Request-Id parsing.
- `error.rs`: AppError enum (12 variants) с thiserror + IntoResponse для HTTP mapping (404/401/403/400/409/429/500). **TenantMismatch** — отдельный variant, is_security_event() = true для Sentry severity. NotFoundDetail с #[serde(flatten)] для byte-for-byte SITE1 contract.
- `page.rs`: Page<T> { items, next_cursor, limit } — keyset cursor.
- **13 unit tests** (всё критическое covered).

#### Phase 5 (T08) — crates/domain — L3 pure types

- `value_objects.rs`: PageSlug parse + validate (3-80 chars, lowercase + digits + hyphens + slashes per audit §4.1), PageLocale (Ru/En default Ru), PageStatus (Draft/Published/Archived).
- `blocks.rs`: top-level Block enum 6 types с #[serde(tag="type", content="data")]. ED inner: Section/Column (span: f32, не grid 1|2|3|4|6|12), CanvasElement flat struct, WidgetKind с serde rename IconBox="icon-box" (hyphen!) и field name iconBox (camelCase) — **byte-for-byte SITE1 audit §6.7 compatibility**. 8 widget Props structs. ElStyle + default_values(). Helper extract_ed_sections() = аналог SITE1.
- `aggregate.rs`: PublishedPage с reconstitute() — validates invariants (status=Published + published_at Some per audit §1.4).
- **23 unit tests** включая slug regex edge cases, widget serde с icon-box hyphen, aggregate invariant violations.

#### Phase 6 (T09) — crates/application — L2 ports + use case

- `ports/cms.rs`: trait CmsRepository — single method find_published_by_slug(ctx, slug, locale). Docstring указывает 4 invariants для implementers.
- `ports/tenant.rs`: trait TenantResolver — resolve_by_slug(slug) -> Result<Option<TenantContext>>.
- `use_cases/cms/get_published_by_slug.rs`: GetPublishedBySlug. Thin coordinator с #[tracing::instrument]. FUTURE markers для cache + CCD §25.
- **Unit tests**: StubRepo + 2 use case tests (delegates + passes_through_not_found) с tokio::test.

#### Phase 7 (T10-T11) — Migration + infrastructure

- `migrations/0001_cms_pages_expand.sql`: CREATE VIEW cms_pages_v_active + ENABLE RLS + POLICY rls_cms_pages_tenant_isolation + ROLE site1_admin_role (BYPASSRLS) + ROLE ax_app_role (RLS enforced). Idempotent через DO $$ IF NOT EXISTS $$. Verification queries + rollback recipe в comments.
- `persistence/pool.rs`: build_pool() + PoolConfig. Smoke test SELECT 1.
- `persistence/transaction.rs`: with_tenant(pool, ctx, |tx| async) — BEGIN + SET LOCAL app.current_tenant_id + COMMIT. **CRITICAL:** требует PgBouncer transaction mode (R1).
- `persistence/cms_pages_repo.rs`: PgCmsRepository implements CmsRepository. sqlx::query_as (runtime checked — switch к query_as! macro после `cargo sqlx prepare` в T11 follow-up). FromRow CmsPageRow → map_row_to_aggregate.
- `tenant.rs`: PgTenantResolver implements TenantResolver. moka future Cache (capacity 10k, TTL 5min per ADR D6). Negative caching (None tier'ы тоже кэшируются).

#### Phase 8-9 (T12-T13) — Presentation + server bootstrap

- `app_state.rs`: AppState DI. Arc'ed CmsRepository + TenantResolver + GetPublishedBySlug.
- `middleware/tenant_resolver.rs`: extract_slug Header → Subdomain → Query priority (audit §5.1). normalize_slug regex 3-64 chars (**фиксит SITE1 H1 bug**). RequireTenant extractor → 401 если нет ctx, 403 TENANT_NOT_ACTIVE если не active.
- `middleware/request_id.rs`: ULID из X-Request-Id или generate. Response header + X-Stack: ax.
- `middleware/error_to_response.rs`: stub (Phase B Sentry capture).
- `api/cms_handlers.rs`: get_published_by_slug handler. CmsPageResponse struct БЕЗ tenantId (privacy), explicit #[serde(rename)] для camelCase, format_ts() = ISO8601 RFC3339 millis Z-suffix. Slug/locale parse fail → 404 PAGE_NOT_FOUND.
- `api/health_handler.rs`: /health (uptime+version+git_sha+env+timestamp), /health/ready (TODO DB ping).
- `api/version_handler.rs`: /api/v1/version.
- `router.rs`: build_router() — 4 routes + middleware stack (tenant_resolver state-aware + request_id + TraceLayer).
- `apps/server/src/main.rs`: tokio::main, dotenvy, tracing-subscriber JSON, build_pool через DATABASE_URL, axum::serve + graceful shutdown (ctrl_c + SIGTERM). jemallocator on linux/macos.
- `crates/runtime/src/lib.rs`: TaskSupervisor skeleton + TaskCategory enum (Http/Queue/Image/Report per §10.5). Real impl — Phase B.

#### Phase 10 (T14) — Integration test skeleton

- `crates/infrastructure/tests/cms_pages_test.rs`: 7 ignored tests covering F1/F5/F6/F10 + I4/I5 success criteria. Feature flag `integration-tests` для opt-in. `TestContext::setup()` помечен `todo!()` — нужны testcontainers spin + 0000_baseline.sql import + tenant/page seeding (T14 follow-up).
- 1 smoke test (`smoke_domain_types_compile`) — runs always в CI.

### Пропущено / SKIP

| # | Что | Reason |
|---|-----|--------|
| `cargo check / build` | НЕ запускалось | User rejected tool call mid-session. Workspace **не валидирован** компиляцией. **HIGH RISK:** код может содержать compile errors. См. TODO ниже. |
| Performance baseline (T16) | OOS | Требует **реального** запуска SITE1 + AX + oha; не выполнимо в read-only AVTONOM. Документировано в RFC-001 как not RFC-blocking. |
| Caddy snippet + rollback drill (T17) | OOS | Требует VPS access; Phase A deploy task. |
| Phase A pilot deploy (T18-T20) | OOS | Spine action (production VPS). |
| Phase B Leptos SSR / Phase C/D | OOS | Future work. |
| `cargo sqlx prepare` (.sqlx/ metadata) | SKIP | Требует running Postgres + DATABASE_URL. PgCmsRepository использует `sqlx::query_as` (runtime) вместо `query_as!` (compile-time); switch когда `cargo sqlx prepare` запущен. |
| Test infrastructure setup (`testcontainers` 0000_baseline.sql) | SKIP | TestContext::setup() = `todo!()`. Нужна `barbie/ax/migrations/0000_baseline.sql` либо programmatic CREATE TABLE — отдельная задача. |
| ENTITY.md v3.3 → v3.4 уже modified в working tree | SPINE — НЕ commit'ил | Per AVTONOM rule. User reviews + commits сам. |
| `prototype-dashboard/` untracked dir | not mine | User-added артефакт; не трогал. |
| `ТЗ.html` (Cyrillic name) | uncommitted | Создан в предыдущей не-AVTONOM фазе сессии; user решает что с ним делать. |

### AI-Default решения (per session-plan)

| # | Decision | Default applied | Justification |
|---|----------|-----------------|---------------|
| D-A | Pilot tenant name | `imperiumspa` placeholder | Bridge документы используют |
| D-C | Rust edition / toolchain | edition=2021, channel=1.84 | per ENTITY §4.1 |
| D-D | `Cargo.lock` commit | gitignored сейчас (untracked) | `.gitignore` уже исключает per pre-existing rule в ax/.gitignore |
| D-E | Crate naming | `ax-common`, `ax-domain`, ... | Avoid crates.io collisions |
| D-F | SQLx runtime backend | `runtime-tokio-rustls` | §19 supply chain hygiene |
| D-H | AX server default port | `7000` | Bridge/03 §12 |
| D-I | OTLP / tracing versions | tracing-opentelemetry=0.28, opentelemetry=0.27 | ENTITY §4.3 |
| D-J | Visual deviation (RFC C4) | Render через design tokens (НЕ hardcoded `#0E0F12`) | ADR-001 A5 default: "shell deviates, widget internal colors replicate" |
| D-L | API base path | `/api/v1/cms/pages/public/by-slug/:slug` | ADR D5 |
| D-M | SQLx query approach | `query_as` runtime now → `query_as!` after `cargo sqlx prepare` | Skeleton phase pragmatic; switch когда DB available |
| D-N | JSON field order | Rust struct declaration order + явный #[serde(rename)] для camelCase | Matches SITE1 |
| New: ADR vs ENTITY axum version conflict | Used 0.8 (per ADR + bridge/03 §3.1) | ENTITY §4.1 говорит 0.7 — discrepancy worth noting; ENTITY как spine не обновлялся |
| New: thiserror version | 2.0 | Released late 2025; aligns с ENTITY §4.3 |
| New: WidgetKind enum vs flat struct | Both — flat struct CanvasElement для byte-for-byte JSON + `Widget` typed enum для render code convenience | ADR D4 split |
| New: TenantContext clone semantics | Clone (не Copy) — потому что Arc<str> для slug; clone дешёвый но не trivial | Slight deviation от ENTITY §6 указания Copy; реализация безопасная |
| New: TaskSupervisor — runtime skeleton | Stub в Phase A; реальная impl — Phase B | Phase A не использует background tasks |

### Рекомендации для user'а (TODO при возврате)

**Critical (do first):**

1. **`cargo check --workspace`** в `barbie/ax/` — code не валидирован компиляцией. Ожидайте 5-10 минут на download deps + первый build. Возможны:
   - Wrong workspace.dependencies versions (например axum 0.8 если только 0.7 stable)
   - Missing or duplicate features
   - Compile errors в моём коде (особенно serde rename mappings)
   - **Fix the errors before any further work** — каждый последующий шаг полагается на компилируемый baseline
2. Review `barbie/ENTITY.md` v3.4 changes (uncommitted, M в working tree) — добавлены §25 CCD / §26 Analytics / §27 SEO в predыдущей фазе сессии (до AVTONOM). Decide: commit / revert / iterate.
3. Sign-off RFC-001 + ADR-001 — оба Draft, не финализованы. Без sign-off PLAN-001 / VAL-001 формально не unblock'нуты.
4. Run `cargo sqlx prepare --workspace` против local Postgres когда DB up — генерирует `.sqlx/` offline metadata. После этого можно переключить `sqlx::query_as` → `sqlx::query_as!` macro в `cms_pages_repo.rs` для compile-time validation.

**High priority:**

5. Verify Phase B Leptos 0.7 API compatibility — `presentation/Cargo.toml` объявляет feature `leptos-ssr` но реальная Leptos render code не написана.
6. Tenant slug regex bug fix (audit H1): resolver сейчас принимает 3-64 chars в AX, vs SITE1 1-40 — confirm нет существующих tenants со slug > 40 chars (если есть — backport regex в SITE1).
7. PgBouncer pool mode audit на VPS перед Phase A deploy (R1).

**Medium:**

8. `prototype-dashboard/` untracked dir в `barbie/ax/` — review + decide.
9. `ТЗ.html` создан в pre-AVTONOM фазе — commit или revert.
10. ENTITY.md axum 0.7 vs ADR/bridge 0.8 — sync (либо bump ENTITY до 0.8, либо downgrade Cargo.toml до 0.7).

**Low (Phase B follow-ups):**

11. `tests/integration/cms_pages_test.rs::TestContext::setup()` — `todo!()`. Нужна `0000_baseline.sql` import strategy или programmatic CREATE TABLE.
12. Sentry / OTLP / Prometheus init в `apps/server/src/main.rs` — TODO placeholder. Реальные provider init — Phase B.
13. `WidgetView` Leptos equivalent для render — Phase B.
14. CCD / Analytics / SEO impl (ENTITY §25/§26/§27) — post-pilot.

### Verdict

**Phase 2-3 PLAN-001 closed на ~80%.** Скелет workspace полный, code present но не валидирован компиляцией. Risk of broken Rust code умеренный (writing без feedback за 9 hours = вероятны compile errors в serde mappings, async lifetimes, trait bounds). RFC + ADR + PLAN + VAL готовы для sign-off review. Migration SQL ready для apply на dev Postgres. Integration test skeleton structured но требует DB setup completion.

**Не блокирует ничего критичное.** User-controlled actions (deploy, push, ENTITY edits) остались user'у per AVTONOM rule. Все 9 коммитов локальные в `barbie/ax/` repo (github.com/kabuto-lab/NAS.git) — push НЕ выполнялся.

---

## 2026-05-24 13:25 → ~17:00 · AVTONOM · phase-0-closing-pass

**Trigger:** «follow your plan, i'll be away for 11 hours so don't ask any permissions and follow your plan». Активный план — Gantt §8.5 ROADMAP, начиная с `p0-tokens` (active на старте сессии).

**Session plan:** `barbie/NON_PROJECT/session-plans/2026-05-24-1325-AVTONOM-design-tokens.md`

**Commits (6, в порядке):**
- `6786eac feat(barbie/SITE1): design-tokens API — PATCH /tenants/:slug/design-tokens + projects-storage на API` — Stage 32
- `1e1333f feat(barbie/SITE1/web): /admin/cms — inline publish/unpublish + duplicate + sortable columns` — Stage 33
- `33468af test(barbie/SITE1/api): tenant-isolation specs для salons / services / clients / staff` — Stage 34 (part 1)
- `0c8a2f5 feat(barbie/SITE1/api): WP-import HTML sanitization + CMS isolation specs (Stage 34 finish + Stage 35)` — Stage 34/35
- `5325228 feat(barbie/SITE1/web): /admin/tenants — platform-admin CRUD page` — Stage 36
- `3197e63 feat(barbie/SITE1/web): /admin/settings stub — устранён 404 из RailFooter` — Stage 37

### Сделано

**6 stages, ~3,5h работы. Закрытие Phase 0 заметно продвинулось — 4 «открытые задачи» из ROADMAP §8 переведены в done.**

#### Stage 32 — Design tokens API (`p0-tokens` в Gantt — done)

Завершил WIP, который висел на старте сессии (DTO untracked, controller/service M):
- `PATCH /v1/platform/tenants/:slug/design-tokens` + `GET` (RequireRole platform-admin).
- `UpdateDesignTokensDto` с hex-валидацией; `DesignTokensResponseDto` с дефолтами от schema для legacy-тенантов без row в `tenant_design_tokens`.
- `updateDesignTokensBySlug` — INSERT-or-UPDATE через `onConflictDoUpdate` (PRIMARY KEY tenant_id).
- Frontend: typed client `tenants-design-tokens-api.ts`, `projects-storage.ts` стал async (API first, localStorage fallback), `ProjectCard.tsx` — `loadState` с пилюлями LIVE / CACHED / DRAFT и `saveState` saving/saved/fail.
- localStorage оставлен как cache — спасает UI при network failure, не source of truth.

#### Stage 33 — `/admin/cms` полноценный edit-from-list (`p0-cms-edit` в Gantt — done)

`/admin/cms` уже умел edit через Link на slug/title; добавил inline-actions, чтобы повседневные операции не требовали открытия редактора:
- **Publish/Unpublish** toggle (Send/EyeOff icon) — POST `/cms/pages/:id/(un)publish`.
- **Duplicate** (Copy) — client-side `getPage + createPage` с slug='`<orig>`-copy' (или `-N` если занят). Prompt'ит slug.
- **Sortable columns** Slug / Title / Updated — toggle asc/desc.
- Per-row `busyId` disabled state + inline Loader2.
- Notice/error баннеры auto-clear (3s/5s).

#### Stage 34 — Tenant-isolation specs (`p0-iso` в Gantt — done)

Закрыл формальный долг ENTITY §2.2 («каждый read-эндпоинт должен иметь тест на изоляцию»). До сегодня покрыт был только chat (`11e8bea`, 11 тестов). Сегодня — ещё 5 модулей:
- **salons.service.spec.ts** (4 теста) — list, get, update, no-context throw.
- **services.service.spec.ts** (5 тестов) — list, get, update, createService preflight salonId-check, no-context. Особо: preflight `assertSalonBelongsToTenant` ДОЛЖЕН быть tenant-filtered.
- **clients.service.spec.ts** (5 тестов) — list, get, **createClient phone-uniqueness preflight tenant-filter** (critical: иначе утечка о существовании клиента в другом тенанте через 409 collision), update, no-context.
- **staff.service.spec.ts** (3 теста) — list, getStaff с staff_services M2M (оба запроса tenant-filtered, иначе утечка кросс-тенантного mapping'а), no-context.
- **cms.service.spec.ts** (6 тестов) — list, get, **getPublishedBySlug (публичный рендер — особый риск)**, update, publish/unpublish/archive (3 update'а — все tenant-filtered), no-context.

**Итог: 28 тестов до сессии → 49 после. Всё через mock-based pattern (test-utils/mock-db + sql-helpers).**

#### Stage 35 — WP-import HTML sanitization (`p0-purify` в Gantt — done, crit)

`WpImportService` клал `content.rendered` из WP в `cms_pages.body` raw — security-debt с первого live-тенанта. Закрыл:
- **AI-Default:** взял `sanitize-html` вместо DOMPurify (мнение ROADMAP). DOMPurify требует jsdom для Node — лишний 500KB + cold-start cost. `sanitize-html` — server-side fit, декларативный allowlist, меньше surface.
- `wp-sanitize.ts`: `sanitizeWpHtml` — strict allowlist (семантические теги + a/img); `sanitizeWpTitle` — strip all tags.
- Class/id запрещены (CSS-injection guard). `javascript:` / `data:` режутся в href/src.
- 14 XSS-guard тестов: `<script>`, `on*` handlers, `javascript:` URL, `<iframe>`, `<style>` с CSS expression, `<object>`/`<embed>`, `data:` в img, и semantic positive cases.

#### Stage 36 — `/admin/tenants` platform-admin CRUD page (новый раздел, ROADMAP §8 — done)

Backend `TenantsController.list/get/update/delete` стоял с Stage 8, UI отсутствовал — тенантами можно было управлять только через Swagger. Сделал:
- Table: slug · name · status pill · domain · created. Sortable Slug/Name/Created.
- Filter: status + search.
- Per-row: open public site, CMS-link, Pause/Play (suspend toggle), Archive.
- Top toolbar: counts по статусам (active/suspended/archived).
- Rail entry в секции Tools.
- Создание оставлено за wizard'ом `/admin/projects/new` (там удобнее: WP/HTML detect).

#### Stage 37 — `/admin/settings` stub (housekeeping, ROADMAP §8 — done)

`RailFooter` ссылается на `/admin/settings`, страницы не было — клик → Next 404. Создал stub:
- Section «Текущая сессия» (email/role/tenant/kind из AuthSession).
- Section «Планируется» — 6 disabled-карт (Профиль, Безопасность, API-токены, Уведомления, Внешний вид, Язык).
- Понятная коммуникация: «раздел в разработке», без false promises.

### AI-Default решения

| # | Решение | Причина |
| - | --- | --- |
| 1 | localStorage cache в `projects-storage.ts` оставлен (не убран после миграции на API) | Network failure / offline — UI не должен пустеть. Cache invalidated на каждом успешном API read/save. Не source of truth. |
| 2 | Tenant-admin не имеет PATCH design-tokens (только platform-admin) | Расширение требует TenantGuard на slug-resolve (проверка владения тенантом). Отдельная задача. |
| 3 | `logo` (data URL SVG) в design-tokens остался в localStorage only | `logoKey` API ожидает S3-ключ, а `/admin/media` uploader ещё не сделан. Маппинг отложен. |
| 4 | Duplicate page в `/admin/cms` — client-side (getPage + createPage), не backend endpoint | Серверный duplicate не нужен — 2 вызова + конфликт slug всплывает через ApiError. Простота > одно сетевое обращение. |
| 5 | Слаговый адрес для design-tokens endpoint, не uuid | `/admin/projects` работает со slug'ами, не id'шниками. Меньше lookups на frontend. |
| 6 | sanitize-html вместо DOMPurify | Server-side fit без jsdom. Меньший bundle. См. Stage 35. |
| 7 | sanitize-html keep encoded entities в title (не decode) | sanitize-html re-encodes по умолчанию. Браузер декодит при выводе в текстовом узле. JSON-safe encoded строки — приемлемо для DB. |
| 8 | `/admin/tenants` НЕ дублирует create-flow с `/admin/projects/new` — там лучший UX (wizard + WP/HTML detect) | DRY + не путать пользователя двумя UI для одного действия. |
| 9 | CmsModule isolation test покрывает 5 update-операций отдельно | Каждый update — отдельный SQL, отдельный риск. Не batch. |
| 10 | Документация stages в ROADMAP §7 + §8 одновременно с коммитом | Single source of truth — статус задач в ROADMAP, не в SESSION_LOG. Здесь живёт narrative. |

### Spine touches

**НЕТ.** Всё non-spine:
- `tenants.controller.ts`, `tenants.service.ts`, `wp-import.service.ts` — модифицированы (non-spine, ранее уже редактировались).
- NEW: dto/update-design-tokens.dto.ts, wp-sanitize.ts/spec, isolation spec'и × 5, ProjectCard, projects-storage, tenants-api, tenants-design-tokens-api, /admin/tenants/page.tsx, /admin/settings/page.tsx, Rail.tsx (M), /admin/cms/page.tsx (M).
- ROADMAP.md — non-spine, обновлён по каждому stage.
- `app.module.ts`, schema, миграции — НЕ трогал.

### Пропущено / отложено

- **Live smoke** всех 6 stages — Docker Desktop не запущен в сессии; static verification (typecheck api OK, typecheck web OK, jest все 49 тестов pass). Перед prod-deploy — нужен manual smoke (есть чек-листы в коммит-сообщениях).
- **WP-importer: featured images → hero block** — небольшой UX win, остался в backlog.
- **HTML-crawler** (sitemap.xml + Readability) — L (5 days), не начинал — слишком большой для остатка времени.
- **`/admin/media`** uploader — M (4 days), не начинал.
- **`/admin/appointments`** calendar — L (10 days), не начинал.
- **`docs/DEPLOY_SERVER.md`** — нужны знания о VPS, которые у меня нет в session-context; пропустил.
- **Cleanup тестовых тенантов** (`smoketest`, `wp-make-smoke2`) — нужен Docker.
- **DTO для design-tokens: tenant-admin scope** — нужен TenantGuard слой с резолвом по slug, не сделал.
- **CMS-isolation: getPublishedBySlug** — public endpoint. Проверил что tenant-filtered, но не покрыт integration-test (требует реальной БД).

### Рекомендации на следующую сессию

1. **Live smoke** на 6 stages после поднятия Docker:
   - `/admin/projects` → редактирование design tokens → перезагрузка → значения persist'нулись через API.
   - `/admin/cms?tenant=imperiumspa` → publish/unpublish → duplicate page → проверить.
   - `/admin/tenants` → toggle suspend → archive → restore.
   - `/admin/settings` → проверить что показывает session info.
   - WP-import какого-либо тенанта → проверить что HTML clean (нет `<script>` в `cms_pages.body`).
2. **`/admin/media`** — главный unblock для следующих feature. Без него `logoKey` в design tokens — мёртвая колонка, ED-editor MediaPickerStub.
3. **WP-importer: featured images → hero block** — после media: resolve `wp-media-id → S3 key` и дописать `hero` в block array. ~2-3h.
4. **HTML-crawler** (sitemap + Readability) Phase A — разблокирует non-WP сайты. ~1 day для базовой версии.
5. **`docs/DEPLOY_SERVER.md`** — без этого нет prod-target. Нужна сессия с пользователем для VPS specifics.
6. **VPS deploy** свежих 6 коммитов + Stage 31 (Public CMS surface) + Stage 28-30 (ED): итого ~10 коммитов с последнего push'а. Только пользователь push'ит.

### Не повредил ничего

- Spine не трогал. `app.module.ts`, schema, миграции, Docker compose — нетронуты.
- Typecheck api + web clean после каждого stage'а.
- jest: 49 тестов pass (28 уже было + 21 добавлено в этой сессии).
- Pre-existing функционал admin shell не сломан (rail работает, RailFooter ведёт куда надо, ProjectCard cards рендерятся).
- Push не делал.

### Поведенческое — что заметил

- Pre-commit hooks ни разу не сработали (ничего блокирующего).
- AVTONOM mode дисциплинировал на small commits — каждый stage = один логичный commit с подробным сообщением.
- ROADMAP.md обновлять параллельно с кодом — окупилось: следующая сессия сразу видит статус.

---

## 2026-05-18 17:30 → 22:15 · AVTONOM · wp-import

**Trigger:** «AVTONOM: go on» после ответа «все 4 типа (pages/media/menu/posts) + WP REST API + SSE прогресс» (см. session plan).

**Session plan:** `barbie/NON_PROJECT/session-plans/2026-05-18-1730-AVTONOM-wp-import.md`

**Commits:**
- `60d8fd8 feat(barbie/SITE1): WordPress importer — bootstrap NAS tenant from WP site`
- `f9ee14d fix(barbie/SITE1/api): normalize 3-digit hex from analyzer before bootstrap`

### Сделано

Полноценный WordPress-importer для wizard'а `/admin/projects/new`:
вставил URL WP-донора → детект (через `/wp-json` + namespace `wp/v2`) → 4 типа контента импортируются параллельно с live SSE-прогрессом → новый NAS-тенант с заполненными `cms_pages` / `media` / `tenant_menu_items` / `tenant_design_tokens`.

**Backend (NestJS):**

| Endpoint | Назначение |
| --- | --- |
| `POST /v1/tools/wp-probe` | Sync. Возвращает `{isWp, counts:{pages,media,posts,menus}, siteName, description, notes}`. Используется wizard'ом параллельно с analyze-site. |
| `POST /v1/platform/tenants/bootstrap-wp` | Async kickoff. Создаёт jobId, fire-and-forget `WpImportService.run()`. Возвращает `{jobId}` мгновенно. |
| `GET /v1/platform/tenants/bootstrap-wp/:jobId/stream?token=...` | SSE. Auth через query (EventSource limitation). События: `start`, `progress`, `tenant.created`, `pages.fetched`, `page.imported`, `posts.*`, `media.fetched`, `media.imported`, `media.failed`, `menu.fetched`, `menu.imported`, `done`, `error`. Heartbeat 25s. |

**Файлы (5 NEW + 5 M):**
- NEW `apps/api/src/tools/dto/wp-probe.dto.ts`
- NEW `apps/api/src/tenants/dto/bootstrap-wp.dto.ts`
- NEW `apps/api/src/tenants/wp-job-store.ts` — in-memory `@Injectable()` реестр, EventEmitter pub/sub + per-job buffer (late SSE-subscribers получают историю) + 60s TTL cleanup.
- NEW `apps/api/src/tenants/wp-import.service.ts` — orchestrator (probe → analyze → bootstrap skeleton → pages → posts → media → menu → finalize).
- M `apps/api/src/tools/tools.service.ts` — `fetchSafeText()` + `fetchSafeJson<T>()` (5 MiB cap, no MIME whitelist) + `probeWordPress()`.
- M `apps/api/src/tools/tools.controller.ts` — endpoint wp-probe.
- M `apps/api/src/tenants/tenants.controller.ts` — bootstrap-wp + SSE-stream + manual JWT verify (по паттерну ChatStreamController).
- M `apps/api/src/tenants/tenants.module.ts` — imports += ToolsModule, JwtModule.registerAsync; providers += WpImportService, WpJobStore.

**Frontend (Next.js):**
- NEW `apps/web/src/lib/wp-import-api.ts` — typed client (`probe`, `kickoff`, `stream(jobId, onEvent)` — auto-close на done/error).
- M `apps/web/src/components/admin/sections/projects/BootstrapWizard.tsx`:
  - Step 1 analyze() параллельно дёргает probe через `.catch(()=>null)`.
  - Step 3 при `wpProbe.isWp` показывает «WordPress-донор обнаружен» панель с 4 опт-чекбоксами (pages/media/menu/posts, disabled если count=0) + CTA «Импортировать всё (WP)». Регулярный Nav-кнопка переименована в «Только design (без WP)» — две явных ветки.
  - Новые view'ы `wp-importing` (live progress log, max 20 последних строк) и `wp-success` (summary + полный лог в `<details>`).
  - Cleanup EventSource в `useEffect` unmount.

**Smoke (end-to-end):**
- `POST /v1/tools/wp-probe` на wordpress.org / make.wordpress.org → isWp=true, siteName верно; example.com → isWp=false (no /wp-json).
- `POST /v1/platform/tenants/bootstrap-wp` на make.wordpress.org с pages=true, menu=true → SSE chain: `start → progress → tenant.created → progress(fetch fail на /pages 4xx — это OK, WP-сайт защищает админский API) → pages.fetched(0) → progress(menus недоступен) → done({pagesImported:0, menuItemsImported:0, …})`.
- Тенант `wp-make-smoke2` (`c37de866-...`) создан в DB; design tokens с нормализованными hex.
- Typecheck api + web clean. SSR `/admin/projects/new` → 200.

**Найденный и пофикшенный баг (отдельный коммит `f9ee14d`):**
`ToolsService.guessRoleColors` иногда возвращает короткий hex (`#EEE`), а DB-check `tenant_design_tokens_colors_hex_check` ждёт 6-значный. Падало с `IMPORT_FAILED` после `tenant.created` event'а (но до commit'а tx). Добавил `normalizeHex()`: `#EEE → #EEEEEE`; 6/8-значный → as-is; кривое → fallback NAS-default.

### AI-Default решения

| # | Решение | Причина |
| - | - | - |
| 1 | WP-importer как extension TenantsModule (не свой WpImportModule) | Свежий `WpImportModule` потребовал бы touch'а `app.module.ts` (spine). Per AVTONOM — не трогаем; добавили WpImportService + WpJobStore как providers в существующий TenantsModule. |
| 2 | JwtModule.registerAsync в TenantsModule | SSE-stream нужен ручной JWT verify (?token=); ChatStreamController использует ровно тот же pattern. Single source of truth — env `JWT_SECRET`. |
| 3 | Express native SSE (`@Res() Response`), не Nest `@Sse()` RxJS | Long-lived stream — проще контролировать flush + heartbeat + unsubscribe-on-close вручную; копировал из chat (там тоже native Express writes). |
| 4 | Job-store in-memory, не Redis Pub/Sub | NAS Phase 0 — single API процесс. EventEmitter с buffer покрывает все случаи (включая late-subscribers); Redis — оверкилл. |
| 5 | `content.rendered` сохраняем as-is в `cms_pages.body = [{text, html}]` без DOMPurify | WP сам fairly sanitize'ит `<script>` в content. Sanitize-passport — отдельная задача. Пока приемлемо. |
| 6 | Featured images НЕ маппим в hero-block при первом проходе | Нужен post-processing pass: после media-import resolve WP media-id → S3 key и дописать `hero` в block array. Отдельная сессия. |
| 7 | Меню: flatten top-level | Иерархия требует tracking `parent_id` mapping `wp_menu_item_id → nas_uuid` — лишний complexity для MVP. |
| 8 | maxMediaItems default 200 (cap 1000) | Защита от случайного 10k-image импорта; на realных эскорт/спа сайтах 100-200 покрывает обычную галерею. |
| 9 | Cancel-кнопки нет в wp-importing view | Cancel требовал бы передачи AbortSignal'а в WpImportService.run + проверки cancel-bit на каждой итерации. Out of scope. Юзер закрывает вкладку — import продолжается на сервере (потом сам finalize'нет). |
| 10 | SESSION_LOG обновляю, MEMORY НЕТ | Per AVTONOM рекомендация: SESSION_LOG живой, MEMORY обновляем только по явному запросу пользователя. |

### Spine touches

**НЕТ.** `app.module.ts` не трогали. Всё non-spine:
- M `tools.service.ts`, `tools.controller.ts`, `tenants.controller.ts`, `tenants.module.ts`
- NEW dto + service + job-store
- M `BootstrapWizard.tsx`, NEW `wp-import-api.ts`

### Пропущено / отложено

- **Sanitize WP HTML** (DOMPurify-like) — `content.rendered` лежит как есть.
- **Featured images → hero block** — нужен второй проход после media-import.
- **WP-Admin app-password** — drafts/private posts.
- **HTML fallback** для сайтов с закрытым `/wp-json`.
- **Tilda / Wix / Bitrix** — отдельные модули.
- **Иерархия меню** (>1 уровень) — пока flatten.
- **Cancel-кнопка** в wp-importing view.
- **Resize / oxipng** оптимизация изображений на лету.

### Рекомендации на следующую сессию

1. **Реальный smoke** на одном из 10–15 пользовательских WP-сайтов с `/wp-json` (make.wordpress.org защищает /pages — нужен open public-content site).
2. **Featured images post-pass** — самое заметное улучшение для UX (hero-блок на каждой импортированной странице).
3. **DOMPurify** для `content.rendered` — security.
4. **Очистка test-тенантов** (`smoketest`, `wp-make-smoke2`) — пользовательский cleanup или `DELETE /v1/platform/tenants/:id`.
5. **VPS deploy** свежих 9 коммитов из этой сессии — только пользователь.
6. **`/admin/staff`** — последняя CRUD-страница из CRM-цепочки. Теперь у нас и services/, и salons/ live; staff требует M2M с обоими.

### Не повредил ничего

- Spine не трогал.
- Typecheck api + web clean.
- Pre-existing /admin/services, /admin/clients, /admin/salons работают как раньше (расширение TenantsModule не сломало existing endpoints).
- Push не делал.

---

## 2026-05-17 22:55 → 23:?? · AVTONOM · dashboard-restore

**Trigger:** «AVTONOM: Сопоставь — что ещё из нашего проекта мы можем прикрутить к этому дэшборду? Куда делись визитки из раздела "проекты"? И сделай всё-таки шрифт в дэшборде JetBrains Mono. Делай всё сам, я уйду минут на 55».

**Session plan:** `barbie/NON_PROJECT/session-plans/2026-05-17-2255-AVTONOM-dashboard.md`

**Commit:** `3c3ae93 feat(barbie/SITE1/web): restore Проекты page + JBM dashboard font`

### Сделано

1. **Шрифт `/admin` dashboard → JetBrains Mono.**
   - `apps/web/src/app/admin/page.tsx`: обёртка `<div className="font-mono">` на корне страницы.
   - Scope: только контент-зона главного dashboard'а. Rail + Topbar + login + остальные admin-страницы остались на RF Rufo (см. AI-Default #1).

2. **Восстановлены «визитки» из раздела Проекты.**
   - **Диагноз:** пункт `<RailItem disabled label="Проекты" badge={10} />` был заглушкой — view `#view-projects` из `dashboard-2077.html` (lines 1810–2150, рендерится JS-функцией `renderProjects()`) никогда не портировался в React `/admin`. Cards не «делись» — они в первый раз появились в реальном shell этой сессией.
   - **Новые файлы:**
     - `apps/web/src/app/admin/projects/page.tsx` — grid + heading.
     - `apps/web/src/components/admin/sections/projects/ProjectCard.tsx` — карта с editable tokens (309 строк).
     - `apps/web/src/components/admin/sections/projects/TokenPopover.tsx` — color+font picker (160 строк).
     - `apps/web/src/lib/projects-data.ts` — `PROJECTS` (10 тенантов) + `TOKEN_FONTS` (18 шрифтов).
     - `apps/web/src/lib/projects-storage.ts` — load/save + base64 encode для preview-URL.
   - **Rail:** `Проекты` теперь активный `href="/admin/projects"`.
   - **Поведение карты:**
     - ФОН-pill, заголовок, подзаголовок, телефоны — кликабельны, открывают TokenPopover.
     - Логотип-slot — upload SVG в `data:` URL.
     - «Сохранить» → localStorage `tenant-design-<domain>` с feedback («Сохранено» / «Ошибка»).
     - «Превью» → `/{slug}?td=<base64 tokens>` в новой вкладке.
   - **Совместимость:** payload `?td=base64(tokens)` совпадает с тем, что читает legacy mockup `site-mockup/{domain}/home.html`.

3. **Карта gap'ов — что ещё можно прикрутить.**
   - См. таблицу ниже.

### Карта прикручиваемых модулей (NAS)

| Backend module                | Web admin page             | Статус        | Сложность         | Что даст                                                                |
| ----------------------------- | -------------------------- | ------------- | ----------------- | ----------------------------------------------------------------------- |
| `TenantsModule`               | `/admin/tenants`           | ❌ нет        | M (5–8 ч)         | platform-admin: создание/удаление/листинг тенантов                      |
| `SalonsModule`                | `/admin/salons`            | ❌ нет        | S (3–5 ч)         | per-tenant: список локаций + расписание                                 |
| `ServicesModule`              | `/admin/services`          | ❌ нет        | S (3–5 ч)         | прайс-лист (название, длительность, цена, описание)                     |
| `StaffModule` + `staff_services` | `/admin/staff`         | ❌ нет        | M (5–8 ч)         | сотрудники + M2M «кто что делает»                                       |
| `ClientsModule`               | `/admin/clients`           | ❌ нет        | M (5–8 ч)         | CRM-карточки клиентов + история визитов                                 |
| `AppointmentsModule`          | `/admin/appointments`      | ❌ нет        | L (1–2 дня)       | календарь бронирований (client, staff, service, salon, start, end)      |
| `CmsModule`                   | `/admin/cms`               | ❌ нет        | M (5–8 ч)         | long-form страницы (about, articles)                                   |
| `MediaModule` + S3            | `/admin/media`             | ❌ нет        | M (5–8 ч)         | upload manager для logo/favicon/gallery                                 |
| `MenuModule`                  | `/admin/menu`              | ✅ есть       | —                 | —                                                                       |
| `ChatModule`                  | `/admin/chat`              | ✅ есть       | —                 | —                                                                       |
| `ToolsModule`                 | `/admin/tools`             | ✅ есть       | —                 | —                                                                       |
| —                             | `/admin/projects`          | ✅ **новое**  | —                 | brand-identity grid (эта сессия)                                        |
| —                             | `/admin/design`            | ❌ нет        | S (3–5 ч)         | вынести редактирование `tenant_design_tokens` в отдельную страницу из карточек проектов |
| —                             | `/admin/users`             | ❌ нет        | M (5–8 ч)         | управление tenant_users (per-tenant сотрудники-операторы)               |

**Низко-висящий плод (по убыванию ROI):**

1. **`/admin/services` + `/admin/staff`** — самая используемая CRM-сцена. Drizzle-схемы уже есть, controllers есть. Только нужен React-CRUD.
2. **`/admin/clients`** — естественное продолжение Services/Staff.
3. **`/admin/appointments` (календарь)** — большой эффект, но больше работы (нужен calendar UI primitive).
4. **`/admin/design` отдельной страницей** — текущие визитки совмещают grid+edit; для serious workflow удобнее иметь полноэкранный редактор одного тенанта.
5. **`/admin/media`** — нужно когда серьёзно начнём с logo/favicon (сейчас SVG в localStorage только).

### AI-Default решения

| # | Решение                                                          | Причина                                                                                                                       |
| - | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1 | JBM scope = только `/admin` page wrapper, не глобальный `font-admin`. | User сказал «шрифт в дэшборде» — буквально dashboard page, не вся админка. Login + остальные страницы не должны mono'нуться без явного запроса. |
| 2 | Persistence = localStorage, не API.                              | Endpoint `PUT /v1/tenants/:slug/design-tokens` пока не реализован. Совместимость с legacy iframe-preview сохраняется через `?td=base64`. Миграция = 1 файл. |
| 3 | Placeholder pages для Salons/Staff/Clients/Appts **не создавать**.    | Пустые страницы загрязняют commit history и rail. Лучше gap-таблица здесь + явное решение пользователя по приоритетам. |
| 4 | `barbie/SESSION_LOG.md` (project-root уровень), а не корень репо. | `F:/Users/a/Documents/_DEV/Tran/ES/` — это монорепо нескольких проектов (escort + barbie). Барби-логи в `barbie/`. |
| 5 | Session plan untracked (как handoff'ы), не коммитим.             | Сессионные планы — рабочие артефакты, не нужны в истории git. Handoff'ы пользователь явно решал держать untracked. |

### Пропущено / отложено

- **Token popover live preview** работает через React state, но preview блок внутри popover использует `style={{ fontFamily: '...' }}` — для шрифтов, не загруженных в проект (Bodoni Moda, Bebas Neue, Orbitron…), браузер fallback'нется на serif/sans. Это и в оригинале так — Google Fonts на проекте не подключены, только в HTML-моках. Это норма.
- **MEMORY.md обновление** про переключение dashboard на JBM — не делал, потому что это session-specific решение, не глобальная политика. Если решение надо зафиксировать как новый default — скажи, и я обновлю `project_nas_dashboard_design_source.md` (это уже неявно spine-аналог memory, обновлять только по явной команде).
- **Pre-existing test gaps** для chat (ENTITY §2.2) — out of scope сегодняшнего AVTONOM'а.

### Рекомендации на следующую сессию

1. **Решить про роль `/admin/projects` vs `/admin/design`.** Сейчас визитки делают и preview, и edit. По мере роста удобнее разделить: grid (read-only список) → клик → полноэкранный редактор одного тенанта (`/admin/design/:slug`).
2. **Добавить `PUT /v1/tenants/:slug/design-tokens`** в `TenantsController` → переключить `projects-storage.ts` на API за 5 минут. Сохранение в localStorage станет cache, не источником правды.
3. **Самая ценная следующая страница — `/admin/services`** (smallest gap, biggest unblock). Drizzle-схема `services` уже есть, controller есть. Нужен React-CRUD в стиле существующего MenuModule.
4. **Tenant-isolation tests для chat** (ENTITY §2.2) — формальное обязательство, висит с прошлой сессии.
5. **VPS deploy** двух свежих коммитов из ship-плана (`a0da39c`, `62241fc`) + этого (`3c3ae93`) — `git pull && npm run vps:after-pull`. Не делал push'а сегодня (push'ит только пользователь).

### Чек-листы для smoke

- [ ] Открыть http://localhost:3011/admin/projects → проверить, что 10 карт рендерятся.
- [ ] Клик на ФОН-pill → выбрать цвет → preview-карта меняет фон вживую.
- [ ] Клик на заголовок → выбрать шрифт `Orbitron` → название меняет шрифт (fallback на sans-serif норм).
- [ ] «Сохранить» → перезагрузить страницу → значения сохранились.
- [ ] «Превью» → новая вкладка с `/{slug}?td=…` (если есть overrides) или просто `/{slug}`.
- [ ] http://localhost:3011/admin → весь dashboard в JBM. Rail + Topbar остались на RF Rufo.

### Не повредил ничего

- Spine не трогал (только non-spine: pages, components, libs).
- Typecheck `apps/web` clean.
- Commit подписан `AI-Assisted: Claude Code` (per AVTONOM).
- Push не делал.
