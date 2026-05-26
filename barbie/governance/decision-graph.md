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
| ADR-001 | Tenant-guard coverage detector | **Drafted** 2026-05-26 (ratify-by 2026-06-02) — `governance/adr/ADR-001-tenant-guard-coverage-detector.md` | Sentinel + Forgemaster | D-3 must have an automated detector before WP-import epic scales. `governance/CONSTITUTION.md §6 D-3`. |
| ADR-002 | Drizzle migration journal-vs-applied + snapshot-drift check | Proposed | Migrator | D-5 needs `npm run db:check-state` script. **Triggered 2026-05-26**: Phase A `drizzle-kit generate` emitted catch-up SQL for hand-written 0002_chat and 0003_tenant_bootstrap (`bootstrap_source_url`, `custom_domain`, chat tables, indexes). Hand-edited 0004 to keep only Phase A scope; snapshot now contains those tables (consistent with current schema), but future generates should not need similar surgery. ADR-002 scope expanded to include snapshot-drift detection. |
| ADR-003 | WP-import SSRF allow-list policy | Proposed | Adversary | WP-import fetches arbitrary URLs (memory: `project_nas_wp_migration_inputs`); SSRF guard required before next migration session. |
| ADR-004 | NAS chat last-admin invariant — code-level enforcement | Proposed | Sentinel | Memory `project_nas_chat_admin_policy` declares "≥1 member ⇒ ≥1 admin" invariant; code-level test fixture required. |
| ADR-005 | Forward-only migration policy enforcement | Proposed | Migrator | Immutable I-7 needs a pre-commit hook or `xtask` equivalent. |
| ADR-006 | dashboard-2077 palette compliance check | Proposed | Productor | I-10 needs a CSS-token-snapshot test for `/admin/*` pages. |
| ADR-007 | Council session-log schema | Proposed | Historian | SESSION_LOG.md needs a stable section schema for grep-ability. |

---

## §2 · Ratified ADRs

*(empty — none ratified yet under this governance v1.0; pre-governance decisions live as commit history and `barbie/ENTITY.md` §10 History)*

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
