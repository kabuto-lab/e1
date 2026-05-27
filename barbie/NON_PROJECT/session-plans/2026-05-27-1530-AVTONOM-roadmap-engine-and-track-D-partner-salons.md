# 2026-05-27 15:30 · AVTONOM session-plan · ROADMAP_ENGINE port + Track D.2 partner-salons

> **Status:** ratified · executed
> **Mode trajectory:** MANUAL → AVTONOM (switched при commit phase D.2)
> **Activation matrix:** Tier-1 + Tier-2 + Adversary + TestPilot + Migrator + Productor
> **Spine touches:** none

## §1 · Mission

Два логически независимых блока в одной сессии:

**Block A — Governance v1.1 · ROADMAP_ENGINE port** (Track G продолжение)
Портировать `barbie/AX/RustPress/docs/governance/ROADMAP_ENGINE.md` под NAS-стек и реальные NAS-артефакты (blueprint.html + ENTITY.md §4/§11 + dated MIGRATION_PLAN_*.md). Создать `governance/master-plan-diffs/` infrastructure для будущих MPD. Обновить README + CONSTITUTION §0 + CHANGELOG.

**Block B — Track D step 3.2 · wfy-admin partner-salons CRUD**
Реплицировать cities pattern (Track D step 3.1 — 2026-05-27 13:25 session) для `partner_salons` aggregate. Включает inline LogoPicker (Productor-clean media picker вместо UUID input).

## §2 · Entering state

- ROADMAP_ENGINE port: 3 файла governance/ (CONSTITUTION/ENTITY_SYSTEM/EXECUTION_PROTOCOL) уже v1.0; нужен ROADMAP_ENGINE.md + master-plan-diffs/ infrastructure
- Track D.2: `partner_salons` schema существует с Phase A (`packages/db/src/schema/partner-salons.ts`); cities pattern ratified (`05abd6b` + `23f2390`); media API `/v1/media` shipped с upload + list + get + archive

## §3 · Council Review

### ORCHESTRATOR
Epic alignment: Block A — Track G governance continuation; Block B — Track D continuation (cities pattern replication). Forward-inheritance: ROADMAP_ENGINE consumed at next epic-RETRO; D.2 consumed by D.3/D.4/D.5 (rule-of-three trigger для extract `requireWfyTenant` + `assertMediaBelongsToTenant`).

### HISTORIAN TRACE
- governance v1.1 entry в CHANGELOG.md.
- Decision-graph не меняется (D.2 — replication, не новый ADR).
- ADR-004..007 (Proposed с 2026-05-26) — за пределами scope, ratify-by 2026-06-02 окно открыто.

### MIGRATOR OUTLOOK
- D.2 — no new migration (`partner_salons` уже есть с Phase A); forward-only invariant соблюдён.
- ROADMAP_ENGINE — no schema/code changes; docs-only.

### PRODUCTOR NOTES
- D.2 PRODUCTOR-критичная развилка: LogoPicker. Operator выбрал «inline picker» (≤ 3 click target preserved; UUID не exposed).
- ROADMAP_ENGINE Plan-engine row в README обновлён (epic-close cadence vs calendar monthly).

## §4 · Council Engineering Pass

### FORGEMASTER MEMO
- D.2 query budget: 2-3 queries/req (tenant lookup + main op + optional media assert). All under 5-budget.
- Index usage: `partner_salons_tenant_ord_idx (tenant_id, ord)` for ORDER BY; PK for get/update/delete.
- RSC/Client: page is full client component, ~6-7KB gzip bundle delta.

### SENTINEL RISK AUDIT
- 4 layers of tenant isolation (TenantGuard + combineTenant + composite index + assertMediaBelongsToTenant).
- 3 named failure modes: cross-tenant media leak, capability bypass, URL XSS — all defended at DTO/service.
- `MEDIA_NOT_FOUND` unified shape — не leak'аем существование чужих media.

### SIMPLIFIER COUNTERPROPOSAL
- `requireWfyTenant`, `assertMediaBelongsToTenant`, `LogoPicker` — все inline single-callsite per rule-of-three.
- Extract при D.3 ratification (третья occurrence).

### ECONOMIST LEDGER
- Δ infra ₽/month: 0.
- Per-tenant scaling: O(N partners per tenant), realistic < 100.
- Maintenance: +1 admin route, +1 controller, +1 service in surface; no new runbook.

### ADVERSARY STRESS (auto-on for new public endpoint)
- T1 Cross-tenant media leak via crafted logoMediaId — mitigated + spec'd.
- T2 XSS via externalLink — mitigated by IsUrl({require_protocol:true, protocols:['http','https']}); spec test deferred (Productor-debt).
- T3 SQLi via ILIKE q — Drizzle parameterizes; no extra code.
- T4 DoS via large limit — capped at 500 in DTO; global @Throttle status not verified (Productor-debt).

### TEST PILOT PROFILE
- Synthetic baseline: admin endpoint ~10 req/min; p95 estimated < 50ms cold path; not benched (deferred).

## §5 · Tracks executed

### Track G v1.1 — Governance ROADMAP_ENGINE port (1 commit)

| Step | Files | Status |
|---|---|---|
| Port ROADMAP_ENGINE.md from RustPress, adapt all 12 sections to NAS | governance/ROADMAP_ENGINE.md (new) | ✓ |
| Create master-plan-diffs/ infrastructure | governance/master-plan-diffs/.gitkeep (new) | ✓ |
| Update README.md (reading order 7 items + structure + Plan-engine row) | governance/README.md (M) | ✓ |
| Update CONSTITUTION.md §0 (Authority Hierarchy 9 items) | governance/CONSTITUTION.md (M) | ✓ |
| CHANGELOG.md v1.1 entry with full adaptation deltas + skipped-with-reason for COUNCIL-GUIDE.html and MISSION-V2 | governance/CHANGELOG.md (M) | ✓ |

### Track D step 3.2 — wfy-admin partner-salons CRUD (2 commits)

| Step | Files | Status |
|---|---|---|
| 4 DTOs mirroring cities pattern (no slug/status/extras; +logoMediaId UUID) | dto/{create,update,list-query,response}-wfy-partner-salon.dto.ts (new) | ✓ |
| Service с requireWfyTenant + inline assertMediaBelongsToTenant | wfy-partner-salons.service.ts (new) | ✓ |
| Spec with 18 cases (3 capability + 7 isolation + 4 create + 6 update edge cases) | wfy-partner-salons.service.spec.ts (new) | ✓ |
| Controller mirror cities (tenant-admin role, ParseUUIDPipe) | wfy-partner-salons.controller.ts (new) | ✓ |
| Register in TenantsModule (non-spine) | tenants.module.ts (M) | ✓ |
| Typed client mirroring wfy-cities-api | apps/web/src/lib/wfy-partner-salons-api.ts (new) | ✓ |
| Admin page with inline LogoPicker (~80 LOC subcomponent) | apps/web/src/app/admin/wfy/partner-salons/page.tsx (new) | ✓ |

## §6 · Gates

- `cd SITE1/apps/api && npm run check-types`: clean
- `cd SITE1/apps/api && npx jest`: **249/249 passing** in 16 suites (+18 new partner-salons cases vs prior session)
- `cd SITE1/apps/api && npm run check:tenant-coverage`: 19 controllers · 0 failures (`wfy-partner-salons.controller.ts` ✓)
- `cd SITE1/apps/web && npx tsc --noEmit`: clean

## §7 · Anti-drift sweep (T13)

- **D-1 Scope:** ~1130 LOC across 9 new files + 4 modified = within Track D.2 + ROADMAP_ENGINE budget
- **D-3 Tenant-guard coverage:** clean — new controller verified by ADR-001 detector
- **D-5 Migration state:** no migrations touched; partner_salons table from Phase A
- **D-6 Planning trail:** commits reference Track G v1.1 / Track D step 3.2 — verified
- **D-7 Architecture-layer:** no cross-module internal imports; LogoPicker inline; media types inline in page.tsx

## §8 · Productor-debt log (carry-forward)

- URL whitelist spec test for `externalLink` IsUrl validator (Adversary T2)
- Global `@Throttle` audit (Adversary T4)
- `/admin/media` page — referenced in LogoPicker fallback as "Phase F"
- Extract `requireWfyTenant` + `assertMediaBelongsToTenant` to shared helpers on D.3 ratification

## §9 · Commits

| SHA | Subject |
|---|---|
| `6b16ec0` | docs(barbie/governance): v1.1 — port ROADMAP_ENGINE.md from RustPress under NAS stack |
| `7a597b7` | feat(barbie/SITE1/api): wfy-admin partner-salons CRUD (Track D step 3.2) |
| `f65de35` | feat(barbie/SITE1/web): /admin/wfy/partner-salons CRUD page + inline LogoPicker (Track D step 3.2) |
| _(this session-plan + SESSION_LOG commit pending)_ | docs(barbie): SESSION_LOG — AVTONOM ROADMAP_ENGINE + Track D.2 2026-05-27 |

All commits with trailer `AI-Assisted: Claude Code`. **No `git push`** (AVTONOM rule).
