# 2026-05-27 16:00 · AVTONOM session-plan · Track D step 3.3 wfy-opportunities

> **Status:** drafted → executing
> **Mode:** AVTONOM (operator: `AVTONOM: go ahead with D.3 opportunities`)
> **Activation matrix:** Tier-1 + Tier-2 + Adversary + Migrator + Productor (no Chaos, no TestPilot — admin endpoint, no MinIO/Redis touch)
> **Spine touches:** none (TenantsModule registration only)

## §1 · Mission

Replicate established wfy-admin CRUD pattern (cities D.1 + partner-salons D.2) for `wfy_opportunities` aggregate. Schema differences:
- `title` required (varchar 255), `headline` optional (varchar 255 — сумма/награда)
- `coverImageKey: varchar(500)` — **S3 key string**, NOT FK on media → no `assertMediaBelongsToTenant()`
- Per schema docstring: media uploaded with `module='wfy-opp'`, then key stored denormalized

Phase D: 3 modules shipped so far (cities, partner-salons + opportunities now). Rule-of-three for `requireWfyTenant()` extract **triggers this session**; will document as AI-Default and defer extract to dedicated D.7 commit to avoid scope creep.

## §2 · Entering state

- `wfy_opportunities` schema exists (Phase A, `packages/db/src/schema/wfy-opportunities.ts`)
- Pattern fully established by partner-salons (`7a597b7` + `f65de35`)
- Media API supports `module=wfy-opp` enum value (per `dto/upload-media.dto.ts` MEDIA_MODULES)
- 249/249 jest passing baseline

## §3 · AI-Defaults (AVTONOM)

| # | Decision | Rationale |
|---|---|---|
| AID-D3-O1 | Inline `requireWfyTenant()` в opportunities service | Rule-of-three triggered (3rd occurrence); extract deferred to D.7 dedicated commit; scope discipline |
| AID-D3-O2 | `coverImageKey` treated as free-form S3 key string in service; no cross-tenant validation | Schema choice — denormalized key ref, not FK. Format invariant (`tenant/{tenantId}/...`) deferred as Productor-debt: validate format on save once pattern emerges |
| AID-D3-O3 | UI: `CoverImagePicker` subcomponent in page.tsx — mirrors LogoPicker but filters `module=wfy-opp`, returns `key` not `id` | Consistency with D.2 Productor solution; ≤ 80 LOC inline; rule-of-three for media picker also triggered (LogoPicker + CoverImagePicker = 2); extract on 3rd at D.4/D.5 |
| AID-D3-O4 | Three commits (api + web + SESSION_LOG) — same structure as D.2 | Tested release cadence |

## §4 · Tracks

| Step | Files | Status |
|---|---|---|
| 4 DTOs (create/update/list-query/response) | `tenants/wfy-admin/dto/{create,update,list-query,response}-wfy-opportunity.dto.ts` | pending |
| Service + spec (15+ cases) | `tenants/wfy-admin/wfy-opportunities.{service,service.spec}.ts` | pending |
| Controller (mirror partner-salons) | `tenants/wfy-admin/wfy-opportunities.controller.ts` | pending |
| TenantsModule registration (non-spine) | `tenants/tenants.module.ts` (M) | pending |
| Typed client | `apps/web/src/lib/wfy-opportunities-api.ts` | pending |
| Admin page + inline CoverImagePicker | `apps/web/src/app/admin/wfy/opportunities/page.tsx` | pending |
| Gates: check-types + jest + check:tenant-coverage + web tsc | — | pending |
| Commits + SESSION_LOG + next_day_plan | — | pending |

## §5 · Anti-drift expectations

- D-1 Scope: ~900 LOC across 9 new files + 1 modified (less than D.2 since no email/url validators, no logoMediaId FK)
- D-3 Tenant-guard: new controller through ADR-001 detector → expected ✓ (20th controller)
- D-5 Migration state: no schema touch → no drift
- D-6 Planning trail: commits reference Track D step 3.3
- D-7 Architecture: no cross-module imports; CoverImagePicker inline; MediaItem types inline (same as page.tsx D.2)

## §6 · Productor-debt carry-forward expected

- coverImageKey format validation (Productor): `^tenant/{tenantId}/...` invariant — defer to next session
- Extract `requireWfyTenant` shared helper — D.7 dedicated commit (after D.3)
- Extract media picker — when 3rd consumer emerges (D.4 advantages may not need it; D.5 vacancies likely yes)
