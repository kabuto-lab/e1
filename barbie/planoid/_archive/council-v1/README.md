# Governance — Совет умов

> **Назначение:** инженерное самоуправление Barbie. Адаптация подхода «Совет 14-ти умов» (AX•CMS · 2026-05-26) под текущий стек: TypeScript / NestJS / Drizzle / PostgreSQL / Next.js.
>
> **Что это НЕ:** не персонажи, не roleplay, не альтернативная конституция. Сущности — это **когнитивные специализации** AI к одному и тому же артефакту с разных углов.
>
> **Иерархия:** `barbie/ENTITY.md` > `governance/CONSTITUTION.md` > `governance/ENTITY_SYSTEM.md` > `governance/EXECUTION_PROTOCOL.md`. Низший уровень не противоречит высшему.

---

## Зачем это здесь

Длинные проекты под Barbie умирают не от багов в коде, а от **дрейфа**:

- забытые допущения между сессиями (между чатами «памяти нет»),
- локальные оптимизации, ломающие соседние модули,
- архитектурная фрагментация (SITE1 / AX / SITE2 — стек обещали один, а на практике разный),
- невидимый технический долг от молчаливо отвергнутых ADR.

Совет существует, чтобы дрейф **обнаруживать каждую non-trivial сессию** и **чинить в фиксированном окне**.

---

## Объём действия

| Что покрыто | Где живёт |
|---|---|
| **SITE1 / NAS** (canonical NAS) | `barbie/SITE1/` — основной потребитель Совета |
| **SITE2+** (TBD под Barbie) | наследуют этот governance по умолчанию |
| **AX** (Rust-exploration) | имеет **собственный** governance в `barbie/AX/NaSV2/docs/governance/` — этот файл не пересекается с тем; ENTITY.md владеет boundary (§0.1) |
| **work4u** | unstaged exploration — действие governance факультативно до commit |

---

## Порядок чтения

1. **`../ENTITY.md`** — конституция платформы (стек, мультитенантность, spine, VPS). Это **выше** всего в governance.
2. **`CONSTITUTION.md`** — законы Совета: Tension Doctrine, Priority Ladder, Immutables, Forbiddens, 10 Anti-Drift, Judge Algorithm.
3. **`ENTITY_SYSTEM.md`** — досье 14-ти умов: роли, output shapes, forbidden moves, матрица активаций.
4. **`EXECUTION_PROTOCOL.md`** — ежедневный цикл T0–T13, режимы MANUAL/SEMIAUTO/AVTONOM, конфликты, recovery.
5. **`ROADMAP_ENGINE.md`** — как `platform-blueprint.html` План→Статус + `ENTITY.md` §4/§11 + активный `MIGRATION_PLAN_*.md` потребляются и эволюционируют через RETRO + MPD pipeline; формальные определения D-1..D-10 для NAS.
6. **`decision-graph.md`** — append-only журнал ratified/anticipated ADR (Historian).
7. **`CHANGELOG.md`** — лог поправок в governance (Motions).

---

## Что меняется по сравнению с AX•CMS governance

Перенесён фреймворк. Перепривязан стек. Конкретно:

| Аспект | AX•CMS | Barbie (этот governance) |
|---|---|---|
| **Стек FORGEMASTER** | Rust / Tokio / Leptos | **TypeScript / NestJS / Drizzle / Next.js** |
| **СУБД-контракт** | Postgres + RLS + PgBouncer transaction-mode | Postgres + **`tenant_id` filter в каждом запросе** + tenant guard (RLS — будущая опция) |
| **Перф-цели** | 10–20 ms p95, 10 K req/s/core | UI responsiveness + p95 < 200 ms на горячих эндпоинтах, без hyper-scale претензий |
| **Priority Ladder** | Performance в hot-path = correctness | **Maintainability > Performance** (NAS — long-term asset, §11 ENTITY) |
| **Дрейф D-3** | `xtask capability-coverage` | **tenant-guard coverage drift** (grep по контроллерам) |
| **Дрейф D-5** | `pool_mode = transaction` | **migration-state drift** (Drizzle journal vs applied) |
| **Daily cycle** | T0–T13 каждую сессию (240-дневный план) | T0–T13 **по классу задачи** через матрицу активации §14 |
| **Plan-engine** | `WP-PLAN-12-MONTH.html` (240 ячеек) + `ROADMAP_ENGINE.md` (12-month) | **Epic Engine** — `apps/web/public/platform-blueprint.html` План→Статус + `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` + текущие session-plans + `ROADMAP_ENGINE.md` (epic-close cadence, не календарный) |
| **Кодовые имена** | те же 14 | **те же 14** (портабельность нарратива) |

---

## Структура папки

```
barbie/governance/
├── README.md                  ← этот файл
├── CONSTITUTION.md            ← законы Совета
├── ENTITY_SYSTEM.md           ← 14 умов, output shapes, активации
├── EXECUTION_PROTOCOL.md      ← T0–T13, режимы, конфликты
├── ROADMAP_ENGINE.md          ← план → execute → evolve; blueprint/MIGRATION_PLAN reconciliation; D-1..D-10 detectors
├── decision-graph.md          ← ADR ledger (append-only)
├── CHANGELOG.md               ← governance amendments
├── COUNCIL-COMPARISON.html    ← visual: pre-Council vs Council (NAS-specific)
├── adr/                       ← ADR-NNN-<slug>.md (ratified/proposed решения)
├── motions/                   ← MOT-NNN-<slug>.md (изменения конституции)
├── master-plan-diffs/         ← MPD-NNN-<slug>.md (диффы blueprint/MIGRATION_PLAN через RETRO)
└── memory/                    ← досье сущностей (orchestrator_*.md, sentinel_*.md, ...)
```

---

## Как запускать (квикстарт)

Совет уже принят (Adoption Pass — `CHANGELOG.md`, эта же дата). Файлы на месте. Что делать оператору:

1. **Перед сессией** — открыть `EXECUTION_PROTOCOL.md §1` (матрица активаций). Решить класс задачи (trivial UI / new endpoint / migration / WP-import / admin UI / spine touch / amendment). От класса зависит, какие Tier-ы активируются.
2. **Открыть терминал в корне barbie/** — `F:\Users\a\Documents\_DEV\Tran\ES\barbie`. CLAUDE.md (из родительского ES) и `ENTITY.md` (отсюда) загрузятся автоматически.
3. **Решить режим** (см. `../ENTITY.md` ссылка на ES `CLAUDE.md §M`):
   - **MANUAL** — без префикса; AI спрашивает на каждой развилке.
   - **SEMIAUTO:** — префикс перед сообщением; один manifest на одобрение, дальше без остановок (кроме spine).
   - **AVTONOM:** — префикс; полностью автономно; session-plan в `NON_PROJECT/session-plans/`; SESSION_LOG в корне barbie.
4. **Первая строка ответа AI** обязана быть: `[mode:MANUAL|SEMIAUTO|AVTONOM] phase:<name> epic:<id> spine:<clear|pending>`. Если нет — прервать, попросить ритуал старта T0 повторить.
5. **По завершении сессии** — открыть `SESSION_LOG.md` в корне barbie/, разделы Outcome / Recommendations / Commits. Решить про `git push` (только оператор; `git push` Совет никогда не делает сам).

---

## Где Совет НЕ применяется

- **Trivial fix** (опечатка, CSS-tweak, переименование переменной в одном файле) — Tier-1 verdict достаточно, full Council pass запрещён как `consensus theater` (Forbidden F-1, см. CONSTITUTION).
- **Эксперименты в `NON_PROJECT/`, `experiments/`, `crm-mockup/`, `site-mockup/`, `_sli/`, `font/`** — explicitly out of scope. Это песочница.
- **Спор с явным указанием оператора в live-сессии** — Operator Sovereignty (CONSTITUTION §12) перебивает любой verdict Совета.

---

## История

| Дата | Событие | Trailer |
|---|---|---|
| 2026-05-26 | Adoption Pass — governance создан, перенесён из AX•CMS, адаптирован под NestJS/Next.js/Drizzle стек | `Governance-Adoption: v1.0` |

Будущие изменения — через Motion (`motions/MOT-NNN-<slug>.md`) с явным OK оператора (см. CONSTITUTION §11).

---

**End of README.** Дальше — `CONSTITUTION.md §0`.
