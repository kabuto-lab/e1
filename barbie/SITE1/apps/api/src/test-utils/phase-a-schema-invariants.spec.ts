/**
 * Phase A schema invariants — Drizzle metadata introspection.
 *
 * Governance: ratified by Council T2-T9 pass on 2026-05-26 (session-plan
 * `2026-05-26-1022-MANUAL-phase-A-schema-foundation.md`). This spec is the gate
 * deferred from that session per `project_next_day_plan.md`; it MUST stay green
 * before Phase B (work4u content migration) writes a single row into the new
 * tables.
 *
 * What is asserted, table-by-table:
 *
 *   1. Every Phase A tenant-scoped table (`partner_salons`, `wfy_city_pages`,
 *      `wfy_opportunities`, `wfy_vacancies`, `wfy_advantages`,
 *      `lead_applications`) has:
 *        - a `tenant_id` column, uuid type, NOT NULL
 *        - a foreign key `tenant_id → tenants.id` with ON DELETE CASCADE
 *        - at least one composite index whose first column is `tenant_id`
 *          (L2 query-plan invariant per `barbie/ENTITY.md §9 Level 2`)
 *
 *   2. `tenants` has the new `site_type` column added by Phase A migration:
 *        - varchar, NOT NULL, default `'generic-cms'`
 *        - column metadata reachable via Drizzle introspection (catches future
 *          accidental drop of `.default(...)` or `.notNull()` on the schema)
 *
 *   3. `partner_salons.logo_media_id` references `media.id` with
 *      ON DELETE SET NULL (cross-tenant-media-leak surface flagged in
 *      session-plan §2 SENTINEL F-2 — schema-level FK is one of two
 *      mitigations; repo-layer check is the other).
 *
 * What this spec does NOT cover (out of scope, by design):
 *   - Live SQL state in Postgres. Use migration 0004 SQL + drizzle-kit migrate
 *     for that — covered by integration tests once Phase B introduces real-DB
 *     runs. Schema-as-code is the source of truth for these invariants.
 *   - Cross-tenant runtime safety (Layer 3 in ADR-001). That is the
 *     check-tenant-coverage detector's L1 + L2 responsibility.
 *
 * If this spec fails, the Phase A schema has drifted from the ratified
 * contract — DO NOT relax the assertion without a Motion (governance §11)
 * and a Council pass that documents the new contract.
 */

import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  partnerSalons,
  wfyCityPages,
  wfyOpportunities,
  wfyVacancies,
  wfyAdvantages,
  leadApplications,
  tenants,
  media,
} from '@barbie-site1/db';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Drizzle PgTable values carry a Symbol-keyed config; `getTableConfig` is the
 * documented introspection entry point and returns: { name, schema, columns,
 * indexes, foreignKeys, checks, primaryKeys, uniqueConstraints }.
 */
type AnyPgTable = Parameters<typeof getTableConfig>[0];

function configOf(table: AnyPgTable): ReturnType<typeof getTableConfig> {
  return getTableConfig(table);
}

function findColumn(table: AnyPgTable, columnName: string) {
  const cfg = configOf(table);
  return cfg.columns.find((c) => c.name === columnName);
}

function findForeignKey(table: AnyPgTable, localColumnName: string) {
  const cfg = configOf(table);
  return cfg.foreignKeys.find((fk) => {
    const ref = fk.reference();
    return ref.columns.some((c) => c.name === localColumnName);
  });
}

function findCompositeIndexStartingWithTenantId(table: AnyPgTable) {
  const cfg = configOf(table);
  return cfg.indexes.find((idx) => {
    const cols = idx.config.columns;
    if (cols.length === 0) return false;
    const first = cols[0] as { name?: string };
    return first.name === 'tenant_id';
  });
}

// ── Table inventory ──────────────────────────────────────────────────────

interface PhaseATableSpec {
  label: string;
  table: AnyPgTable;
  expectedTableName: string;
}

const PHASE_A_TABLES: PhaseATableSpec[] = [
  { label: 'partner_salons', table: partnerSalons, expectedTableName: 'partner_salons' },
  { label: 'wfy_city_pages', table: wfyCityPages, expectedTableName: 'wfy_city_pages' },
  { label: 'wfy_opportunities', table: wfyOpportunities, expectedTableName: 'wfy_opportunities' },
  { label: 'wfy_vacancies', table: wfyVacancies, expectedTableName: 'wfy_vacancies' },
  { label: 'wfy_advantages', table: wfyAdvantages, expectedTableName: 'wfy_advantages' },
  { label: 'lead_applications', table: leadApplications, expectedTableName: 'lead_applications' },
];

// ── Specs ────────────────────────────────────────────────────────────────

describe('Phase A · schema invariants (MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §2)', () => {
  describe.each(PHASE_A_TABLES)('table $label', ({ table, expectedTableName }) => {
    it('drizzle table name matches the SQL identifier in migration 0004', () => {
      expect(configOf(table).name).toBe(expectedTableName);
    });

    it('has a tenant_id column', () => {
      const col = findColumn(table, 'tenant_id');
      expect(col).toBeDefined();
    });

    it('tenant_id is a uuid column', () => {
      const col = findColumn(table, 'tenant_id');
      expect(col?.columnType).toBe('PgUUID');
      expect(col?.dataType).toBe('string');
    });

    it('tenant_id is NOT NULL (L3 schema-level isolation per ENTITY §9)', () => {
      const col = findColumn(table, 'tenant_id');
      expect(col?.notNull).toBe(true);
    });

    it('tenant_id has a foreign key to tenants.id', () => {
      const fk = findForeignKey(table, 'tenant_id');
      expect(fk).toBeDefined();
      const ref = fk!.reference();
      // foreignTable name surfaces as the underlying PgTable; introspect via
      // its config so the assertion does not depend on Drizzle internal symbol.
      expect(configOf(ref.foreignTable).name).toBe('tenants');
      expect(ref.foreignColumns.some((c) => c.name === 'id')).toBe(true);
    });

    it('tenant_id FK is ON DELETE CASCADE (tenant deletion sweeps owned rows)', () => {
      const fk = findForeignKey(table, 'tenant_id');
      expect(fk?.onDelete).toBe('cascade');
    });

    it('has a composite index whose first column is tenant_id (query-plan invariant)', () => {
      const idx = findCompositeIndexStartingWithTenantId(table);
      expect(idx).toBeDefined();
    });
  });

  // ── tenants.site_type (added by migration 0004 ALTER) ──────────────────

  describe('tenants.site_type (Phase A ALTER)', () => {
    it('column exists', () => {
      const col = findColumn(tenants, 'site_type');
      expect(col).toBeDefined();
    });

    it('is NOT NULL', () => {
      const col = findColumn(tenants, 'site_type');
      expect(col?.notNull).toBe(true);
    });

    it("has default 'generic-cms' (safe backfill for existing rows)", () => {
      const col = findColumn(tenants, 'site_type');
      expect(col?.default).toBe('generic-cms');
    });

    it('is varchar(32) — keeps SiteType union machine-readable', () => {
      const col = findColumn(tenants, 'site_type');
      expect(col?.columnType).toBe('PgVarchar');
      // Drizzle column config carries the length under `.length` on PgVarchar.
      expect((col as { length?: number } | undefined)?.length).toBe(32);
    });
  });

  // ── partner_salons.logo_media_id cross-tenant guard (SENTINEL F-2) ────

  describe('partner_salons.logo_media_id (cross-tenant media leak surface)', () => {
    it('column exists', () => {
      const col = findColumn(partnerSalons, 'logo_media_id');
      expect(col).toBeDefined();
    });

    it('is nullable (logos are optional and surviving media-delete sets NULL)', () => {
      const col = findColumn(partnerSalons, 'logo_media_id');
      expect(col?.notNull).toBe(false);
    });

    it('FK points to media.id', () => {
      const fk = findForeignKey(partnerSalons, 'logo_media_id');
      expect(fk).toBeDefined();
      const ref = fk!.reference();
      expect(configOf(ref.foreignTable).name).toBe('media');
      expect(ref.foreignColumns.some((c) => c.name === 'id')).toBe(true);
    });

    it('FK is ON DELETE SET NULL (media-delete must not cascade-kill partner cards)', () => {
      const fk = findForeignKey(partnerSalons, 'logo_media_id');
      expect(fk?.onDelete).toBe('set null');
    });

    it('repo-layer ownership note — schema cannot enforce media.tenant_id === partner.tenant_id', () => {
      // The schema-level FK only proves "media row exists". Cross-tenant media
      // reuse is closed at the repository layer (insert/update must assert
      // `media.tenant_id === partner_salons.tenant_id`). This spec records the
      // surface so future PhaseD impl reviewers see the invariant declared.
      const mediaConfig = configOf(media);
      expect(mediaConfig.columns.some((c) => c.name === 'tenant_id')).toBe(true);
    });
  });

  // ── lead_applications composite indexes — confirm all three from §2.2 ─

  describe('lead_applications · all three composite indexes present', () => {
    const REQUIRED_TENANT_INDEXES = [
      'lead_applications_tenant_created_idx',
      'lead_applications_tenant_source_idx',
      'lead_applications_tenant_status_idx',
    ];

    it.each(REQUIRED_TENANT_INDEXES)('index %s exists', (indexName) => {
      const cfg = configOf(leadApplications);
      const idx = cfg.indexes.find((i) => i.config.name === indexName);
      expect(idx).toBeDefined();
    });
  });
});
