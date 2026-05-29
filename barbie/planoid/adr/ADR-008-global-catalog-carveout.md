# ADR-008 — Global-Catalog Carve-out from I-5 (Class-G tables without tenant_id)

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Decision date** | 2026-05-29 |
| **Proposed by** | JUDGE (carve-out) + SENTINEL (mitigations) + ORCHESTRATOR (Council content-model pass) |
| **Drives** | `governance/CONSTITUTION.md §4 I-5` (multi-tenant table rule — scope clarification) |
| **Consulted** | `barbie/ENTITY.md §2.2, §9`; `SITE1/docs/CONTENT-MODEL.md`; `packages/db/src/schema/platform-admins.ts`, `tenants.ts` (precedent) |
| **Ratify-by** | 2026-06-05 (F-10) |
| **Supersedes** | none |

---

## Context

The NAS entertainment content model (`SITE1/docs/CONTENT-MODEL.md`) introduces **Class-G global catalogs** — content authored once platform-wide and shown **identically on every tenant**: `girls` (девушки), `service_offers` (мальчишник + выезд), `vacancies`, plus the Class-H `program_kinds`. The operator confirmed (2026-05-29) these are deliberately unified, not per-tenant.

Immutable **I-5** states "`tenant_id` in every table; tenant guard at controller + tenant-aware WHERE at repository." Read literally, a global table without `tenant_id` violates I-5.

This is a genuine tension between operator-confirmed product design and an Immutable. Resolved by JUDGE (`CONSTITUTION.md §7`) in the content-model Council pass.

## Decision

**Class-G global catalogs MAY omit `tenant_id`.** I-5 governs **tenant-owned** data, whose leakage between tenants is the existential failure (`§3 rung 1`). Platform-global catalogs are not tenant-owned — there is no "tenant A's data" to leak to "tenant B" because the content belongs to the platform and is identical for all. Precedent already in the schema: `tenants`, `platform_admins`, `users` carry no `tenant_id` and do not violate I-5.

This is a **scope clarification of I-5, not an amendment** (no `§11` motion required): I-5 continues to bind every tenant-scoped table unchanged.

### Mandatory conditions (SENTINEL — non-optional)

A Class-G table is permitted **only** with all of:

1. **Write path guarded by `platform-admin` role.** Class-G mutating endpoints use the platform-admin guard, never a tenant-admin role. (ADVERSARY T3: otherwise one tenant edits content shown to all.)
2. **Tenants get read-only exposure via published snapshots** (`ADR-009`), never direct write access.
3. **The read path that composes Class-G content into a tenant-facing page is covered by an isolation test** proving no tenant-scoped data is mixed in incorrectly.
4. **Registered in the global-table allow-list** so the D-3 tenant-coverage detector (`ADR-001`, `check:tenant-coverage`) does not false-positive: Class-G controllers are platform-scoped (`@SkipTenant()` + platform-admin guard) and listed in `coverage.allow.json` with reason `class-G global catalog (ADR-008)`.

### Class-G table register (append-only)

| Table | Component | Added |
|---|---|---|
| `girls` | Девушки | 2026-05-29 |
| `service_offers` | Мальчишник + Выезд | (planned) |
| `vacancies` | Вакансии (migrated from `wfy_vacancies`, see ADR-010) | (planned) |
| `program_kinds` | Программы — shared kind (Class-H global half) | (planned) |

## Consequences

- **Positive:** content authored once (O(1) per platform, not O(N) tenants); new tenant inherits catalogs with zero per-tenant work (ECONOMIST/ECOSYSTEM win).
- **Failure mode (SENTINEL, §A-5):** a Class-G write endpoint mis-guarded with a tenant-admin role → cross-tenant content tampering. **Detector:** `check:tenant-coverage` allow-list entry must assert platform-admin guard presence; **recovery:** revoke, re-guard, audit-log review of edits since the gap.
- **Negative:** introduces a second table category engineers must classify correctly (tenant-scoped vs global). Mitigated by this register + the allow-list being the single source of truth.

## Rollback

Pure-additive for new tables; no rollback needed for the policy. If a table is mis-classified as global, the fix is a forward migration adding `tenant_id` + backfill (expand/contract, I-7).
