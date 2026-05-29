# Governance — CHANGELOG

> Append-only log of amendments to `governance/` files. Driven by Motions (`governance/motions/MOT-NNN-*.md`).
> Format: every entry has a date, a list of files changed, the driving Motion (if any), and a one-line rationale.

---

## 2026-05-26 — Governance v1.0 · Adoption Pass

**Trailer:** `Governance-Adoption: v1.0`

Initial creation of `barbie/governance/`. Approach adapted from AX•CMS Council of 14 Minds (`barbie/AX/NaSV2/docs/governance/`, ratified 2026-05-26) and re-grounded to the NestJS + Next.js + Drizzle + PostgreSQL + MinIO + Redis stack used by `barbie/SITE1/` (canonical NAS).

**Files created:**
- `governance/README.md` — entry, reading order, scope, quickstart
- `governance/CONSTITUTION.md` — 13 sections: hierarchy / Council / Tension Doctrine / Ladder / 14 Immutables / 14 Forbiddens / 10 Anti-Drift / Judge / Quorum / A-tests / measurable constraints / amendment / operator sovereignty / end-directive
- `governance/ENTITY_SYSTEM.md` — 14 minds with NAS-stack output shapes; §14 Activation Matrix gating Council passes by task class
- `governance/EXECUTION_PROTOCOL.md` — 20 sections: T0–T13 phases / mode integration / conflict examples / recovery / session output contract
- `governance/decision-graph.md` — bootstrap index + 7 anticipated ADRs (tenant-guard detector, migration journal check, SSRF allow-list, chat last-admin invariant, forward-only enforcement, dashboard-2077 palette compliance, session-log schema)
- `governance/CHANGELOG.md` — this file

**Adaptation deltas vs AX•CMS governance:**
- Stack: Rust/Tokio/Leptos → TypeScript/NestJS/Next.js/Drizzle
- Multi-tenancy: PG RLS + PgBouncer transaction-mode → `tenant_id` filter + tenant guard (defence-in-depth)
- Priority Ladder: Performance #5 in AX (with hot-path collapse) → Maintainability #3 in NAS, Performance #5 throughout (NAS is long-term asset, not hyperscale CMS)
- Anti-Drift D-3: `xtask capability-coverage` → tenant-guard coverage drift (grep-based today, `npm run check:tenant-coverage` future)
- Anti-Drift D-5: `pool_mode = transaction` → migration-state drift (Drizzle journal vs applied)
- Roadmap engine: 240-cell 12-month plan → epic engine (`apps/web/public/platform-blueprint.html` План→Статус + active session-plans)
- Daily cadence: every session in AX → activation matrix gates per task class for NAS (trivial fix = Tier-1 verdict only)
- Format: HTML cover + 7 separate files in AX → markdown-only here; HTML cover available on request
- Two-layer prompt: `architect.md` + `senior-dev.md` → existing `NON_PROJECT/session-plans/YYYY-MM-DD-HHMM-AVTONOM-*.md` + `SESSION_LOG.md` (already in practice)

**Pending operator action:**
- Spine-touch on `barbie/ENTITY.md` to add §12 "Governance — Совет умов" with one-line reference to `governance/README.md`. Patch drafted; awaiting explicit operator OK per Immutable I-13.

---

## 2026-05-27 — Governance v1.1 · ROADMAP_ENGINE port

**Trailer:** `Governance-Adoption: v1.1`

Ported the fourth governance document from AX•CMS RustPress (`barbie/AX/RustPress/docs/governance/ROADMAP_ENGINE.md`) into the NAS Council, fully adapted to the NestJS + Next.js + Drizzle stack and to NAS's actual roadmap artifacts. RustPress's 240-cell daily-plan engine became NAS's epic-close engine.

**Files created:**
- `governance/ROADMAP_ENGINE.md` — 12 sections: three views (PLANNED/EXECUTING/EXECUTED) · inputs · drafting pipeline · execution pipeline · evolution pipeline (RETRO → MPD → blueprint amendment) · D-1..D-10 formal NAS definitions · re-planning triggers · plan versioning · linkage map · worked example (2026-05-27 Track G + D AVTONOM session) · anti-fragility · three failure modes · closing directive
- `governance/master-plan-diffs/.gitkeep` — directory for future MPD-NNN-<slug>.md (created empty per v1.0 pattern)

**Files updated:**
- `governance/README.md` — added ROADMAP_ENGINE.md to §Порядок чтения (now 7 items) and §Структура папки; expanded Plan-engine row in §Что меняется по сравнению с AX•CMS
- `governance/CONSTITUTION.md` §0 — inserted ROADMAP_ENGINE.md at hierarchy rung 6 (between EXECUTION_PROTOCOL.md and ES CLAUDE.md)

**Adaptation deltas (RustPress → NAS):**
- **Three views' PLANNED:** `WP-PLAN-12-MONTH.html` (240 daily cells) → `platform-blueprint.html` План→Статус + `ENTITY.md` §4/§11 + dated `NON_PROJECT/MIGRATION_PLAN_*.md` (multi-phase initiatives with `Supersedes:` discipline)
- **Cadence:** monthly RETRO (calendar) → epic-close RETRO (event-driven; if epic > 14 days, early-RETRO motion to operator)
- **Session-plan format:** two-document split (`architect.md` + `senior-dev.md`) → one consolidated AVTONOM session-plan with §Council Review + §Council Engineering Pass per `ENTITY_SYSTEM.md §16` (already in practice — see CHANGELOG v1.0 adaptation note)
- **Drift detector D-3:** `cargo xtask capability-coverage` → `npm run check:tenant-coverage` (ADR-001 IMPL-A/B/D shipped via commit `aa5f968`)
- **Drift detector D-5:** PgBouncer `pool_mode = transaction` check → Drizzle journal-vs-applied check `npm run db:check-state` (ADR-002 IMPL-A/B/D shipped 2026-05-27 via commit `90fd98f`)
- **Drift detector D-6:** `cargo xtask check-planning-refs` → grep today, future `npm run check:planning-refs`
- **Drift detector D-7:** `cargo xtask architecture-check` → grep today, future `eslint-plugin-import` `no-restricted-paths` rule
- **Re-planning triggers:** dropped RustPress hard-perf trips (`pool_mode`, 15 % bench regression on `§7 hard target`) — replaced with NAS-relevant: tenant-coverage regression (existential), Lighthouse drop > 10 on hot public route, blueprint cell contradicting code > 7 days
- **Versioning:** `WP-PLAN-12-MONTH.html v1.N` → `blueprint v1.N` HTML comment + `MIGRATION_PLAN_<initiative>_<date>.md` dated supersede convention
- **Worked example:** RustPress 2026-07-20 M3 W1 D1 docs-only paradigm → NAS 2026-05-27 Track G governance + Track D site-type capability matrix + WFY cities CRUD + ADR-002 IMPL-A/B/D real session trace

**Files skipped (intentionally — see operator decision in this session):**
- `COUNCIL-GUIDE.html` (RustPress) — README.md plays the introductory role for NAS; existing `COUNCIL-COMPARISON.html` is NAS-specific (pre-Council vs Council visual) and complementary
- `MISSION-V2-COMMERCE-CRM.md` (RustPress) — `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` plays the mission-expansion role for NAS; `ENTITY.md` §0 + §11 fix scope; no separate mission document needed

**Pending operator action:**
- None required. ROADMAP_ENGINE.md is non-spine; no spine-touch on `barbie/ENTITY.md` was needed for this port.

---

*(future entries below)*
