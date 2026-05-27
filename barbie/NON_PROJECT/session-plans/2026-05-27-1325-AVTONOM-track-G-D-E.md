# AVTONOM Session — Track G → D → E

**Start:** 2026-05-27 13:25
**Trigger:** Operator: «давай G → D → E» (after `что по плану?` digest).
**Mode:** AVTONOM (operator-selected via AskUserQuestion; no `AVTONOM:` prefix used — explicit operator choice satisfies §M activation).
**Live-verify branch:** operator-selected "Сделать сейчас" — AI runs migrate/seed/media; operator opens browser to confirm renderer.

---

## §0 · Entering state (T1 read-before-trust)

- Branch: `main` · 6 unpushed local commits from prior AVTONOM (2026-05-26 → 01:00). Working tree dirty with prior unrelated edits.
- Docker SITE1: containers `barbie-site1-postgres`, `barbie-site1-minio`, `barbie-site1-minio-init` started at 13:25 (parallel running `replikant-*` and `atomiclane-*` containers are unrelated other-project tenants; no port conflict — SITE1 uses 5442 / 9011 / 9012).
- `packages/db/drizzle/`: 5 SQL files (0000, 0001, 0002_chat, 0003_tenant_bootstrap, 0004_cool_next_avengers). `meta/_journal.json` has 5 entries — coherent. Snapshots present for 0000, 0001, 0004 only; 0002_chat and 0003_tenant_bootstrap are hand-written and **intentionally have no snapshots**. **This pattern must be tolerated by Track G IMPL-A** — otherwise the check fails out of the box.
- `governance/decision-graph.md §2`: ADR-002 ratified 2026-05-26, IMPL deferred per ADR. This session lands IMPL-A/B/D; IMPL-C (--with-db) stays deferred to Phase L.
- Prior `apps/api`: 14 jest suites · 215 tests passing as of last session. Will re-run at T12.

---

## §1 · Council Activation Matrix (per ENTITY_SYSTEM.md §14)

| Phase | Tier-1 | Tier-2 | Tier-3 | Tier-4 |
|---|---|---|---|---|
| Live-verify (operator-assisted) | ORCHESTRATOR + SENTINEL | — | — | ECOSYSTEM (operator-facing seed errors) |
| Track G — ADR-002 IMPL-A/B/D | FORGEMASTER + SENTINEL + ORCHESTRATOR | HISTORIAN (decision-graph delta) + SIMPLIFIER (Mode A only, no DB surface) | — | MIGRATOR (auto-on per ADR-002) |
| Track D — admin UI for wfy | FORGEMASTER + SENTINEL + ORCHESTRATOR | SIMPLIFIER + ECONOMIST | ADVERSARY (auth + tenant guard on each new write) | PRODUCTOR (dashboard-2077 palette) + MIGRATOR (any new columns) + ECOSYSTEM (admin nav surface) |
| Track E — work4u cleanup | ORCHESTRATOR | HISTORIAN (record removal) | — | — |
| T12/T13 closing | All Tier-1 | All Tier-2 | — | — |

Skips with reason recorded inline:
- TEST PILOT skipped — admin pages are not hot-path; load profile applies only at tenant onboarding scale (deferred to Phase L).
- CHAOS skipped on Track G (script, no MinIO/PG runtime path) and Track D (admin pages are RSC + standard tenant-guard pattern; no new failure modes vs imperiumspa admin).

---

## §2 · Scope per track

### Live-verify (~30 min, operator browser-side)

```bash
# AI runs:
cd barbie/SITE1
npm run db:migrate -w @barbie-site1/db
npm run seed:wfy -w @barbie-site1/api
npm run media:wfy -w @barbie-site1/api

# Operator confirms in browser (after web/api dev start):
#   http://localhost:5111/work-for-you
#   http://localhost:5111/work-for-you/moscow
#   http://localhost:5111/work-for-you/policy
```

Expected: tenant + 57 cities + 5 partner_salons + 3 opps + 3 vacancies + 6 advantages seeded; media:wfy uploads attachments to MinIO bucket `barbie-media` and back-fills FK.

### Track G — ADR-002 IMPL-A/B/D · ~0.5 day

**Files (all non-spine):**
- `packages/db/scripts/check-state.ts` (new)
- `packages/db/scripts/check-state.spec.ts` (new)
- `packages/db/package.json` — add `db:check-state` script; chain into `lint`
- `packages/db/scripts/HAND_WRITTEN_MIGRATIONS.json` (new) — allow-list of hand-written migration tags exempt from snapshot requirement: `["0002_chat", "0003_tenant_bootstrap"]`
- `governance/adr/ADR-002-migration-journal-snapshot-drift.md` — update Status note (IMPL-A/B/D shipped on 2026-05-27)
- `governance/decision-graph.md` §2 — append IMPL state note for ADR-002

**Behavior:** Exit 0 coherent; exit 1 incoherent. AI-Default: hand-written migrations declared via JSON allow-list (Y vs option: detect by file content — too brittle).

### Track D — admin UI for wfy · ~1.5–2 days

**Pre-req:** Track G green (don't add new migrations under untrustworthy journal).

**Files:**
- `apps/web/src/lib/site-type-capabilities.ts` (new)
- `apps/web/src/app/(admin)/admin/wfy/*` (new — 5 pages)
- `apps/api/src/modules/wfy-admin/*` (new module) — 5 controllers + 5 services
- `apps/web/src/components/admin/shell/AdminSideNav.tsx` (modify — read siteType filter) — **must check if spine**

**Spine check (T1 verification):**
- `apps/api/src/app.module.ts` — adding `WfyAdminModule` import is a spine touch. **SKIP per AVTONOM §M and log** unless module can be auto-registered (it cannot in NestJS). Will SKIP and record `SKIP: spine-touch on app.module.ts — WfyAdminModule registration pending operator OK` in SESSION_LOG. Module file itself can be created; operator wires it in manually at T12.
- `apps/web/public/platform-blueprint.html` — План→Статус update for Phase D status. SKIP per AVTONOM and log.

**ADR-001 detector:** every new POST/PATCH/DELETE controller must have `@TenantGuard` (or be in `coverage.allow.json` allow-list with justification).

### Track E — work4u apps cleanup · ~0.5 day

**Pre-req:** Track D verified + operator opens /work-for-you in browser without regression vs work4u original.

**Files:**
- `barbie/work4u/apps/web/` → `git rm -r`
- `barbie/work4u/apps/api/` → `git rm -r`
- `barbie/work4u/packages/migrator/` → keep (source of parsed JSON for media:wfy)
- `barbie/work4u/README.md` → redirect to NAS docs

---

## §3 · Spine ledger (carry-forward enforcement)

Files in spine list that this session might touch:
- `apps/api/src/app.module.ts` — Track D requires registering WfyAdminModule. **SKIP + log per AVTONOM rule I-13.**
- `apps/web/public/platform-blueprint.html` — Track D Plan→Status update. **SKIP + log.**
- ENTITY.md / CLAUDE.md / DESIGN.md — **never** in AVTONOM (§M).
- `packages/db/src/schema/*.ts` — Track D may need extras columns (meta_title on wfy_city_pages?). If needed → new migration only (forward-only I-7); schema files spine, **SKIP**.

If a track is hard-blocked by spine touch — record SKIP, move to next track.

---

## §4 · AI-Default decisions ledger (filled live)

| # | Decision | Rationale | Track |
|---|---|---|---|
| AID-G1 | Hand-written migration allow-list via JSON file (not magic-comment in SQL) | Magic comments are brittle and not greppable across SQL files; JSON allow-list explicit + auditable | G |
| AID-G2 | Mode A only this session (no Mode B / `--with-db`) | Per ADR-002 §Implementation plan IMPL-C explicitly deferred to Phase L | G |
| _… more added as session progresses_ |

---

## §5 · Commits planned (local only — NEVER pushed)

| Track | Commit subject |
|---|---|
| G | `feat(barbie/SITE1/db): ADR-002 IMPL-A/B/D — db:check-state Mode A` |
| G | `docs(barbie/governance): mark ADR-002 IMPL-A/B/D shipped` |
| D | `feat(barbie/SITE1/web): site-type capability matrix + admin nav filter` |
| D | `feat(barbie/SITE1): wfy admin pages — cities (Track D step 3.1)` |
| D | `feat(barbie/SITE1): wfy admin pages — partner-salons + opportunities` |
| D | `feat(barbie/SITE1): wfy admin pages — advantages (reorder) + vacancies` |
| E | `chore(barbie/work4u): retire apps/web + apps/api after NAS parity confirmed` |
| T12 | `docs(barbie): SESSION_LOG — AVTONOM Track G→D→E 2026-05-27` |

All commits use trailer `AI-Assisted: Claude Code` + `Co-Authored-By: Claude Opus 4.7 (1M context)`. `git push` — **never**, per AVTONOM §M + F-12.

---

## §6 · Exit criteria (T12 gates)

- `cd SITE1/apps/api && npm run check-types`: clean
- `cd SITE1/apps/api && npx jest`: ≥215 tests passing + new wfy-admin specs
- `cd SITE1/apps/api && npm run check:tenant-coverage`: 0 failures
- `cd SITE1/apps/web && npx tsc --noEmit`: clean
- `cd SITE1/packages/db && npm run db:check-state`: exit 0 (new)
- SESSION_LOG.md appended
- `memory/project_next_day_plan.md` refreshed for next session

---

**End of session-plan.**
