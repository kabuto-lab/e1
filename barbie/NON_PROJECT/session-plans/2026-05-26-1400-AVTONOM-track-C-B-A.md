# Session-Plan · 2026-05-26 14:00 · AVTONOM · Tracks C → B → A

> **Authoritative.** Governs the AVTONOM session triggered by operator message `AVTONOM: Track C → B → A` at 2026-05-26 ~14:00 local.
>
> Read order at session-open (T0): per `governance/EXECUTION_PROTOCOL.md §1` + `memory/project_next_day_plan.md`. Completed.

---

## §0 · TL;DR

Three tracks in sequence on a single AVTONOM session window:

1. **Track C — Ratify 3 Proposed ADRs** (ADR-001, ADR-002, ADR-003). ~20 min. Closes F-10 (7-day Proposed window) discipline.
2. **Track B — Phase B.2 media upload + ADR-003 IMPL.** Lands `safe-fetch.ts` + spec + `upload-wfy-media.ts` + spec. ~half day worth of code.
3. **Track A — Phase C renderer migration.** Lands `(tenants)/work-for-you/page.tsx` + `[city]/page.tsx` + `policy/page.tsx` + `WfyHomeShell` shell. ~half day worth of code.

All work AVTONOM-mode. No `git push`. No spine touches anticipated. Commits in logical chunks per MANIFEST L3 (see §3).

---

## §1 · Mode + entering state

| Item | Value |
|---|---|
| Mode | AVTONOM (operator command `AVTONOM: Track C → B → A`) |
| First-line status emitted | `[mode:AVTONOM] phase:multi-track epic:track-C-B-A spine:clear` |
| Last commit | `9af0117 docs(barbie): SESSION_LOG — AVTONOM Phase B work4u content migration 2026-05-26 12:45` |
| Local commits ahead of origin/main | 50 (none of mine pushed; carry-over from prior sessions intact) |
| Working-tree carry-over (untouched) | `M ENTITY.md`, `M SITE1/apps/web/**`, `M SITE1/apps/api/src/scripts/seed-sal-nmas-home.ts`, untracked HTMLs in `NON_PROJECT/` — all pre-existing, NOT modified by this session |
| Phase A schema in tree | confirmed (6 new tables + `siteType` column; commit `fc5b06f`) |
| Phase B seeder in tree | confirmed (`seed-wfy-tenant.ts` + spec; commit `9d1044c`) |
| Migration 0004 applied to live DB | **unknown** (operator step; T1 verification limited to filesystem) |
| 3 ADRs status | all `Proposed`, all `ratify-by: 2026-06-02` (3 days from now) |
| ADR-001 IMPL state | shipped (`aa5f968`) — IMPL-A/B/C/D all in tree; ratification is clean |
| ADR-002 IMPL state | not started — IMPL deferred to Phase B.2 or later per ADR §Implementation plan |
| ADR-003 IMPL state | not started — lands in this session as Track B step 1+2 |

---

## §2 · Council activation matrix (per `ENTITY_SYSTEM.md §14`)

The 3 tracks span multiple matrix rows. The session takes the union:

| Track | Matrix row | Required tiers |
|---|---|---|
| Track C — ratify ADRs | "Internal refactor / docs" + retroactively touches ADR-001's domain (D-3 + new endpoint), ADR-002 (Drizzle migration), ADR-003 (WP-import) | Tier-1 + **Historian (mandatory)** + Tier-3 review for ADR-003 (Adversary already signed the draft); skip Productor / Migrator deep pass — ADRs are decision-level docs |
| Track B — Phase B.2 media + ADR-003 IMPL | "WP-import code" + "File upload / MinIO path" | Tier-1 + Tier-2 (all) + **Adversary (SSRF — REQUIRED)** + **Chaos (MinIO outage)** + **Migrator + Ecosystem** |
| Track A — Phase C renderer | "Admin UI page" (no — public route) + "New domain module" + adds public read endpoints reading from Phase A tables | Tier-1 + Tier-2 + **Productor (UI ground truth)** + **Sentinel (public posture — no auth required)** |

**Union activation:** Tier-1 always · Tier-2 all · Adversary · Chaos · Migrator · Ecosystem · Productor · Test Pilot **skipped** (no hot-path concern; scripts + RSC reads). Judge — on conflict only.

---

## §3 · MANIFEST L3 (file ledger + spine/non-spine)

All paths under `barbie/SITE1/` unless noted.

### Track C deliverables — chunk-1 (single docs commit)

| File | Spine? | Action |
|---|---|---|
| `barbie/governance/adr/ADR-001-tenant-guard-coverage-detector.md` | non-spine | Status: Proposed → Accepted + Decision-Date: 2026-05-26 |
| `barbie/governance/adr/ADR-002-migration-journal-snapshot-drift.md` | non-spine | same |
| `barbie/governance/adr/ADR-003-wp-import-ssrf-allowlist.md` | non-spine | same |
| `barbie/governance/decision-graph.md` | non-spine | move 3 entries §1 Anticipated → §2 Ratified with Decision-Date column; visual graph re-drawn with solid lines |
| `barbie/governance/CHANGELOG.md` | non-spine | append `2026-05-26 · 3 ADRs ratified` entry |

### Track B deliverables — chunk-2 + chunk-3

**chunk-2: ADR-003 IMPL-A + IMPL-B (safeFetch helper + spec)**

| File | Spine? | Action |
|---|---|---|
| `apps/api/src/wp-import/safe-fetch.ts` (NEW) | non-spine | helper per ADR-003 §Decision: scheme allow-list, IP CIDR block-list, port allow-list, content-type allow-list, IP-pinning, max 3 redirects each re-validated |
| `apps/api/src/wp-import/safe-fetch.spec.ts` (NEW) | non-spine | jest spec covering every block class (per ADR-003 §F-S1..F-S4) |
| `apps/api/src/wp-import/index.ts` (NEW, optional) | non-spine | barrel re-exporting `safeFetch` |

No new runtime dep. Use Node 22 built-in `fetch` + `dns/promises` + a hand-rolled IP-CIDR check (avoid `ipaddr.js` to honour `ENTITY.md §11 Dependency policy` per §2.6). CIDR helper is ~50 LOC and unit-tested directly in the spec.

**chunk-3: Phase B.2 media migration script + spec**

| File | Spine? | Action |
|---|---|---|
| `apps/api/src/scripts/upload-wfy-media.ts` (NEW) | non-spine | reads `work4u/packages/migrator/parsed/wxr.json`, iterates attachments, fetches each via `safeFetch`, uploads to MinIO via existing `StorageS3Service`, writes `nas.media` row (idempotent on `(tenant_id, key)`), second pass back-fills `partner_salons.logo_media_id` + `wfy_opportunities.cover_image_key` |
| `apps/api/src/scripts/upload-wfy-media.spec.ts` (NEW) | non-spine | mock-DB + mock-fetch spec covering: happy path, re-run idempotency, single-bad-URL partial-failure tolerance, FK back-fill correctness |
| `apps/api/package.json` | non-spine | add `media:wfy` npm script entry |

### Track A deliverables — chunk-4 + chunk-5

**chunk-4: Public renderer routes + shell component**

| File | Spine? | Action |
|---|---|---|
| `apps/web/src/components/tenant-site/wfy/WfyHomeShell.tsx` (NEW) | non-spine | RSC; receives `tenant`, `cities[]`, `opportunities[]`, `advantages[]`, `partnerSalons[]`; renders home page sections |
| `apps/web/src/components/tenant-site/wfy/WfyCityShell.tsx` (NEW) | non-spine | RSC; receives `tenant`, `cityPage`, `vacancies[]`; renders city detail |
| `apps/web/src/components/tenant-site/wfy/WfyPolicyShell.tsx` (NEW) | non-spine | RSC; renders policy text (placeholder until cms_pages «Политика» is wired in a later phase) |
| `apps/web/src/lib/wfy-queries.ts` (NEW) | non-spine | Drizzle query helpers — `fetchWfyHomeData(tenantSlug)`, `fetchWfyCityPage(tenantSlug, citySlug)`, `fetchWfyVacancies(tenantId)` |
| `apps/web/src/app/(tenants)/work-for-you/page.tsx` (NEW) | non-spine | `/` — main page; reads via `wfy-queries`; renders `WfyHomeShell` |
| `apps/web/src/app/(tenants)/work-for-you/[city]/page.tsx` (NEW) | non-spine | `/[city]` — city detail |
| `apps/web/src/app/(tenants)/work-for-you/policy/page.tsx` (NEW) | non-spine | `/policy` — static policy |

No `wp-import` Adversary review for chunk-4 (renderer is read-only, public, no untrusted input). Sentinel covers "no-auth posture" (public read of `wfy_*` tables — no tenant scoping needed at L2 because Phase A `wfy_*` tables ARE per-tenant but routes are slug-scoped at L1; defence: query helpers MUST `WHERE tenantId = (SELECT id FROM tenants WHERE slug=$1)`).

**chunk-5: Cleanup of legacy work4u apps**

DEFERRED to a future session — Track A scope intentionally does NOT delete `barbie/work4u/apps/web/` or `apps/api/` per AVTONOM "don't delete adjacent project state without operator OK" caution. Future Phase C completion task = delete those folders once renderer is verified live.

### chunk-6: T12 closing artifacts

| File | Spine? | Action |
|---|---|---|
| `barbie/SESSION_LOG.md` | non-spine | append entry per `EXECUTION_PROTOCOL.md §13 T12` template |
| `C:\Users\a3\.claude\projects\F--Users-a-Documents--DEV-Tran-ES\memory\project_next_day_plan.md` | non-spine (auto-memory) | refresh for next session — Phase B.2 + Phase C status update, new open tracks |

### Spine ledger — anticipated touches

**None.** Phase A's spine touches (`tenants.ts`, `index.ts` in `packages/db`) carry over via prior commits; this session adds no schema. ADR markdown is not on spine list. `apps/web/(tenants)/work-for-you/**` is non-spine (only `apps/web/public/platform-blueprint.html` is spine in the web app, and we are not touching it).

### Spine ledger — refusals (if any)

None anticipated. If any spine-touch becomes necessary mid-flight (e.g. `app.module.ts` for wp-import module wiring) — AVTONOM rule: SKIP + record in SESSION_LOG; reopen as MANUAL task.

---

## §4 · Council pre-pass — per-track

### Track C · ORCHESTRATOR

Ratification is the closing of yesterday's 3 drafted ADRs. Epic alignment: each ADR is forward-inheritance-linked to current Phase B/C work. No new architecture surface; verdict **approve**.

### Track C · HISTORIAN TRACE

- ADR-001 ratified — moves from §1 Anticipated to §2 Ratified.
- ADR-002 ratified — same. IMPL still deferred per ADR §Implementation plan.
- ADR-003 ratified — same. IMPL lands in this session's Track B.
- decision-graph.md visual updated. Verdict **consistent**.

### Track C · SENTINEL

No new threat surface in ratification itself. Re-attests F-A1..F-A4 / F-D1..F-D2 / F-S1..F-S4 mitigations from the ADR drafts remain valid.

### Track B · ORCHESTRATOR

Epic: MIGRATION_PLAN §8 Phase B.2 (media upload). Forward-inheritance: Track A consumes `partner_salons.logo_media_id` + `wfy_opportunities.cover_image_key` populated by Track B. Verdict **approve-with-conditions** — gate: ADR-003 IMPL-A in place before Track B step 3.

### Track B · FORGEMASTER MEMO

- Query budget per attachment (script): 2 SELECT (existence check on `nas.media`) + 1 INSERT or 0 if exists; second pass = 2 UPDATEs per partner_salon/opportunity. ~5-6 queries per processed attachment.
- Index usage: `media.tenant_id + key` unique index (already present per existing schema); `partner_salons.tenant_id + slug` for back-fill.
- RSC/Client split — N/A (script).
- Event-loop risk: sequential per-attachment with backpressure (no parallel fetches in v1; can be Promise.all-batched in IMPL-NEXT if profile justifies).
- Validation boundary: URL parsed via WHATWG URL; passed through safeFetch.

### Track B · SENTINEL RISK AUDIT

- **F-B2.1 · SSRF through wxr.json attachments.** Mitigation: every fetch via `safeFetch` (ADR-003). Detector: spec covers blocked-scheme + private-CIDR + redirect-rebind classes.
- **F-B2.2 · Partial seed if MinIO unreachable mid-upload.** Mitigation: idempotent by `(tenant_id, key)` — re-run resumes; failed uploads logged with URL + reason but don't abort batch.
- **F-B2.3 · Leaked secret in `acf.json` accidentally written.** Already mitigated by Phase B AID-B3 in seed-wfy-tenant.ts; same posture preserved in upload-wfy-media.
- Tenant isolation: script runs against single tenant (`work-for-you`) resolved by slug at startup; all inserts use that resolved `tenantId`.

### Track B · SIMPLIFIER COUNTERPROPOSAL

Attempted reductions:
1. **Skip `index.ts` barrel** — `safeFetch` is single-call surface; direct import path is fine. **Accepted** (no barrel file).
2. **Inline safeFetch into upload-wfy-media.ts** — rejected: ADR-003 mandates centralised helper; Phase L will reuse from `wp-import/`.
3. **Use existing `media.service.ts` createMedia()** instead of direct insert. **Accepted** if service surface is straightforward; fallback to direct Drizzle insert if service requires controller-context (audit during impl).

### Track B · ECONOMIST LEDGER

- Storage: ~50 MB upload to MinIO at most (work4u attachments are mostly small JPG/PNG logos). Negligible.
- Per-tenant scaling: O(N) on attachment count; N for work4u is ~30-50. Negligible.

### Track B · ADVERSARY STRESS

- **T1 · DNS rebind via wxr attachment URL.** Vector: WP export specifies hostname that resolves to public-A then private-A. Pre-conditions: attacker controls a malicious wxr export. Impact: SSRF to internal MinIO/Postgres. Mitigation: ADR-003 IMPL — IP-pinning + per-hop revalidation. Test: spec.
- **T2 · Redirect chain to metadata endpoint.** Vector: `https://attacker.com/img.jpg` → 302 → `http://169.254.169.254/...`. Mitigation: every redirect hop re-runs allow-list. Test: spec.
- **T3 · Oversized response DoS.** Vector: attachment URL points to multi-GB binary. Mitigation: `WP_IMPORT_MAX_BYTES` enforced via streaming abort. Test: spec.

### Track B · CHAOS DRILLS

- **Drill 1 — MinIO down mid-batch.** Behaviour: PutObject throws; script catches, logs URL + reason, continues to next attachment. Re-run is idempotent. Recovery: bring MinIO up, re-run.
- **Drill 2 — Postgres down mid-batch.** Behaviour: existence check throws; script bubbles up and exits. Re-run is idempotent. Recovery: bring DB up, re-run.
- **Drill 3 — slow attachment server.** Behaviour: safeFetch enforces per-request timeout (15 s default). Aborts and continues.

### Track B · MIGRATOR OUTLOOK

No new Drizzle migration this session. Consumes Phase A's 0004. WP-import fidelity: live URL fetch + wxr.json mapping; Duplicator support deferred to Phase L per ADR-003 §Forward-inheritance.

### Track B · ECOSYSTEM OUTLOOK

Tenant-onboarding step: `npm run media:wfy` added to package.json. Operator-facing error quality: per-attachment ❌/✓ log line with URL + reason on fail (not silent).

### Track A · ORCHESTRATOR

Epic: MIGRATION_PLAN §8 Phase C. Forward-inheritance: lands the visible UI for work-for-you tenant; future task = delete `barbie/work4u/apps/web/` once verified. Verdict **approve**.

### Track A · FORGEMASTER MEMO

- Query budget per route: 3-5 Drizzle reads (tenant resolve by slug + main table read + child tables); all RSC, no client roundtrip.
- Index usage: `tenants.slug` (already unique), `wfy_city_pages.tenant_id + slug`, `wfy_vacancies.tenant_id + code` (Phase A composite indexes).
- RSC/Client split: every page is full RSC; zero client-side JS for v1 (bundle delta ~0 KB after tree-shake).

### Track A · SENTINEL RISK AUDIT

- **F-C1 · Public read of wrong tenant's data via URL crafting.** Vector: attacker fetches `/work-for-you/...` and tries to coerce query into reading another tenant's rows. Mitigation: every query helper takes `tenantSlug` literal; resolves to `tenantId` before SQL; defence-in-depth via Phase A schema's `tenant_id NOT NULL` (any cross-tenant read would error not leak).
- **F-C2 · 404 vs 403 disclosure.** Public routes use Next.js `notFound()` for missing tenant/city; consistent 404 — no info disclosure between unknown-tenant and unknown-city.

### Track A · PRODUCTOR NOTES

- New public surfaces: 3 routes under `(tenants)/work-for-you/`.
- dashboard-2077 adherence: N/A — these are public tenant-facing pages, not `/admin/*`. Style references work4u source visuals (kept simple in v1; full theming is Phase J brand-kit per MIGRATION_PLAN §5).
- Error-message audit: 404 page text reviewed for operator-friendly copy.

### No conflicts detected at pre-pass → JUDGE not invoked.

---

## §5 · A-tests check (per `CONSTITUTION.md §9`)

- A-1 Specificity ✓ — every "must" cites a concrete file or measurable.
- A-2 Falsifiability ✓ — spec coverage list per IMPL section.
- A-3 Reachable forwardrefs ✓ — ADR-001B (L2 detector) tagged "after stable L1 runs ~2 weeks"; cleanup of work4u apps tagged "after this renderer is verified live".
- A-4 Read-before-trust ✓ — T1 verified (see §1 entering state table).
- A-5 Failure-mode count ✓ — F-B2.1..3, F-C1..2, F-S1..4 carried over.
- A-6 Query/bundle count ✓ — Track B 5-6 q/attachment; Track A 3-5 q/route.
- A-7 Epic link ✓ — MIGRATION_PLAN §8 Phase B.2 + Phase C.
- A-8 Forward inheritance ✓ — chunk-5 cleanup task + future Phase L for safeFetch.
- A-9 Spine ledger ✓ — none anticipated.
- A-10 Reviewable verdict — N/A (no Judge invocation).

---

## §6 · Mid-session adjustment rules (AVTONOM)

If during execution any of the following occurs, AVTONOM rule = pause + record in SESSION_LOG before resuming or stopping:

- **Spine-touch required** — STOP that chunk; log `SKIP: spine-touch on <file> · reason: <…>` in SESSION_LOG; continue with remaining chunks.
- **Adversary stress reveals a new threat class not in ADR-003** — STOP Track B; open a Motion stub; if blocking, escalate to operator carry-forward.
- **Test fails on first run** — fix in place; don't commit broken. Commit only after gates green.
- **Discovery of stale prereq** (e.g. media module API surface different from expectation) — pivot the chunk to fit the actual surface; record AID decision in SESSION_LOG.

---

## §7 · Execution plan (sequential)

1. **chunk-1 · Track C ratification** (docs commit)
2. **chunk-2 · Track B IMPL-A/B** (safeFetch + spec)
3. **chunk-3 · Track B Phase B.2 script + spec** (upload-wfy-media)
4. **chunk-4 · Track A renderer routes + shell**
5. **chunk-5 · DEFERRED to future session** (cleanup of `work4u/apps/`)
6. **chunk-6 · T12 closing** (SESSION_LOG + memory refresh)

Gates between chunks: `npm run check-types` after every chunk that adds TS. `npm run test --testPathPattern=…` for chunks adding specs.

---

## §8 · Anti-Drift T13 checklist (executed at end of session)

- D-1 Scope creep — diff stat vs §3 MANIFEST.
- D-3 Tenant-guard coverage — new routes have no `@TenantGuard` (public RSC pages, not controllers). N/A.
- D-5 Migration journal — no new migration this session. Coherence unchanged.
- D-6 Planning trail — commits reference this file + ADR slots + MIGRATION_PLAN cells.
- D-7 Architecture-layer — `wp-import/` lives under `apps/api/src/`; no cross-app imports.

---

## §9 · Closing protocol

T12 ritual produces SESSION_LOG entry with all sections from `EXECUTION_PROTOCOL.md §13 T12` template + carry-forward to refreshed `project_next_day_plan.md`. `git push` **never** executed.

**End of session-plan.**
