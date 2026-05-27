# ADR-002 — Migration Journal vs Applied State + Snapshot Drift Detector

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Decision date** | 2026-05-26 |
| **Proposed by** | MIGRATOR (Council Phase B pre-pass) |
| **Drives** | `governance/CONSTITUTION.md §6 D-5` (migration state drift) |
| **Consulted** | `barbie/ENTITY.md §1` (Drizzle stack) · ADR-001 (detector pattern reuse) |
| **Supersedes** | none |

---

## Context

Phase A surfaced a concrete instance of D-5 (migration state drift): `drizzle-kit generate` emitted catch-up SQL for two hand-written migrations (`0002_chat`, `0003_tenant_bootstrap`) because their effects on the live DB were not reflected in Drizzle's `meta/000N_snapshot.json`. The fix was hand-editing the generated `0004_*.sql` to keep only Phase A scope and trusting the operator to run `db:migrate` linearly. This worked **once**. It does not scale.

Two drift surfaces exist:

1. **Journal vs applied** — `meta/_journal.json` lists migration tags, but PostgreSQL is the authority on which ones actually ran (`drizzle._migrations` table). When the two disagree, the next `drizzle-kit generate` may re-emit applied DDL, or the next `db:migrate` may skip an unapplied tag silently.

2. **Snapshot vs schema** — `meta/000N_snapshot.json` is a frozen view of `src/schema/*.ts` at the time the migration was generated. Hand-written migrations (or hand-edits after generation) make snapshot N out-of-date for the actual DB state. Every subsequent generate compares current schema against `snapshot N` and emits a diff — but if N is stale, that diff includes already-applied changes.

NAS will hit this surface again as Phase B/C/D land more migrations.

---

## Decision

Introduce `npm run db:check-state` script in `barbie/SITE1/packages/db/` that performs two assertions:

### A — Journal coherence (cheap, runs locally w/o DB)

For every directory entry matching `drizzle/0NNN_*.sql`:
- Assert there is exactly one matching entry in `meta/_journal.json` (`idx N` + `tag` matches filename stem after the `_`).
- Assert `meta/000N_snapshot.json` exists.

For every entry in `meta/_journal.json`:
- Assert corresponding `.sql` + snapshot exist.

Fails → name the orphan file + suggestion (`add to _journal.json` or `delete file`).

### B — Live state drift (requires DB connection, gated by `--with-db` flag)

When `--with-db` is passed and `DATABASE_URL` is set:
- Query `drizzle._migrations` (Drizzle's bookkeeping table).
- Compare to `meta/_journal.json` entries: every journal `tag` should appear in `_migrations` (or be one of the pending-not-yet-applied tail entries).
- Compare against `pg_class` / `pg_attribute` for the LAST migration's snapshot: every table + column in `snapshot N` should exist in DB; tables/columns NOT in snapshot N but in DB are drift candidates.

Heuristic — drift on snapshot N → emits a `D-5 trip` and recommends one of:
- regenerate snapshot only (manual hand-edit `meta/000N_snapshot.json`),
- create migration `000(N+1)_realign_snapshot.sql` that documents the divergence,
- accept divergence with a `// drizzle-state-drift: accepted - reason: <…>` comment in the schema file (similar to ADR-001 allow-list).

Failure surfaces are listed for operator review. Script exit code:
- 0 — coherent
- 1 — journal incoherent (cheap check failed)
- 2 — DB drift detected
- 3 — both

### CI / pre-commit integration

- Cheap check (A): wired into `npm run check-types -w @barbie-site1/db` chain (no DB needed, runs in CI).
- DB drift check (B): manual operator step (`npm run db:check-state -- --with-db`) before generating a new migration. Documented in `barbie/ENTITY.md §6 VPS workflow` as a pre-PR ritual.

---

## Consequences

### Positive

- **D-5 drift becomes detectable before the next `drizzle-kit generate`.** No more surprise catch-up SQL.
- **Foundation for migration RETRO.** Migrator entity has a concrete artifact to point at when reviewing per-epic migration history.
- **Cheap check is free** — runs in CI on every push, near-zero cost.

### Negative

- **DB drift check is operator-discipline-bound** — runs only when invoked. F-10 reminder pings operator at 7-day Proposed-aging window if not adopted.
- **Snapshot regeneration story is still manual** — script identifies drift; it does NOT auto-heal (intentional, per I-7 forward-only).
- **One new file** in `packages/db/` (`scripts/check-state.ts` or similar). Build-time cost negligible.

### Failure modes (SENTINEL section per A-5)

- **F-D1 · Snapshot accepted with stale comment but actual drift persists.** Mitigation: ratification of `accepted` divergence requires Sentinel cosign on the schema-file comment that opens it.
- **F-D2 · Drizzle bookkeeping table renamed (Drizzle major version).** Mitigation: pin Drizzle major version in `package.json`; tag this ADR for re-review on Drizzle major bump.

---

## Considered options

### Option A — Picked: dual-mode check script

Best balance of CI-friendly cheap path + opt-in operator path.

### Option B — Drizzle's own `drizzle-kit introspect`

Rejected: produces a `schema.ts` from live DB; useful as a one-shot bootstrap, not a daily fitness function. Doesn't compare against the in-repo schema with intent.

### Option C — Pre-commit hook that runs `--with-db` always

Rejected: requires every dev to have a local Postgres up; barrier to small-touch commits.

---

## Implementation plan

| Slot | Work | Owner | Estimate | State |
|---|---|---|---|---|
| IMPL-A | `packages/db/check-state.mjs` (mode A — journal coherence) | Migrator | 0.25 d | **SHIPPED 2026-05-27** (`feat(barbie/SITE1/db): ADR-002 IMPL-A/B/D — db:check-state Mode A`). Path deviation from ADR text (`scripts/check-state.ts` → root `check-state.mjs`) per AID-G3: matches existing `run-migrate.mjs` convention; ESM .mjs eliminates ts-node + new jest deps for `packages/db`. |
| IMPL-B | Spec at `packages/db/check-state.spec.mjs` | Sentinel | 0.25 d | **SHIPPED 2026-05-27**. 14 tests via `node --test` (Node 22 built-in; zero new deps). Covers A1..A4 + multi-failure accumulation + I/O wrapper roundtrip + sanity assertion against live `packages/db/` shape. |
| IMPL-C | Mode B (`--with-db`) — query `drizzle._migrations` + compare snapshot to `pg_class` | Migrator | 0.5 d | **Deferred to Phase L** per ADR original scope. F-10 not re-armed: IMPL-A/B/D close the ratify-by-2026-06-02 window. |
| IMPL-D | Wire mode A into `packages/db`'s lint chain; document mode B in ENTITY.md §6 | Migrator + Historian | trivial | **SHIPPED 2026-05-27**. `lint` chains `tsc --noEmit && node ./check-state.mjs`; `db:check-state` exposed as standalone script; `test` script wired (`node --test ./check-state.spec.mjs`). Hand-written allow-list lives at `packages/db/hand-written-migrations.json`. ENTITY.md §6 update deferred — touches spine in AVTONOM (logged as SKIP in SESSION_LOG); operator can land manually. |

Total ~1 day. Ratify-by 2026-06-02 (7-day Proposed window per F-10) — **CLOSED 2026-05-27 with IMPL-A/B/D shipped**.

---

## Forward-inheritance

- **Phase B** (work4u content migration) — no migration this session, so this ADR's IMPL not yet load-bearing.
- **Phase C** (renderer migration) — may add `0005_*` if WfyHomeShell needs additional columns. ADR's IMPL-A should land before any new generate.
- **Phase L** (importer module) — bigger migration cadence; ADR's IMPL-C becomes load-bearing here.

---

**End of ADR-002.**
