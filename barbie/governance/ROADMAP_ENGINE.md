# ROADMAP ENGINE — How the NAS Roadmap is Consumed and Evolved

> **Status:** binding · v1.0 · 2026-05-27
> **Authority:** subordinate to `barbie/ENTITY.md`, `governance/CONSTITUTION.md`, `governance/ENTITY_SYSTEM.md`, `governance/EXECUTION_PROTOCOL.md`.
> **Purpose:** define how the NAS roadmap (`apps/web/public/platform-blueprint.html` План→Статус + `barbie/ENTITY.md` §4/§11 + active `NON_PROJECT/MIGRATION_PLAN_*.md`) is consumed by the Council, how it is allowed to evolve, and how drift between plan and reality is detected and repaired.

---

## §0 · The Three Views of the Roadmap

The roadmap is not a single document; it is **three views** of one underlying state:

| View | File(s) | Authority | Mutability |
|---|---|---|---|
| **PLANNED** | `SITE1/apps/web/public/platform-blueprint.html` (План→Статус — visual ground truth) + `barbie/ENTITY.md` §4 (Phase 0 goals) + §11 (Engineering Entity targets) + `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` (active multi-phase plan, currently 7 Phases A–G + extended H/I/J/K) + per-track session-plans under `NON_PROJECT/session-plans/` | binding for *intent*; **not** binding for exact dates | mutable via §4 RETRO + MPD pipeline |
| **EXECUTING** | `NON_PROJECT/session-plans/YYYY-MM-DD-HHMM-AVTONOM-<topic>.md` (the day's plan) + active `governance/adr/ADR-NNN-*.md` with `Status: Proposed` or `Accepted` | binding for *today*; reflects PLANNED + Council ratifications | mutable up to T11 ratification, frozen on commit |
| **EXECUTED** | `git log` (truth) + `SESSION_LOG.md` (barbie root — per-session ledger) + `governance/decision-graph.md` (ratified ADRs + lineage) + `governance/CHANGELOG.md` (constitutional amendments) | binding for *reality* — the source of truth about what actually happened | append-only |

These three views must reconcile. The reconciliation engine **is** the Council loop (`EXECUTION_PROTOCOL.md` T0–T13).

The blueprint **План→Статус** tab is the single user-facing source. `MIGRATION_PLAN_work4u_into_NAS_*.md` operationalizes one multi-phase initiative inside that plan; future multi-phase initiatives get their own `NON_PROJECT/<INITIATIVE>_PLAN_YYYY-MM-DD.md` and are linked from the blueprint cell that triggers them.

---

## §1 · Inputs to the Engine

At any given session, the engine reads (T0–T1 in `EXECUTION_PROTOCOL.md`):

1. **PLANNED inputs**
   - `SITE1/apps/web/public/platform-blueprint.html` — План→Статус row for the active epic.
   - `barbie/ENTITY.md` §4 (Phase 0 scope) + §11 Engineering Entity targets (Target stack still pending wiring).
   - Active `NON_PROJECT/MIGRATION_PLAN_*.md` if the session continues a multi-phase initiative (today: `MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` — 7 Phases A–G + H/I/J/K).
   - Latest `NON_PROJECT/session-plans/<date>-AVTONOM-<topic>.md` if continuing yesterday's track.

2. **EXECUTING inputs**
   - Today's session-plan if AVTONOM (created at T0; lives under `NON_PROJECT/session-plans/`).
   - `governance/decision-graph.md` §1 (Anticipated ADRs slots) to know which ADR is due to be drafted.

3. **EXECUTED inputs**
   - `git log` (last 14 days) — commits actually landed; trailers (`AI-Assisted: Claude Code`, `Governance-Adoption:`, `Constitutional-Amendment:`).
   - `SESSION_LOG.md` (barbie root) — yesterday's Outcome / AI-Default decisions / Spine touches / Recommendations.
   - `governance/decision-graph.md` §2 — ratified ADRs with IMPL state lines.
   - `governance/CHANGELOG.md` — constitutional amendments to date.

4. **Memory inputs** (per `ENTITY_SYSTEM.md §17`)
   - User-level `C:\Users\a3\.claude\projects\F--Users-a-Documents--DEV-Tran-ES\memory\MEMORY.md` (auto-loaded by Claude Code).
   - Tier-1 dossiers if present: `governance/memory/orchestrator_init.md`, `forgemaster_init.md`, `sentinel_init.md`.
   - `memory/project_next_day_plan.md` — canonical hook for "what to do next" (auto-loaded by `CLAUDE.md §M`).

5. **Reality probes** (live, never cached)
   - `Grep` / `Glob` over `apps/api/src/**` and `apps/web/src/**` for code claims.
   - `npm run check:tenant-coverage` (ADR-001 IMPL-A/B/D shipped 2026-05-26) — multi-tenant guard drift detector.
   - `npm run db:check-state` (ADR-002 IMPL-A/B/D shipped 2026-05-27, Mode A — journal vs hand-written allow-list) — migration-state drift detector.
   - `npm run typecheck` / `npm run lint` / `npm run test` — gates.
   - `git status` / `git diff --stat` — scope reality vs plan.

---

## §2 · The Drafting Pipeline (planned → drafted)

The transition from a blueprint cell into a `drafted` session-plan:

```
blueprint.html План→Статус cell  →  AVTONOM session-plan T0 (Orchestrator + Historian)
        │                              §Mission / §Entering state / §Tracks / §Spine touches
        ▼
ENTITY.md §4/§11 + MIGRATION_PLAN  →  §Tracks (e.g. Track G, Track D, Track B) with concrete files
        │
        ▼
Yesterday's SESSION_LOG §Outcome    →  §Entering state (forecast drift D-8 check)
+ §Recommendations                     §Carry-over: pending ADRs / unfinished tracks
        │
        ▼
Council Tier-1  → Forgemaster Memo, Sentinel Risk Audit, (Simplifier counter at T6)
        │
        ▼
Council Tier-2  → Historian Trace, Economist Ledger, Simplifier Counterproposal
        │
        ▼
Council Tier-3/4 → (per Activation Matrix ENTITY_SYSTEM §14)
        │
        ▼
Conflict?       → Judge if any (CONSTITUTION §7)
        │
        ▼
Ratify          → Session-plan committed locally with §Council Review filled.
                  Status moves from `drafted` to `ratified`.
```

Drafting is the only stage where the day's *content* can change. After T11 ratification, the artifact is read-only — corrections land in a follow-up session-plan, not by overwriting yesterday's.

NAS does NOT use the two-document split (`architect.md` + `senior-dev.md`) from AX•CMS. One session-plan per AVTONOM session, with sections matching `ENTITY_SYSTEM.md §16` (Council Review + Council Engineering Pass). This was a deliberate adaptation logged in `CHANGELOG.md` v1.0.

---

## §3 · The Execution Pipeline (ratified → executed)

The session runs:

```
T11 ratified session-plan
        │
        ▼
AVTONOM / SEMIAUTO / MANUAL session executes per §Tracks
   ▸ V1..V4 gates per `EXECUTION_PROTOCOL.md` T11
   ▸ phase-by-phase commits on `main` (local only, no push)
   ▸ each commit references the §Track or §ADR slot in its body
   ▸ SESSION_LOG.md appended at T12 (Outcome / AI-Default / Spine / Commits / Recommendations / Skipped Council passes)
        │
        ▼
T12 session-end ritual
   ▸ gates green: `npm run typecheck` + `lint` + relevant tests + tenant-isolation specs
   ▸ `npm run check:tenant-coverage` clean (D-3)
   ▸ `npm run db:check-state` clean (D-5)
   ▸ memory deltas saved to `governance/memory/<entity>_*.md`
   ▸ `governance/decision-graph.md` updated or explicit "no graph delta" recorded
        │
        ▼
T13 anti-drift sweep
   ▸ D-1, D-3, D-5, D-6, D-7 per-session
   ▸ D-2, D-9 on any Friday session
   ▸ D-4, D-8, D-10 at epic-close RETRO
   ▸ trips logged to `governance/memory/orchestrator_drift_log.md` (append-only)
        │
        ▼
git HEAD + SESSION_LOG = EXECUTED truth
```

Execution is **never amended retroactively**. If today went wrong, yesterday's `SESSION_LOG` and `git log` remain truthful; the repair lands in tomorrow's session-plan. `--amend` on prior-session commits is forbidden (`EXECUTION_PROTOCOL.md §18`).

---

## §4 · The Evolution Pipeline (RETRO → MPD → blueprint amendment)

The blueprint evolves. Evolution is allowed only through the formal pipeline.

### §4.1 — Epic-close RETRO

At every epic-close (e.g. close of Phase 1 CMS · close of Migration Phase A · close of Track G), the Council runs a full activation pass:

```
RETRO session
   ▸ Council full activation: Tier-1 + Tier-2 + all relevant Tier-3 + all three Tier-4
   ▸ `EXECUTION_PROTOCOL.md §14` epic-RETRO drift sweep (D-4, D-8, D-10 all run)
   ▸ Output: SESSION_LOG.md §RETRO entry with:
       §summary-of-epic
       §goals-shipped vs goals-planned (refer blueprint cell)
       §AI-Default-decisions-applied (verbatim from prior SESSION_LOG entries)
       §drift-audit (every D-N detector result for this epic)
       §carry-over to next epic
       §blueprint-diff (if any — proposed text change to platform-blueprint.html)
       §migrator-outlook (Tier-4 if data shape touched)
       §ecosystem-outlook (Tier-4 if tenant-onboarding touched)
       §productor-notes (Tier-4 if /admin/* touched)
   ▸ Operator OK required for any §blueprint-diff
   ▸ Next-epic bootstrap: open `NON_PROJECT/session-plans/<next-date>-AVTONOM-<next-topic>.md` stub
```

There is no fixed monthly cadence in NAS today (unlike AX•CMS's 240-day daily-cell plan). The RETRO cadence is **epic-close**, not calendar-driven. If an epic runs longer than 14 calendar days without close, the Council raises an early-RETRO motion to operator.

### §4.2 — Blueprint-diff process (MPD — Master Plan Diff)

If a RETRO proposes to change `platform-blueprint.html`:

1. **Diff document** — `governance/master-plan-diffs/MPD-NNN-<slug>.md`:
   - Source: RETRO session-id (date + epic name).
   - Original blueprint cell HTML — verbatim copy from `platform-blueprint.html`.
   - Proposed new cell HTML.
   - Rationale (≥ 200 words; cite ≥ 2 future epics affected).
   - Council verdicts (all activated tiers).
   - Cost impact (Economist Ledger excerpt).
   - Risk impact (Sentinel Risk Audit excerpt).
   - Migration impact (Migrator Outlook excerpt).

2. **Operator OK** — explicit `Approved-by:` line in the MPD.

3. **Spine touch** — `platform-blueprint.html` is currently spine (`CLAUDE.md §M`). Edit requires explicit operator OK on this specific file in addition to the MPD approval. The MPD documents the *intent*; the spine-touch is the *act*.

4. **Commit** — single commit on `main`, includes both files (the MPD + the blueprint edit), trailer `Master-Plan-Diff: MPD-NNN`. No push without separate operator instruction.

5. **Roll-forward** — open follow-up session-plan slots for the renamed/reshaped epic cells; `governance/decision-graph.md` gets `Consulted: MPD-NNN` on any ADR derived from the new plan.

### §4.3 — What evolution is forbidden

- Silently editing `platform-blueprint.html` outside a RETRO + MPD (spine-touch + F-12 violation — `CONSTITUTION.md §5`).
- Reordering Phase 1 → Phase 2 sequencing in `barbie/ENTITY.md` §4 without a §11 amendment (CONSTITUTION amendment process).
- Reopening §4 Immutables of `CONSTITUTION.md` without §11 amendment + ENTITY.md harmonization.
- Adding speculative Phase-N+2 cells to the blueprint without explicit "speculation" tag and a removal criterion — bare speculative scaffolding is F-4.
- Mutating `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` in-place to change scope. The plan is dated; scope changes open a new `MIGRATION_PLAN_<initiative>_<new-date>.md` that `Supersedes:` the prior dated file (analogous to ADR superseding).

---

## §5 · Drift Detectors — formal NAS definitions

The ten drift patterns from `CONSTITUTION.md §6` get **formal NAS-grade definitions** here so detectors can be implemented and grep-replaced over time:

| ID | Detector contract (NAS) | Current implementation | Future automation |
|---|---|---|---|
| **D-1 Scope** | `git diff --stat <session-start-SHA>..HEAD -- 'SITE1/apps/**' 'SITE1/packages/**'` reports `≥ 1.3 × ` the LOC budget implied by session-plan §Mission scope text (heuristic: scope < 100 chars ⇒ budget ≤ 400 LOC; scope < 200 chars ⇒ budget ≤ 800 LOC; else ≤ 1500 LOC). Threshold trip = D-1 flag. | Manual at T13. Orchestrator records LOC vs scope in SESSION_LOG. | `npm run check:scope` reading session-plan front-matter (deferred). |
| **D-2 ADR drift** | For every ADR with `Status: Accepted`, every commit since the ADR's `Decision-Date:` is checked against the ADR's `Consequences` section. Violation = D-2 flag. | Manual weekly (Historian sweep every Friday session). | Cron-style `npm run audit:adr-drift` (deferred). |
| **D-3 Tenant-guard coverage** | Any new HTTP handler in `apps/api/src/**/*.controller.ts` (decorators `@Get/@Post/@Put/@Delete/@Patch`) missing tenant scoping. **The #1 critical drift for NAS** — tenant leak is existential. | **`npm run check:tenant-coverage`** (ADR-001 IMPL-A/B/D shipped 2026-05-26; coverage.allow.json hand-curated for legitimate platform-admin endpoints). Wired into `npm run lint`. | L2 raw-query detector (ADR-001B follow-up). |
| **D-4 Bench / Lighthouse drift** | A hot-path endpoint's p95 regresses > 20 % vs prior epic; or a public Next.js route's Lighthouse score drops > 5 points. | Manual today (`autocannon` + browser Lighthouse). Test Pilot records baselines in `governance/memory/testpilot_*.md`. | Nightly Lighthouse CI (Phase 2). |
| **D-5 Migration-state drift** | `packages/db/drizzle/migrations/_journal.json` out-of-sync with `packages/db/hand-written-migrations.json` allow-list — i.e. an SQL file exists with no journal entry, or vice versa. | **`npm run db:check-state`** (ADR-002 IMPL-A/B/D shipped 2026-05-27, Mode A — 14/14 node:test green). Boot refuses on drift via `run-migrate.mjs`. | IMPL-C Mode B (`--with-db` — actual `_drizzle_migrations` table vs journal) deferred to Phase L. |
| **D-6 Planning trail drift** | A commit references a session-plan / ADR / blueprint cell that doesn't exist or has the wrong date. | Manual at T13 via `git log -1 --format=%B` grep. | `npm run check:planning-refs` (deferred). |
| **D-7 Architecture-layer drift** | Backend: a controller imports from another module's `internal/` or non-public surface. Frontend: a page imports from another feature's `_lib/` or non-public surface. | Manual today; Forgemaster section in §Council Engineering Pass calls out boundary violations. | `eslint-plugin-import` `no-restricted-paths` rule (Phase 2). |
| **D-8 Forecast drift** | A session-plan's §Entering state doesn't match reality at T1. Example: plan says "ADR-004 exists with Status: Proposed" but `governance/adr/ADR-004-*.md` is absent. | T1 (Read-before-trust) — `Grep` / `Glob` mandatory; any mismatch = D-8 flag, plan §Entering state revised before T2. | Stable. |
| **D-9 Decision-graph drift** | A new ADR contradicts a prior `Status: Accepted` ADR without explicit `Supersedes: ADR-NNN`. | Historian per-ADR check; `governance/decision-graph.md` §2 ratified table audited at every ADR ratification. | Stable; future automation would diff §Consequences sections. |
| **D-10 Memory drift** | A saved memory fact (`C:\Users\a3\.claude\projects\F--Users-a-Documents--DEV-Tran-ES\memory\*.md` OR `governance/memory/<entity>_*.md`) contradicts current code/state. | Read-before-trust at T1 on every memory citation that drives a recommendation. Stale → memory updated or deleted, never acted on. | Stable. |

Each detector writes a line to `governance/memory/orchestrator_drift_log.md` on trip:

```
YYYY-MM-DD HH:MM  D-<N>  <severity: info/warn/critical>  <fact-summary>  <suggested-repair>
```

Cadence (`EXECUTION_PROTOCOL.md §14`):

- **Per-session sweep at T13** — D-1, D-3, D-5, D-6, D-7.
- **Friday weekly sweep** — D-2, D-9.
- **Epic-RETRO sweep** — D-4, D-8, D-10 (every detector runs at epic close).

---

## §6 · Re-Planning Triggers

When does the engine **force** a blueprint / MIGRATION_PLAN revision rather than wait for the next epic-close RETRO?

| Trigger | Action |
|---|---|
| **Two D-1 (scope) trips in a single week** | Schedule a mid-epic RETRO; operator OK required; new MPD if scope adjustment ratified. |
| **Any D-2 (ADR drift) on a `Status: Accepted` ADR** | Stop normal work; emergency ADR-supersede pass; new ADR with `Supersedes: ADR-NNN` drafted before any further commits on affected modules. |
| **Any D-3 (tenant-guard coverage) regression** | **Production-grade incident even in dev.** Sentinel takes lead; root cause named, repair-or-allow-list-with-rationale before next AVTONOM session. Tenant-leak = existential — never amortized. |
| **Any D-5 (migration-state) trip** | Boot refuses (already enforced by `run-migrate.mjs`); root cause named; if a hand-written migration must be added, `packages/db/hand-written-migrations.json` entry written with reason before retrying. |
| **Lighthouse score drop > 10 points on a hot public route** | Open PERF-NNN session-plan; current epic sheds feature work for a perf-restore session. |
| **`platform-blueprint.html` cell text contradicts implemented code for > 7 days** | Forecast drift D-8 escalation; force-RETRO; operator OK on blueprint amendment. |
| **Operator declares re-planning** | Direct blueprint amendment; bypass normal RETRO cadence; MPD created from operator's instruction. |

A re-planning trigger fires a **§4.2 MPD process** with `Source: re-planning-trigger-<id>` instead of `Source: RETRO-<epic>-close`.

---

## §7 · Plan Versioning

`platform-blueprint.html` and active `MIGRATION_PLAN_*.md` documents are versioned:

| Version | Source-of-change | Notation |
|---|---|---|
| `blueprint v1.N` | Per-MPD ratification | `<!-- blueprint-version: v1.<count of MPDs to date> -->` HTML comment in `platform-blueprint.html` head + matching trailer in MPD commit |
| `MIGRATION_PLAN dated v1.0` | Initial creation (current: `_2026-05-25`) | filename suffix is the canonical version |
| `MIGRATION_PLAN v2.0` | Major scope expansion; new file `MIGRATION_PLAN_<initiative>_<new-date>.md` with `Supersedes: <prior-file>` in header | dated supersede |

Versioning is **monotonic**. A `v1.5` cannot become `v1.4` — any rollback creates `v1.6` mirroring `v1.4` content. The bump is part of the §4.2 MPD commit (same commit; trailer carries both `Master-Plan-Diff: MPD-NNN` and `Blueprint-Version: v1.<N>`).

`barbie/ENTITY.md` §4 (Phase scope) and §11 (Engineering Entity stack) bump under a separate process: spine-touch + amendment per `CONSTITUTION.md §11`. They are not version-bumped by MPD; an MPD that affects them blocks until the ENTITY.md amendment is also ratified.

---

## §8 · Linkage Map

How each governance file participates in the engine:

```
                  ┌─────────────────────────────────┐
                  │     OPERATOR (sovereign)        │
                  └─────────────┬───────────────────┘
                                │
              ┌─────────────────┴──────────────────┐
              │                                    │
              ▼                                    ▼
  ┌──────────────────────┐           ┌─────────────────────────┐
  │   barbie/ENTITY.md   │           │  CONSTITUTION.md        │
  │   (platform code     │  binds    │  (entity governance     │
  │    constitution)     │ ─────────►│   constitution)         │
  └─────────┬────────────┘           └─────────┬───────────────┘
            │                                  │
            │                                  ▼
            │                        ┌─────────────────────────┐
            │                        │   ENTITY_SYSTEM.md      │
            │                        │   (14 minds dossiers)   │
            │                        └─────────┬───────────────┘
            │                                  │
            │                                  ▼
            │                        ┌─────────────────────────┐
            │                        │  EXECUTION_PROTOCOL.md  │
            │                        │  (T0–T13 Council loop)  │
            │                        └─────────┬───────────────┘
            │                                  │
            │                                  ▼
            │                        ┌─────────────────────────┐
            └──────────►─────────────│   ROADMAP_ENGINE.md     │
                                     │   (this file —          │
                                     │    plan/execute/evolve) │
                                     └─────────┬───────────────┘
                                               │
                ┌──────────────────────────────┼──────────────────────────────┐
                │                              │                              │
                ▼                              ▼                              ▼
  ┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
  │ SITE1/apps/web/public/   │    │  NON_PROJECT/            │    │  SESSION_LOG.md (root)   │
  │ platform-blueprint.html  │    │  MIGRATION_PLAN_*.md     │    │  + decision-graph.md     │
  │  (План→Статус)           │    │  + session-plans/*.md    │    │  + CHANGELOG.md          │
  │  (PLANNED view)          │    │  (EXECUTING view)        │    │  (EXECUTED view)         │
  └──────────┬───────────────┘    └────────┬─────────────────┘    └────────────┬─────────────┘
             │                             │                                   │
             └─────────────────┬───────────┴───────────────────────────────────┘
                               │
                               ▼
                  ┌────────────────────────────────────────┐
                  │   git HEAD on `main` (local)           │
                  │   = the single source of truth         │
                  │   about what was executed              │
                  └────────────────────────────────────────┘
```

Every arrow is a *binding* relation. A change at any node must propagate (forward through the pipeline) or be rejected at T11.

---

## §9 · Worked example — what happens on 2026-05-27 (Track G + D AVTONOM session)

Concrete trace of an actual NAS session (current `SESSION_LOG.md` entry):

1. **PLANNED inputs at T0 (Opening Ritual):**
   - `barbie/ENTITY.md` §1 (stack: NestJS + Drizzle + PG + Next.js) — re-read, no amendments.
   - `governance/CONSTITUTION.md` §0 (authority ladder) + §3 (priority ladder) + §4 (Immutables) — re-read.
   - `governance/ENTITY_SYSTEM.md` §14 (Activation Matrix) — task class identified: new domain module + new Drizzle aggregate + admin UI page → Tier-1 + Tier-2 + Migrator + Productor + Sentinel (auth).
   - `apps/web/public/platform-blueprint.html` План→Статус — Track G cell (governance foundation) and Track D cell (site-type capability matrix + WFY cities CRUD) both `in_progress`.
   - `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` §3 (site_type capability matrix) — Track D source of intent.
   - Memory `MEMORY.md` — `project_nas_council_governance.md` confirms v1.0 adoption 2026-05-26.

2. **EXECUTING inputs at T0:**
   - `NON_PROJECT/session-plans/2026-05-27-HHMM-AVTONOM-track-g-d.md` — drafted at session start.
   - `governance/decision-graph.md` §1 — ADR-002 still in `Status: Accepted` (IMPL-A/B/D pending).

3. **EXECUTED inputs at T1 (Read-before-trust):**
   - `git log --oneline -10` confirms recent: `0667835 docs · SESSION_LOG`, `23f2390 feat · /admin/wfy/cities CRUD`, `05abd6b feat · wfy-admin cities CRUD API`, `387e85a feat · site-type capability matrix`, `90fd98f feat · db:check-state Mode A`.
   - `SESSION_LOG.md` last entry — yesterday's session closed clean with `npm run check:tenant-coverage` and `npm run db:check-state` green.
   - `governance/decision-graph.md` §2 — ADR-002 IMPL state line confirmed shipped via commit `90fd98f`.

4. **Reality probes at T1:**
   - `Glob governance/adr/ADR-002-*` → 1 hit (the ADR file).
   - `Grep "check:tenant-coverage" SITE1/package.json` → confirms wired.
   - `Grep "check-state" packages/db/check-state.mjs` → confirms 14/14 tests reference.

5. **Council pass (Tier-1 + Tier-2 + Migrator + Productor) at T2–T9:**
   - **Orchestrator (T2):** Track G + Track D align with active epics; forward-inheritance: ADR-001B (raw-query detector) consumes this work.
   - **Historian (T3):** ADR-002 IMPL state line updated to "shipped 2026-05-27"; no contradictions.
   - **Forgemaster (T4):** new aggregate (`wfy_cities`) follows Drizzle composite-index pattern `(tenant_id, slug)`; 2 queries per `/admin/wfy/cities` list endpoint, well under 5-query budget.
   - **Sentinel (T5):** tenant guard verified on every new endpoint; isolation spec name: `wfy-cities-tenant-isolation.spec.ts`.
   - **Simplifier (T6):** ✓ challenged — proposed inlining `WfyCitiesService.create` since called from one controller; Forgemaster rejected (call site count expected to grow with Track D step 3.2).
   - **Economist (T7):** Δ infra ₽/month = 0; per-tenant scaling: O(N cities/tenant), bounded by ≤ 500 cities per tenant per memory.
   - **Migrator (T9):** new migration `0017_wfy_cities.sql` forward-only; rollback drill not exercised but reversible by structure.
   - **Productor (T9):** `/admin/wfy/cities` page palette compliance against `dashboard-2077.html` — RF Rufo ✓, scoop ✓, rail ✓.
   - **Tier-3 NOT activated** — no auth change, no public endpoint, no upload, no WP-import touch.

6. **Conflict?** None.

7. **Ratify (T11)** — session-plan moves to `ratified`; phase-by-phase commits land.

8. **Execute (T11)** — five commits across Track G (governance adoption) + Track D (site_type matrix + WFY cities API + WFY cities admin UI) + ADR-002 IMPL (db:check-state Mode A).

9. **Closing (T12)** — gates green; `npm run check:tenant-coverage` and `npm run db:check-state` clean.

10. **Anti-drift sweep (T13):**
    - D-1 Scope: well within Track G + Track D budget.
    - D-3 Tenant-guard: clean.
    - D-5 Migration-state: clean.
    - D-6 Planning trail: commits reference Track G / Track D / ADR-002 IMPL — green.
    - D-7 Architecture: no cross-module internal imports.

11. **SESSION_LOG.md** — Outcome / AI-Default decisions / Spine touches (none) / Commits / Recommendations recorded.

This worked example is the *paradigm* for every non-trivial NAS day. A light day (docs-only) activates only Tier-1 + Historian; a heavy day (auth-touching + new public endpoint + Drizzle migration) activates everyone except Judge.

---

## §10 · Anti-fragility

The engine is **anti-fragile**: each drift detected and repaired makes the next epic's plan *more* accurate, not less. RETROs that ratify MPDs are a feature, not a failure.

What is **not** anti-fragile:

- **Silent drift** (not detected) — corrosive; the platform dies from this, not from code defects (`CONSTITUTION.md §6`).
- **Drift detected but not logged** — pretends-not-to-exist; F-11 (lazy generation).
- **Drift logged but never repaired** — becomes background radiation; eventually D-2 cascades.

The Council's job is to convert drift → repair within ≤ 1 week of detection (D-2, D-9), within the day (D-1, D-3, D-5, D-6, D-7), or at the next epic-RETRO (D-4, D-8, D-10).

---

## §11 · The Three Failure Modes of Roadmap Engines

Historical roadmap engines fail in three predictable ways. The Council is structured to resist each:

### §11.1 — Plan-vs-reality blindness

**Symptom:** The blueprint cell says "Phase 1 CMS — ED page-builder shipped"; reality at session-close is "ED M1 shipped, M1.5 partial, M2 unstarted". The Council continues planning Phase 2 assuming all of Phase 1 ED shipped.

**Mitigation:** `D-8 Forecast drift` detector at T1; epic-RETRO §blueprint-diff; Historian's `decision-graph.md` reconciliation; the `MIGRATION_PLAN_*.md` dated file gets a `Supersedes:` entry when partial-completion is discovered.

### §11.2 — Sunk-cost preservation

**Symptom:** Track Z was planned in Phase 1; by Phase 2 it's clear it should be cut; but it's "already 60 % done" so the Council finishes.

**Mitigation:** Economist's cost-curve at every epic-RETRO; Migrator's rewrite-probability at every Migrator Outlook; operator-OK required for `complete sunk` decisions; explicit "we said no to" log under `governance/memory/simplifier_*.md`.

### §11.3 — Roadmap calcification

**Symptom:** The blueprint is so detailed (e.g. every Track pre-decomposed into per-day sub-tasks) that the Council stops thinking and just executes; no evolution; reality diverges silently.

**Mitigation:** The blueprint is **evolutive**, not prescriptive. Every epic-RETRO is *expected* to produce ≥ 1 MPD (zero MPDs in a RETRO is itself a flag — Historian raises it). The pre-decomposed tracks are *forecasts*, not commitments. A track may be deleted, merged, or split at any RETRO.

---

## §12 · Closing directive

This engine exists to **convert intent (the blueprint + ENTITY.md §4/§11 + active MIGRATION_PLAN) into reality (the codebase) without losing coherence across the multi-year life of NAS** (the long-term asset per `ENTITY.md` §11 Philosophy).

It does this by:

- Making the plan **visible** (three views, all reconciled at every T13).
- Making the plan **mutable but disciplined** (epic-RETRO + MPD pipeline; never silent edit).
- Making the plan **observable** (10 named drift detectors, written to memory).
- Making the plan **self-correcting** (every RETRO ratifies amendments through MPD).

If the engine ever feels like overhead, two questions:

1. **Is today's work touching the plan?** If yes, the engine is doing its job. If no, the engine should be invisible — trivial fixes get Tier-1 verdict only per Activation Matrix.
2. **Is the engine paying for itself?** If at any 6-month checkpoint the cumulative drift on D-3 (tenant coverage) is zero and D-1 (scope) trips fewer than 1× / month, yes. If D-3 ever trips in production, the Council itself needs a Tier-5 review.

The engine is **not** the plan. The engine is **the system that keeps the plan honest**.

---

**End of Roadmap Engine.**
The four governance documents are now complete:

| File | Question answered |
|---|---|
| `CONSTITUTION.md` | What are the laws? |
| `ENTITY_SYSTEM.md` | Who applies the laws? |
| `EXECUTION_PROTOCOL.md` | How do they apply the laws daily? |
| `ROADMAP_ENGINE.md` | How does the law-applying system stay aligned with the blueprint, ENTITY.md scope, and active MIGRATION_PLAN? |

Read in order: ENTITY.md → CONSTITUTION → ENTITY_SYSTEM → EXECUTION_PROTOCOL → ROADMAP_ENGINE.
