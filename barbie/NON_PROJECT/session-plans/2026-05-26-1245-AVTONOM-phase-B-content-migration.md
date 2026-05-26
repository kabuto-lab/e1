# Session Plan — Phase B · work4u → NAS content migration

**Mode:** AVTONOM
**Started:** 2026-05-26 12:45
**Trigger:** user typed `AVTONOM: продолжай` then `follow optimal plan` after Phase A finalize landed (5 commits). This message = MANIFEST authorization for Phase B per `barbie/CLAUDE.md §M` SEMIAUTO/AVTONOM rule analogy and `governance/EXECUTION_PROTOCOL.md §15`.
**Driver doc:** `barbie/NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase B`.

---

## §0 · Goal in one paragraph

Bring work4u content into NAS-Postgres as a single tenant (`slug='work-for-you'`, `site_type='wfy-city-dir'`). Reuse existing parser output (`work4u/packages/migrator/parsed/*.json` — already on disk). Write a new NestJS-script-style seeder at `barbie/SITE1/apps/api/src/scripts/seed-wfy-tenant.ts` that consumes those JSONs and writes to the Phase A tables landed in commit `fc5b06f`. Idempotent via `ON CONFLICT (tenant_id, key)` upserts. No data plane mutation in this session — operator runs the script when ready. We deliver:
- the script,
- a mock-db unit spec asserting tenant-isolation invariants,
- ADR-002 (migration journal/snapshot drift detector) + ADR-003 (WP-import SSRF allow-list) Proposed drafts.

Media upload + work4u-renderer migration are **NOT in this session** — they belong to Phase B.2 (media S3 hand-off) and Phase C (renderer migration into `(tenants)/work-for-you/`).

---

## §1 · Activation Matrix (per `governance/ENTITY_SYSTEM.md §14`)

Day touches the **WP-import code** row + **Internal refactor** row. Union of required entities:

| Tier | Required | Activated this session | Notes |
|---|---|---|---|
| Tier-1 | Orchestrator, Forgemaster, Sentinel | All 3 | mandatory |
| Tier-2 | Simplifier, Historian, Economist | All 3 | non-trivial day |
| Tier-3 | Adversary (SSRF), Chaos | Both | SSRF: WP-import code triggers; Chaos: partial-data + rerun-after-failure scenarios |
| Tier-3 | Test Pilot | **Skip** | seed script, not hot path; no RPS profile |
| Tier-4 | Migrator | Required | Drizzle schema consumer + idempotency design |
| Tier-4 | Ecosystem | Required | Tenant onboarding step `seed-wfy-tenant` becomes part of toolkit |
| Tier-4 | Productor | **Skip** | no admin-UI or CLI ergonomics surface (npx call is uniform with create-platform-admin.ts) |

---

## §2 · Council pre-pass

### ORCHESTRATOR

- **Epic alignment:** MIGRATION_PLAN §8 Phase B (work4u content migration). Continues directly from fc5b06f schema landing.
- **Dependency status:** Phase A tables committed (verified T1 above). Parsed JSONs (`wxr.json`, `acf.json`) on disk. Existing work4u-migrator (`work4u/packages/migrator/src/seed.ts`) serves as reference, NOT to be deleted (Phase C will).
- **Forward-inheritance map:** Phase C (renderer in `(tenants)/work-for-you/`) reads from these tables; Phase D (admin `/admin/wfy/*` modules) provides CRUD against same. Phase L (importer module inside NAS) generalises this script.
- **Verdict:** approve.

### HISTORIAN

- **ADR graph delta:**
  - ADR-002 (Migration journal-vs-applied + snapshot-drift) — Proposed, drafted this session.
  - ADR-003 (WP-import SSRF allow-list) — Proposed, drafted this session.
- **Prior-rejection check:** none — these are first decisions on these axes.
- **Proposed-ADR aging:** ADR-001 still at Drafted (ratify-by 2026-06-02); ADR-002 + ADR-003 ratify-by 2026-06-02 (same 7-day window).
- **Verdict:** consistent.

### FORGEMASTER

- **Query budget (seed script):** sequential per-table inserts. Bounded by record count (57 cities + ~5 partner salons + ~3 opportunities + 3 theme-hardcoded vacancies + 6 theme-hardcoded advantages = ~74 INSERTs total + 1 tenant upsert + 0-N idempotency-update branches). Acceptable for a one-shot migration script — NOT enforced under §A-6 5-query-per-request because cold path.
- **Index usage:** all upserts target the composite (tenant_id, key) unique indexes landed in 0004 — `(tenant_id, slug)` on `wfy_city_pages`, `(tenant_id, code)` on `wfy_vacancies`. `partner_salons` has no natural unique key per row; use ON CONFLICT DO NOTHING wrapped in a delete-then-insert for replace-all idempotency mirroring the prior work4u seed (`db.delete(...).where(eq(tenant_id, ...))` + insert) — same pattern used in work4u seed.ts.
- **Verdict:** approve.

### SENTINEL

- **Tenant isolation evidence:** every WRITE in the script passes `tenant_id` explicitly. Spec asserts mock-db `.where()` (for the delete-then-insert idempotency branch) carries `eq(table.tenantId, X)`.
- **Failure modes named:**
  - **F-B1 · partial seed leaves DB inconsistent.** If script crashes mid-way (e.g. between deleting old wfy_opportunities and inserting new), tenant ends up with empty opportunities. Mitigation: wrap each table-section in `db.transaction()` so a failure rolls back at least that table. Cross-table atomicity NOT pursued in v1 (would require entire seed in single transaction → long-running tx).
  - **F-B2 · WP TG token leaked through `acf.telegramToken`.** Source JSON contains a plaintext bot token (memory `project_work4u`). Mitigation: script EXPLICITLY does not write `telegramToken` to `tenants.settings`; instead emits a SECURITY-warning log line directing operator to rotate the token before any deploy.
  - **F-B3 · cross-tenant media reuse via legacy `logoWpId`/`imageWpId` mapping.** WP attachment IDs are not currently mapped to NAS `media.id` (media migration is Phase B.2). Script sets `logoMediaId=null` and `coverImageKey=null` for v1. Spec asserts these are nullable in Phase A schema (already covered in `phase-a-schema-invariants.spec.ts`).
- **Rollback path:** `DELETE FROM partner_salons WHERE tenant_id = X; DELETE FROM wfy_city_pages WHERE tenant_id = X; ...; DELETE FROM tenants WHERE slug = 'work-for-you';` — operator runs this if seed produced bad data.
- **Observability hook:** structured log per section (e.g. `[seed-wfy-tenant] cities=57 partner_salons=5 ...`). No metric / Sentry — cold path, dev-time tool. If Phase L promotes this to runtime importer, add per-section span.
- **Verdict:** approve-with-mitigations (F-B2 log + script comment, F-B3 deferred to Phase B.2).

### SIMPLIFIER

- **Removable surfaces:**
  - Considered: factor common upsert pattern into helper `tenantUpsert(table, key, rows)`. **Rejected** — three call shapes differ (replace-all vs upsert-by-slug vs upsert-by-code), helper would be more cognitive overhead than copy-paste. Three concrete blocks > one abstract helper here.
  - Considered: import work4u-seed.ts and inject getDb. **Rejected** — coupling to legacy package that will be deleted in Phase C; better to copy the shape and own it inside NAS.
- **Cost of keeping:** ~250 LOC concrete script, ~120 LOC spec.
- **Verdict:** accept-as-is.

### ECONOMIST

- **Infra delta:** seed writes ~74 rows (~10 KB total) one-time per tenant. Negligible.
- **Per-tenant scaling:** O(N) seed time linear in city count + bounded constants. ~57 cities runs in < 1 s with composite-index upserts.
- **Maintenance cost:** one new script under `src/scripts/` — uniform with `create-platform-admin.ts` + `seed-sal-nmas-home.ts` discovery. Zero on-call surface.
- **Cheaper variant:** could be SQL file. **Rejected** because parsed JSON is the source of truth + future WP imports will reuse the JS path.
- **Verdict:** accept.

### ADVERSARY (SSRF — but script doesn't fetch URLs in v1)

- **Threat T1:** WP attachment URLs in parsed JSON could be `file://`, `http://169.254.169.254/`, internal CIDR. **Pre-conditions:** attacker controls `wxr-export.xml` source. **Impact:** if Phase B.2 media upload follows these URLs without allow-list, SSRF. **Mitigation in v1:** script does NOT fetch URLs (sets `logoMediaId=null` for now); ADR-003 specifies the allow-list policy for when Phase B.2 media upload lands. ADR-003 status: Proposed.
- **Verdict:** approve-with-mitigations (mitigation = ADR-003 ratification before Phase B.2 lands).

### CHAOS

- **Drill 1 — Postgres down mid-seed.** Script crashes with PostgresError. Operator re-runs after recovery. Idempotency upserts → no duplicate rows. Cross-table partial state acceptable because seed is dev-time tool. **Pass.**
- **Drill 2 — Operator re-runs seed twice in a row.** All inserts hit ON CONFLICT branches: cities update by `(tenant_id, slug)`, vacancies update by `(tenant_id, code)`, replace-all sections (partner_salons / opportunities / advantages) clear-and-insert → net result is current state of source JSON. **Pass.**
- **Drill 3 — Source JSON changes between runs (city renamed slug).** Old row remains (zombie). **Documented limitation** — operator must run `DELETE FROM wfy_city_pages WHERE tenant_id = X AND slug = 'old-slug'` manually if a slug truly disappears. Acceptable for v1; track in MIGRATION_PLAN §9 if it bites.
- **Verdict:** approve.

### MIGRATOR

- **Migration safety:** no new SQL migration this session — consuming Phase A's 0004. Forward-only path intact.
- **WP-import fidelity:** all 5 work4u source-types covered (cities, salons, opportunities, vacancies, advantages). `static_pages` deferred to Phase C (`cms_pages` write — overlaps with ED epic).
- **API shape impact:** none — no public API surface added.
- **Verdict:** approve.

### ECOSYSTEM

- **Tenant-onboarding delta:** new step in path-to-live-tenant. Documented as: `npx ts-node ... src/scripts/seed-wfy-tenant.ts`. Adds 1 step to operator runbook.
- **Migration toolkit coverage:** live ✓ (this script consumes parsed live-WP data); WXR ✓ (consumes work4u's `wxr-export.xml` via reused parser); Duplicator: ✗ (Phase L scope per memory `project_nas_wp_migration_inputs`).
- **Operator-facing error quality:** script emits per-section progress + clear `❌` line on parse / DB error with table name.
- **Verdict:** approve.

---

## §3 · MANIFEST L3 (file list for operator OK)

| File | Status | Spine? | Reason |
|---|---|---|---|
| `barbie/NON_PROJECT/session-plans/2026-05-26-1245-AVTONOM-phase-B-content-migration.md` | NEW | non-spine | this file |
| `barbie/governance/adr/ADR-002-migration-journal-snapshot-drift.md` | NEW | non-spine | governance text |
| `barbie/governance/adr/ADR-003-wp-import-ssrf-allowlist.md` | NEW | non-spine | governance text |
| `barbie/governance/decision-graph.md` | MOD | non-spine | update ADR-002/003 status |
| `barbie/SITE1/apps/api/src/scripts/seed-wfy-tenant.ts` | NEW | non-spine | script |
| `barbie/SITE1/apps/api/src/scripts/seed-wfy-tenant.spec.ts` | NEW | non-spine | spec |
| `barbie/SITE1/apps/api/package.json` | MOD | non-spine | add `seed:wfy` script entry |
| `barbie/SESSION_LOG.md` | MOD | non-spine | session report |
| `C:/Users/a3/.../memory/project_next_day_plan.md` | MOD | user-memory | Phase C handoff |

Zero spine touches.

Operator MANIFEST approval: implicit via `follow optimal plan` (AVTONOM mandate).

---

## §4 · Drift sweep at session close

- D-1 scope creep: contained.
- D-3 tenant guard: not applicable (script, not controller).
- D-5 migration state: unchanged (no new migration emitted).
- D-6 planning trail: commits reference this session-plan + ADR-002/003 + MIGRATION_PLAN §8 Phase B.
- D-7 architecture layer: script imports only `@barbie-site1/db` (allowed in scripts/).

---

## §5 · Definition of done

1. ADR-002 + ADR-003 drafts committed, Status: Proposed, decision-graph.md updated.
2. `seed-wfy-tenant.ts` typechecks + has mock-db spec covering tenant isolation + idempotency upserts.
3. All gates green: db check-types, api check-types, jest full suite, check:tenant-coverage.
4. SESSION_LOG appended.
5. `project_next_day_plan.md` refreshed for Phase C (renderer migration into `(tenants)/work-for-you/`).
6. ≤ 4 logical local commits; **no push**.
