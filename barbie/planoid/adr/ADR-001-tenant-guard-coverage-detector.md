# ADR-001 — Tenant-Guard Coverage Detector

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Decision date** | 2026-05-26 |
| **Proposed by** | SENTINEL + FORGEMASTER (Council Adoption Pass) |
| **Drives** | `governance/CONSTITUTION.md §6 D-3` (tenant-guard coverage drift) |
| **Consulted** | `barbie/ENTITY.md §2.2, §9, §11`; existing `apps/api/src/tenant-context/` |
| **Supersedes** | none |

---

## Context

NAS is multi-tenant-first (`barbie/ENTITY.md §2.2`). Cross-tenant leakage is treated as **existential failure** — `governance/CONSTITUTION.md §3 rung 1 (Correctness)`. The current code uses a four-layer defence (`apps/api/src/tenant-context/tenant.guard.ts` header):

| Layer | Mechanism | Status |
|---|---|---|
| L1 | `TenantGuard` (`tenant.guard.ts`) — checks ALS context, tenant status, ownership match between `req.user.tenantId` and resolved `ctx.tenantId` | Wired |
| L2 | `withTenant()` helper in repositories — tenant-aware WHERE clause | Wired (partial — sampled in `salons.service.ts`, `services.service.ts`, etc.) |
| L3 | `NOT NULL tenant_id` constraint in Drizzle schema | Wired in every tenant-scoped table |
| L4 | Audit log of cross-tenant attempts (currently `Logger.warn`, Phase-1 target: `audit_log_platform`) | Partial — logged, not persisted |

The opt-out is `@SkipTenant()` (class- or method-level decorator) — legitimate uses: `/auth/login`, `/platform/*`, `/health`, public bootstrap endpoints.

**Gap.** A new route can be merged that:
- Lacks `TenantGuard` in `@UseGuards(...)` **and** lacks `@SkipTenant()`. The route then runs with no tenant resolution — defaults vary by handler implementation.
- Has `TenantGuard` but the underlying repository call omits `withTenant()` — L1 passes, L2 silently leaks.

Drift class **D-3** names this; detector specification is this ADR.

The `MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` Phase A adds 6 new tenant-scoped tables (`partner_salons`, `wfy_city_pages`, `wfy_opportunities`, `wfy_vacancies`, `wfy_advantages`, `lead_applications`). Each will get a controller in Phase D — D-3 must have an automated detector before Phase B accepts production data into these tables. Council Activation Matrix `ENTITY_SYSTEM.md §14` row "New domain module" requires Migrator + Sentinel cosign — the detector is the deliverable that backs that cosign.

---

## Decision

Introduce **`cargo xtask`-equivalent script** `npm run check:tenant-coverage` in `barbie/SITE1/` that statically enforces L1 + L2 coverage. It runs as part of `npm run lint` (CI gate when CI is wired; pre-commit hook target meanwhile) and on demand in the EXECUTION_PROTOCOL T13 sweep.

### What the detector does (L1 — guard coverage)

For every TypeScript file under `apps/api/src/**/*.controller.ts`:

1. Parse the file (`ts-morph` or `typescript` compiler API — pick whichever is already in `node_modules`; introduce one new dep only if neither is).
2. Find every method decorated with an HTTP verb (`@Get/@Post/@Put/@Patch/@Delete`).
3. For each method, determine its effective `@UseGuards(...)` set by walking class- and method-level decorators.
4. **Pass** if either:
   - `TenantGuard` is in the effective guard set, OR
   - `@SkipTenant()` is set at class or method level, OR
   - The class itself is decorated with `@SkipTenant()`.
5. **Fail** otherwise — print `<file>:<line> <ClassName>.<method> — missing TenantGuard or @SkipTenant()`.

### What the detector does (L2 — repository WHERE coverage)

Phase 2 of detector (deferred to ADR-001B after stable L1 runs ~2 weeks):

For every service method that calls `db.select()` / `db.update()` / `db.delete()` against a tenant-scoped table:

1. Parse the chain expression.
2. **Pass** if either:
   - The chain includes `.where(...)` that references `tenantId` or `tenants.id`, OR
   - The service uses the `withTenant()` helper, OR
   - The method is in a file declared `// @tenant-coverage: skip — reason: <…>` (top of file).
3. **Fail** otherwise — print `<file>:<line> raw Drizzle query against <table> without tenant scope`.

L2 detection is heuristic (AST-level can't prove tenant safety in all flows); false positives are tolerated and resolved via the `// @tenant-coverage: skip` annotation with reason. False negatives are the real risk — minimised by enumerating tenant-scoped tables in a single TS const and requiring detector to handle every aliased import path.

### CI / pre-commit integration

- `npm run check:tenant-coverage` — exits 1 on any L1 fail; exits 1 on any L2 fail in Phase 2.
- Wired into `npm run lint` (parent task) so `npm run lint` itself remains the single quality gate everyone runs.
- Pre-commit hook (`.husky/pre-commit` if husky used, else `scripts/pre-commit.sh`) — calls `npm run check:tenant-coverage` only on changed `*.controller.ts` (fast path).

### Allow-list

A small allow-list at `barbie/SITE1/apps/api/src/tenant-context/coverage.allow.json`:

```json
{
  "skipTenantClasses": [
    "AuthController",
    "HealthController",
    "ToolsController"
  ],
  "skipTenantMethods": [
    "PublicTenantsController.bootstrap",
    "PublicMenuController.getPublishedMenu"
  ],
  "rawQueryAllow": [
    "AuthService.findUserByEmail — pre-tenant resolution",
    "PlatformAdminsService.* — cross-tenant by design"
  ]
}
```

Entries require a reason field in extended form (TBD in implementation). Updating the allow-list is a Sentinel-cosigned commit (`Council: SENTINEL approves coverage allow-list addition <ClassName>.<method> — reason: <…>`).

---

## Consequences

### Positive

- **D-3 drift detector becomes automated.** Manual grep in T13 sweep is replaced by deterministic gate.
- **Phase B–F (new controllers landing) cannot regress L1.** Any new route lacking `TenantGuard` blocks `npm run lint` exit code.
- **Allow-list creates explicit, reviewable scope of cross-tenant code.** Currently this is implicit in `@SkipTenant()` usage; the allow-list aggregates it for audit.
- **Foundation for L4** (Phase-1 audit log) — detector confirms the population of tenant guards from which audit hooks fire.

### Negative

- **One new check in the lint loop.** Cost: ~2-5 s for full-repo scan on cold cache; sub-second incremental on changed files. Acceptable per `governance/CONSTITUTION.md §10`.
- **Allow-list maintenance.** Every legitimate `@SkipTenant()` or raw-tenant-cross-cutting query must be enumerated. Initial pass enumerates current state (estimated 5-8 entries from controllers grepped during read-before-trust).
- **Phase 2 L2 detector is heuristic.** False positives slow the gate down until tuned. Recommended to ship L1 first, observe noise, then iterate L2.
- **One new dependency MAY be required** (`ts-morph` ~3 MB). FORGEMASTER review per `barbie/ENTITY.md §11 Dependency policy`. Alternative: hand-roll AST walker using the existing `typescript` compiler dep already in workspace.

### Failure modes (SENTINEL section per A-5)

- **F-A1 · Detector itself broken.** Detector reports false negative (pass when route is unguarded). Mitigation: VAL test that intentionally adds a missing-guard fixture controller and asserts detector fails.
- **F-A2 · Allow-list drift.** Allow-list grows silently. Mitigation: every allow-list line includes `addedBy: <git-sha>` and `reviewedAt: <date>`; T13 sweep checks for entries older than 6 months without review.
- **F-A3 · Decorator alias / re-export bypass.** Someone imports `TenantGuard as TG` then uses `@UseGuards(TG)`. Detector follows TS resolution; bench test fixture covers aliases.
- **F-A4 · L2 raw SQL escape.** Service uses `db.execute(sql\`SELECT * FROM partner_salons WHERE id = ${id}\`)` — bypasses `withTenant()` and L2 detector. Mitigation: ban `db.execute()` in tenant-scoped service files via separate `eslint` rule, OR allow-list each occurrence with explicit Sentinel cosign.

---

## Considered options

### Option A — Runtime enforcement (rejected)

Wrap Drizzle query builder so any `.from(tenantScopedTable).select()` without preceding `.where(tenantId=...)` throws at runtime.

**Rejected because:** Drizzle's query builder is structural typing-friendly; runtime hooks add per-query overhead and don't catch the case where developer manually adds a wrong `tenantId` value (e.g. from URL param). Static analysis catches more at lower cost.

### Option B — Drizzle RLS migration (deferred, Year-2 candidate)

Move L3 from `NOT NULL tenant_id` to PostgreSQL Row-Level Security policies with `current_setting('app.tenant_id')`.

**Deferred because:** introduces PgBouncer transaction-mode contract (per AX•CMS Immutable I-4), per-query `SET LOCAL` cost, and migration complexity for ~22 existing tables. The four-layer defence without RLS already passes Correctness rung; RLS adds belt-and-suspenders. Open as RFC after Phase L (importer).

### Option C — Decorator with mandatory tenant scope on every controller (rejected)

Force every controller to declare `@TenantScope('strict' | 'platform-only' | 'public')` — fail compile if missing.

**Rejected because:** TS doesn't fail compile on missing decorators; this collapses to runtime which is option A. Also redundant with `@SkipTenant()` + default-on `TenantGuard`.

### Option D — Picked: static AST detector + allow-list (this ADR)

Best balance of zero runtime cost, deterministic enforcement, low maintenance overhead.

---

## Implementation plan

| Slot | Work | Owner role | Estimate |
|---|---|---|---|
| IMPL-A | L1 detector script `apps/api/scripts/check-tenant-coverage.ts` + `package.json` script entry | FORGEMASTER | 0.5 day |
| IMPL-B | Fixture controller in `apps/api/test/fixtures/` proving detector catches missing guard (regression test) | SENTINEL | 0.25 day |
| IMPL-C | Initial allow-list `coverage.allow.json` populated by walking current 18 controllers | SENTINEL + ORCHESTRATOR | 0.25 day |
| IMPL-D | Wire into `npm run lint` (parent task) | FORGEMASTER | trivial |
| IMPL-E | (deferred to ADR-001B) L2 raw-query detector | FORGEMASTER | 1 day |

Total for IMPL-A..D: ~1 day. Land in same session as Phase A schema (Council Activation Matrix says "new domain module" needs Sentinel + Migrator cosign — this ADR's IMPL is one of the deliverables that ratifies that cosign).

---

## Forward-inheritance

- **Phase B** (work4u content migration) — runs the detector against the not-yet-created `partner_salons` / `wfy_*` controllers (Phase D adds them). Detector must be installed before Phase D lands the controllers.
- **Phase D** (admin pages `/admin/wfy/*`) — every new controller must pass the detector. PR cannot merge without green `npm run check:tenant-coverage`.
- **Phase F** (12-15 ED blocks, including data-blocks reading from tenant tables) — detector covers Data-block controller endpoints.
- **Phase L** (importer) — detector covers WP-import controllers (which receive untrusted URLs; combine with Adversary's ADR-003 SSRF allow-list policy).

---

**End of ADR-001.**
