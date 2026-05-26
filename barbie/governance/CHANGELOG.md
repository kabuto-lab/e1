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

*(future entries below)*
