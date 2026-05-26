# Decision Graph — Barbie Council

> **Owner:** Historian (Tier-2). Cross-entity writes forbidden.
> **Format:** append-only. ADRs are nodes; `Supersedes:` / `Consulted:` / `Depends-on:` are edges.
> **Bootstrapped:** 2026-05-26.

---

## §0 · Reading guide

Each ADR is one node. Edges declare relationships:

- `Supersedes: ADR-NNN` — this ADR replaces a prior decision. The prior ADR's `Status:` flips to `Superseded` with a back-link.
- `Consulted: ADR-NNN` — this ADR refers to prior reasoning; no replacement.
- `Depends-on: ADR-NNN` — this ADR cannot be ratified before the dependency is `Accepted`.

ADRs live as `governance/adr/ADR-NNN-<slug>.md`. This file is the **index + graph**.

---

## §1 · Anticipated ADRs (seeded by Adoption Pass, not yet drafted)

These are slot reservations. Each must be drafted before the work they govern lands. Aging > 7 days as `Proposed` triggers F-10.

| Slot | Title | Status | Driver | Why anticipated |
|---|---|---|---|---|
| ADR-004 | NAS chat last-admin invariant — code-level enforcement | Proposed | Sentinel | Memory `project_nas_chat_admin_policy` declares "≥1 member ⇒ ≥1 admin" invariant; code-level test fixture required. |
| ADR-005 | Forward-only migration policy enforcement | Proposed | Migrator | Immutable I-7 needs a pre-commit hook or `xtask` equivalent. |
| ADR-006 | dashboard-2077 palette compliance check | Proposed | Productor | I-10 needs a CSS-token-snapshot test for `/admin/*` pages. |
| ADR-007 | Council session-log schema | Proposed | Historian | SESSION_LOG.md needs a stable section schema for grep-ability. |

---

## §2 · Ratified ADRs

| Slot | Title | Decision-Date | File | IMPL state |
|---|---|---|---|---|
| ADR-001 | Tenant-guard coverage detector | 2026-05-26 | `governance/adr/ADR-001-tenant-guard-coverage-detector.md` | **IMPL-A/B/C/D shipped** in commit `aa5f968` (apps/api/scripts/check-tenant-coverage.ts + spec + coverage.allow.json + wired into `npm run lint`). Phase 2 (L2 raw-query detector) deferred to ADR-001B per ADR §Implementation plan. |
| ADR-002 | Drizzle migration journal-vs-applied + snapshot-drift check | 2026-05-26 | `governance/adr/ADR-002-migration-journal-snapshot-drift.md` | IMPL deferred per ADR §Implementation plan. Mode A (journal coherence, no-DB) lands before next `drizzle-kit generate`; Mode B (DB drift, `--with-db`) lands by Phase L. |
| ADR-003 | WP-import SSRF allow-list policy | 2026-05-26 | `governance/adr/ADR-003-wp-import-ssrf-allowlist.md` | IMPL-A (`safe-fetch.ts`) + IMPL-B (spec) targeted for Phase B.2 — this session's Track B step 1+2. IMPL-C (Phase B.2 integration) + IMPL-D (ESLint rule banning direct fetch in wp-import/) follow. |

---

## §3 · Superseded ADRs

*(empty)*

---

## §4 · Rejected proposals (with reason)

*(empty — prior rejections from pre-governance era are not retroactively imported)*

---

## §5 · Graph (visual)

```
                  ADR-007 (session-log schema)
                       │
                       ▼
       ┌───── ADR-001 (tenant-guard detector) ◀── ADR-003 (SSRF allow-list)
       │                       │
       ▼                       ▼
ADR-005 (forward-only policy) ADR-004 (chat last-admin code test)
       │
       ▼
ADR-002 (migration journal check)
                       
ADR-006 (dashboard palette compliance)  ← standalone
```

Edges currently anticipated; will be re-drawn once ADRs draft.

---

## §6 · Operating rules

- New ADR opens with `Status: Proposed`. Maximum 7 days at Proposed (F-10).
- New ADR must declare `Decision-Date:` on ratification.
- New ADR contradicting a prior must explicitly `Supersedes: ADR-NNN` — silent contradiction = D-9.
- Historian commits to `governance/decision-graph.md` are append-only edits to this file; deletions only via Motion (§11 CONSTITUTION).
- Renumbering ADRs is forbidden once `Accepted`.

---

**End of decision-graph.**
