# NAS Content Model — tenant components, draft/publish, WP-intake mapping

> **Status:** `drafted` (NOT ratified — carries operator-gated decisions, see §7).
> **Authored by:** The Council (per `governance/ENTITY_SYSTEM.md §16` composite output).
> **Authority:** subordinate to `barbie/ENTITY.md` and `governance/CONSTITUTION.md §0`.
> **Date:** 2026-05-29.
> **Consumes:** [[project_nas_content_architecture]], [[project_replikant_wp_intake]], live audit of 15 donor sites (2026-05-29).
> **Activation (CONSTITUTION §8 / ENTITY_SYSTEM §14):** union of *new domain module*, *WP-import code*, *Drizzle migration*, *public API DTO*, *admin UI* → **Tier-1 + Tier-2 + Adversary + Chaos + TestPilot + Migrator + Ecosystem + Productor**, Judge on conflict. Quorum: **Evolutionary**.

---

## §0 · Problem & scope

The entertainment vertical is an **extension of the spa-salon tenant** (not a new `site_type`); modules toggle per-tenant by capability. Each tenant exposes **9 component types**, split into three ownership classes confirmed by the operator and the live audit:

| Class | Components | Ownership |
|---|---|---|
| **G — Global** | Девушки · Мальчишник · Выезд · Сертификаты · Вакансии | one platform-wide source, identical everywhere; platform-admin edits |
| **T — Tenant** | Акции · Интерьеры · Видео | per-tenant content |
| **H — Hybrid** | Программы | shared *kind*, per-tenant name + content |

Two cross-cutting requirements:
1. **Draft → publish:** operator edits freely (draft); one «Опубликовать» flushes all pending changes atomically, **routed by scope** (global change → all tenants; tenant change → that tenant). Public sites read only published state.
2. **WP-intake mapping:** `CanonicalManifest` (from `@barbie-site1/wp-intake`) populates these tables on import.

This doc designs the data model + publish mechanism + mapping, and records the Council's review. It does **not** write code.

---

## §1 · Proposed data model

### §1.1 Class G — global tables (no `tenant_id`)

```
girls            (G) id, slug UNIQUE, name, params jsonb {height,weight,bust,...},
                     description, media_keys text[] (MinIO, global prefix), ord, ...
vacancies        (G) id, slug UNIQUE, title, description,
                     requirements text[], conditions text[], ord, ...
service_offers   (G) id, kind enum('bachelor','outcall'), slug, title, headline,
                     body, media_keys text[], ord, ...   ← Мальчишник + Выезд, kind-discriminated
```

`girls`, `vacancies`, `service_offers` are **platform-owned catalogs**: no `tenant_id`, read-only to tenants, edited only by `platform-admin`. Rendered identically on every capable tenant.

**Сертификаты — not a table.** It is an outbound CTA → `5massage.com`. Model as config:
`platform_settings.certificate_url` (default `https://5massage.com`) + optional `tenant_settings.certificate_url` override (operator decision §7-D3).

### §1.2 Class T — tenant tables (`tenant_id NOT NULL`)

```
promotions  (T) id, tenant_id FK→tenants ON DELETE CASCADE, title, body,
                media_key, starts_at, ends_at, ord, ...   INDEX (tenant_id, ord)
interiors   (T) id, tenant_id, media_key, caption, ord, ...   INDEX (tenant_id, ord)
videos      (T) id, tenant_id, storage_key|external_url, title, ord, ...   INDEX (tenant_id, ord)
```

Standard NAS tenant-scoped pattern (composite index leads with `tenant_id`, cascade delete) — identical to the shipped `wfy_advantages` / `partner_salons` modules.

> **Open architectural question (Simplifier/Orchestrator, §3 below):** Акции/Интерьеры/Видео could instead be **ED Section presets** (Immutable **I-11** — ED is the canonical CMS rendering pipeline) rather than bespoke CRUD tables. Decision deferred to §7-D4.

### §1.3 Class H — hybrid (программы)

```
program_kinds   (G) id, canonical_name, essence, ord            ← shared concept
tenant_programs (T) id, tenant_id, kind_id FK→program_kinds, custom_name,
                    body, price_minor int (kopeks, see I-8 note), media_key, ord, ...
                    INDEX (tenant_id, ord)
```

Tenant renames a global `program_kind` (`custom_name`) and fills its own `body`/`price`. Public render joins `tenant_programs` → `program_kinds` for the canonical taxonomy.

### §1.4 Draft → publish — **snapshot-on-publish** (recommended)

Working tables above are **always the editable draft**. Public reads come from immutable published snapshots:

```
publications  id, scope_type enum('global','tenant'), scope_id uuid NULL,   -- NULL for global
              version int, snapshot jsonb, published_at, published_by
              UNIQUE (scope_type, scope_id, version)
```

- **Edit:** mutates working tables only. Public sites unaffected.
- **«Опубликовать»:** in one transaction, serializes current working state into new `publications` rows — a `global` snapshot if global content changed, a `tenant` snapshot per tenant whose Class-T/H content changed. Atomic; **scope-routed** exactly as the operator described.
- **Public read:** latest `global` snapshot ⊕ latest `tenant` snapshot for that tenant. Cacheable by `(global.version, tenant.version)`.
- **Rollback:** point the tenant/global to a prior `version` — no data loss (Sentinel/Migrator win).

Alternative considered — per-row `status enum('draft','published')` + shadow columns — rejected in §3 (Simplifier/Forgemaster) for non-atomic publish and messy partial states.

### §1.5 WP-intake mapping (`CanonicalManifest` → tables)

| Manifest field | → Target | Notes |
|---|---|---|
| `content[]` (type post/page) | `cms_pages` (existing ED pipeline, **I-11**) | generic pages, not the 9 components |
| `classifiedBlocks{}` | ED block JSON in `cms_pages` | from `block-classifier` |
| `media[]` | `media` + MinIO (tenant-prefixed key) | from `wxr/url/duplicator` media phase |
| `designTokens` | `tenant_design_tokens` | from `design-extractor` |
| `menus[]` | `tenant_menu_items` | existing |
| heuristic: CPT/section "вакансии" | `vacancies` (G) | **import maps to global** — see Migrator §below |
| heuristic: gallery/"интерьер" | `interiors` (T) | per-tenant |

The 9 structured components are **not** auto-derived 1:1 from WP — most donor sites store them as bespoke sections. Import seeds `cms_pages` + media + tokens; structured-component population is a **review-assisted step**, not silent.

### §1.6 Migration of shipped code

`wfy_vacancies` (tenant-scoped, shipped) → **global `vacancies`**. Forward-only (**I-7**): new migration adds `vacancies`, backfills from `wfy_vacancies`, then a later contract-phase drops the old table. The other `wfy_*` tables (`wfy_city_pages`, `partner_salons`, `wfy_advantages`, `wfy_opportunities`) belong to the **`wfy-city-dir` recruitment vertical** — out of scope here, untouched.

---

## Council Review (architectural pass)

### ORCHESTRATOR
- **Epic alignment:** new "entertainment content model" epic; consumes wp-intake harvest (`0445143`); blueprint cell TBD (operator to add to План→Статус, **A-7**).
- **Dependency status:** `@barbie-site1/wp-intake` ✓ (built); `cms_pages`/`media`/`tenant_design_tokens`/`tenant_menu_items` ✓ exist; `wfy_vacancies` ✓ exists (to migrate).
- **Forward-inheritance map:** consumed by (a) admin CRUD pages per component, (b) the wp-intake terminal ingest phase, (c) public tenant-site rendering, (d) Track H ED Section presets (if §7-D4 picks ED route).
- **Drift detectors triggered:** **D-3** (new controllers will need tenant-guard coverage — but Class-G controllers are platform-scoped, see Sentinel), **D-5** (new migrations), **D-9** (new ADRs vs prior).
- **Verdict:** approve-with-conditions — conditions = resolve §7 operator decisions + Judge verdict on I-5.

### HISTORIAN TRACE
- **ADR graph delta:** proposes 3 new slots — **ADR-008** (Class-G global-catalog carve-out from I-5), **ADR-009** (snapshot-on-publish mechanism), **ADR-010** (wfy_vacancies → global expand/contract). All `Proposed`, ratify-by **2026-06-05** (F-10 7-day limit).
- **Prior-rejection check:** no prior ADR covers content classes; ADR-004..007 still Proposed (ratify-by 2026-06-02) — unrelated.
- **decision-graph.md updated:** no graph delta yet (this doc is `drafted`); update on ratification.
- **Verdict:** consistent — pending ADR-008..010 authoring before code.

### MIGRATOR OUTLOOK
- **Migration safety:** all additive first (new tables) → forward-only (**I-7** ✓). `wfy_vacancies`→`vacancies` is destructive at the end → **mandatory expand/contract**: (1) add `vacancies` + backfill, (2) dual-write/verify, (3) drop `wfy_vacancies` in a later migration. Rollback co-signed by Sentinel (§15 contract).
- **WP-import fidelity:** structured components NOT silently auto-mapped (avoids field-mapping regression, **§10**). Live/WXR/Duplicator all land in `cms_pages`+media; component seeding is review-gated. Fixture test required before any auto-heuristic (e.g. "вакансии" CPT detection).
- **API shape impact:** new admin DTOs (additive); no breaking change to shipped wfy DTOs.
- **Verdict:** approve — with expand/contract sequence mandatory for vacancies.

### ECOSYSTEM OUTLOOK
- **Tenant-onboarding delta:** Class-G content is authored **once** platform-wide → new tenant inherits девушки/вакансии/etc. with zero per-tenant work (large onboarding win). Per-tenant work shrinks to Class-T (акции/интерьеры/видео) + Class-H naming.
- **Migration toolkit coverage:** live ✓ / WXR ✓ / Duplicator ✓ via wp-intake; component population still manual/review — flag in operator runbook.
- **Operator-facing error quality:** publish must report *which* scope/tenant snapshot it wrote; failed publish must name the offending row. [decision: error copy at impl]
- **Verdict:** approve.

### PRODUCTOR NOTES
- **New surfaces:** admin pages — global editors (`/admin/girls`, `/admin/vacancies`, `/admin/service-offers`, `/admin/programs`) under a platform-admin area; per-tenant editors for акции/интерьеры/видео/programs; a global **«Опубликовать»** control with a pending-changes summary.
- **dashboard-2077 adherence (I-10):** all pages must follow palette / RF Rufo / rail / scoop / inverse-radius. Read `dashboard-2077.html` before building (mandatory).
- **Time-to-action:** publish = 1 action; editing any component ≤ 3 clicks from its admin index.
- **Error-message audit:** publish-conflict + partial-failure copy reviewed at impl.
- **Verdict:** refine — needs a publish-preview/pending-diff UX spec before build.

---

## Council Engineering Pass (implementation pass)

### FORGEMASTER MEMO
- **Query budget:** public tenant page read = **2 snapshot reads** (global + tenant) + design tokens; target **≤ 3 queries/request**, snapshot JSONB cached by version. Admin list/CRUD = standard 2-3/req.
- **Index usage:** Class-T/H composite `(tenant_id, ord)`; `publications` UNIQUE `(scope_type, scope_id, version)` + lookup index `(scope_type, scope_id, version DESC)`.
- **RSC/Client split:** public render = RSC reading snapshot; admin editors = Client. Bundle delta TBD at impl `[claim: unmeasured]`.
- **Event-loop risk:** publish serializes working tables → JSONB; for large catalogs do it in a transaction, consider BullMQ if snapshot build > ~50 ms `[claim: unmeasured estimate]`.
- **Validation boundary:** Zod/class-validator at every admin DTO (girls params, vacancy arrays).
- **Verdict:** approve-with-bench-required (snapshot build time + public read p95).

### SENTINEL RISK AUDIT
- **Tenant isolation evidence:** Class-T/H tables — guard + `tenant_id` WHERE (defence-in-depth, **I-5 Level 3**); isolation specs required (`*-tenant-isolation.spec.ts`), per shipped wfy pattern + `check:tenant-coverage` (**D-3**). Class-G tables have **no `tenant_id`** → governed by **platform-admin guard** (not tenant guard); writes restricted to `platform-admin` role; tenants get **read-only** access via published snapshots. **This is the I-5 tension → JUDGE (§Judge Verdict).**
- **Failure modes named:** (1) a tenant snapshot read returns another tenant's snapshot if `scope_id` filter is dropped → mitigate: `publications` read for tenant scope ALWAYS `WHERE scope_id = :tenantId`, covered by isolation test. (2) Publish mid-transaction crash → atomic tx, no partial snapshot. (3) Global publish accidentally exposes draft girl photos → snapshot only serializes published-intent rows; draft media stay under a non-public MinIO prefix until publish.
- **Threat surfaces:** WP-import URL fetch = SSRF (covered by harvested `safe-fetch`/`ip-guard`, ADR-003); admin upload paths need MIME sniff + size cap.
- **Rollback path:** publish is revertible by pointing to prior `publications.version`; migrations forward-only + co-signed.
- **Observability hook:** audit-log entry on every publish (who/scope/version) and on any cross-tenant 403.
- **Verdict:** approve-with-mitigations (mitigations above are mandatory, not optional).

### SIMPLIFIER COUNTERPROPOSAL
- **Removable surfaces:** (1) collapse Мальчишник+Выезд into ONE `service_offers` table with `kind` enum — **done in §1.1** (not two tables). (2) Сертификаты — **no table**, just config (done). (3) Акции/Интерьеры/Видео — **strong candidate to be ED Section presets** (I-11) instead of 3 new CRUD tables + 3 admin pages + 3 DTO sets → saves ~9 files and reuses Track H. (4) `program_kinds` — only build if there's a real shared taxonomy; if every tenant's programs are bespoke, H collapses to T (one table) — verify with operator before building the kind table (extract on third real shared kind, **§F-4**).
- **Concrete reduction:** prefer **3 tables (girls, vacancies, service_offers) + config + ED presets for T** over **9 tables + 9 admin modules**.
- **Cost of keeping the full 9-table design:** ~9 controllers/services/specs/pages, more `check:tenant-coverage` surface.
- **Cost of removing:** Class-T via ED requires Track H presets first (sequencing dependency).
- **Verdict:** reduce — adopt §1.1 collapses now; gate Class-T-as-tables behind §7-D4; defer `program_kinds` until a shared kind is proven.

### ECONOMIST LEDGER
- **Infra delta:** snapshots duplicate content into JSONB per version → O(versions × content_size). Content is small (catalogs ~10²–10³ rows) → negligible ₽; cap retained versions (e.g. keep last 10, prune older) to bound growth.
- **Per-tenant scaling:** Class-G = **O(1) per platform** (huge win — authored once, not ×N tenants). Class-T = O(N tenants). Public read O(1) (2 snapshots). 
- **Maintenance cost:** publish pipeline + snapshot pruning = 1 new runbook surface.
- **Cheaper variant considered:** per-row status flags (no snapshots) — cheaper storage, but loses atomic publish + rollback → rejected (operability rung 2 > simplicity rung 7, **§3**).
- **Verdict:** accept — with version-retention cap.

### ADVERSARY STRESS
- **T1 — cross-tenant snapshot read** (STRIDE: Information Disclosure); vector: tenant snapshot fetched without `scope_id` filter / cache-key collision on `(global,tenant)`; pre-cond: attacker is any tenant-admin; impact: read another tenant's акции/интерьеры; mitigation in design: mandatory `scope_id = :tenantId` + cache key includes tenant_id + isolation spec — **yes**.
- **T2 — draft leakage before publish** (Info Disclosure); vector: public route reads working tables instead of snapshot; pre-cond: missing read-path discipline; impact: unpublished girl photos exposed; mitigation: public reads ONLY `publications`; draft media under private MinIO prefix — **yes (enforce in code review)**.
- **T3 — privilege escalation on Class-G write** (Elevation); vector: tenant-admin hits a global-content endpoint; pre-cond: missing platform-admin guard; impact: one tenant edits content shown to ALL tenants; mitigation: Class-G write endpoints require `platform-admin` role guard — **yes, critical**.
- **T4 — SSRF via WP-import** — covered by ADR-003 `safe-fetch`/`ip-guard` (harvested).
- **Verdict:** approve-with-mitigations (T3 is the highest-severity new surface — global write must be platform-admin-only).

### CHAOS DRILLS
- **Drill 1 — Postgres dies mid-publish:** publish is a single transaction → rolls back; no partial snapshot; operator retries. User sees old published state throughout. ✓
- **Drill 2 — MinIO down during media upload (admin edit):** edit fails on the media step with an actionable error; working row not half-saved; publish unaffected (operates on already-stored keys). ✓
- **Drill 3 — two operators publish concurrently:** `publications` UNIQUE `(scope_type, scope_id, version)` + version computed in-tx (SELECT max+1 FOR UPDATE or sequence) → one wins, other retries; no lost update.
- **Verdict:** approve-with-fallback (version allocation must be in-transaction, not read-then-write).

### TEST PILOT PROFILE
- **Workload assumed:** public tenant page, snapshot-backed, cache hit ratio high; catalogs ≤ 10³ rows; admin = low RPS.
- **p50/p95/p99:** TBD autocannon on public render `[evidence: TBD]`.
- **Saturation point:** bounded by snapshot read + RSC render; not DB-row-count bound (snapshot is one JSONB row). 
- **Backpressure:** public reads are cache-friendly; admin publish is rare.
- **Verdict:** bench-required (one autocannon pass on public render before declaring hot-path safe).

---

## §Judge Verdict

- **Conflict:** Class-G tables carry **no `tenant_id`**, which appears to violate **Immutable I-5** ("`tenant_id` in every table").
- **Position A** (ORCHESTRATOR, operator-backed): девушки/вакансии/выезд/мальчишник are platform-global catalogs, identical for all; modelling them with `tenant_id` is wrong (there is no owning tenant).
- **Position B** (SENTINEL, I-5 literalist): every table must have `tenant_id` for defence-in-depth; a table without it is an isolation risk.
- **§3 rungs:** both rung **1** (multi-tenant correctness).
- **Filters applied (§7 algorithm):** §4 Immutables filter — I-5's *intent* is preventing leakage of **tenant-owned** data; platform-global catalogs are not tenant-owned (precedent: `tenants`, `platform_admins` tables already have no tenant_id and do not violate I-5). Position A does **not** reopen I-5; it identifies a category I-5 never governed. Position B, applied literally, would force a meaningless `tenant_id` and a false sense of isolation.
- **Surviving position:** **A**, conditioned on Sentinel's mitigations: (1) Class-G **writes guarded by `platform-admin` role**; (2) tenants get Class-G only **read-only via published snapshots**; (3) the read path that composes G into a tenant page is covered by an isolation test; (4) formalized in **ADR-008** (global-catalog carve-out), NOT an I-5 amendment.
- **Verdict binding for day:** Class-G global tables are permitted without `tenant_id`, under platform-admin write-guard + read-only snapshot exposure, recorded in ADR-008.
- **Open at next RETRO:** yes — confirm ADR-008 ratified before code lands.

---

## §7 · Operator decisions required (gates ratification — A-test §9)

| # | Decision | Council default |
|---|---|---|
| **D1** | Confirm component list final at **9** (§0) — or more to add? | proceed with 9 |
| **D2** | `program_kinds` — is there a real **shared** program taxonomy across tenants, or are programs fully bespoke (→ collapse H into one tenant table)? | build `program_kinds` only when a shared kind is proven (Simplifier) |
| **D3** | Сертификаты — **single global URL** (`5massage.com`) for all, or allow **per-tenant override**? | single global URL; add override later if needed |
| **D4** | Class-T (акции/интерьеры/видео) — **bespoke CRUD tables** or **ED Section presets** (I-11, reuse Track H)? | ED presets (less code, reuses canonical pipeline) — but needs Track H first |
| **D5** | Ratify **ADR-008/009/010** (Judge carve-out, snapshot-publish, vacancies expand/contract) before any code? | yes |

---

## §8 · Next steps (post-ratification)

1. Operator answers D1–D5 → resolve TBDs → doc moves `drafted` → `ratified`.
2. Author **ADR-008/009/010** in `governance/adr/`.
3. Build vertical slice: `girls` (Class-G) table + migration + platform-admin CRUD + snapshot-publish for the global scope + public read — proves the whole spine end-to-end before fanning out to the other 8 components.
4. Wire the wp-intake terminal ingest phase (`manifest → cms_pages + media + tokens`) — separate from the 9-component model.

---

*Council artifact. Empty sections are illegal (§16); skips are noted inline. This doc is `drafted` until §7 decisions resolve (§9 A-test).*
