/**
 * seed-wfy-tenant.spec.ts — Phase B seed-script invariants.
 *
 * Mock-DB based unit spec. Covers:
 *  - tenant upsert returns the inserted row's id (orchestrator contract)
 *  - per-table tenant isolation: every WHERE in a replace-all branch carries
 *    `eq(table.tenantId, tenantId)` (so a delete cannot wipe another tenant's
 *    rows)
 *  - idempotency: cities use ON CONFLICT (tenantId, slug); vacancies use ON
 *    CONFLICT (tenantId, code); the chain records `onConflictDoUpdate`
 *  - replace-all sections (partner_salons, opportunities, advantages) issue
 *    a tenant-scoped DELETE *before* the inserts, NOT after (otherwise the
 *    fresh inserts get wiped)
 *  - theme constants are seeded with their declared length (3 vacancies,
 *    6 advantages) — guards against silent constant-list mutations
 *  - readParsedSources surfaces a clear error when JSON fixtures are missing
 *
 * What this spec does NOT cover (out of scope — integration concern):
 *  - actual Postgres semantics of `ON CONFLICT` (verified via dev DB run)
 *  - parse step: wxr.json / acf.json shape — that's the legacy migrator's
 *    contract, asserted upstream
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  partnerSalons,
  wfyCityPages,
  wfyOpportunities,
  wfyVacancies,
  wfyAdvantages,
  type Database,
} from '@barbie-site1/db';

import { createMockDb, whereArgsOf, type MockDb } from '../test-utils/mock-db';
import { expectTenantFilter } from '../test-utils/sql-helpers';

import {
  upsertTenant,
  seedCities,
  seedPartnerSalons,
  seedOpportunities,
  seedVacancies,
  seedAdvantages,
  readParsedSources,
  VACANCIES_FROM_THEME,
  ADVANTAGES_FROM_THEME,
  TENANT_SLUG,
  type ParsedCity,
  type AcfSalon,
  type AcfOpportunity,
} from './seed-wfy-tenant';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

function db(): MockDb {
  return createMockDb();
}

function dbAsDatabase(mock: MockDb): Database {
  return mock.asDatabase<Database>();
}

// ── tenant upsert ─────────────────────────────────────────────────────────

describe('seed-wfy-tenant · upsertTenant', () => {
  it('inserts tenants row with siteType=wfy-city-dir and returns the id', async () => {
    const mock = db();
    mock.queueResult([{ id: TENANT_ID }]);

    const id = await upsertTenant(dbAsDatabase(mock));

    expect(id).toBe(TENANT_ID);
    // First call must be `insert(tenants)`; subsequent chain hops carry the
    // values + onConflictDoUpdate + returning.
    const methods = mock.calls.map((c) => c.method);
    expect(methods[0]).toBe('insert');
    expect(methods).toContain('values');
    expect(methods).toContain('onConflictDoUpdate');
    expect(methods).toContain('returning');
  });

  it('throws when upsert returns no row (schema regression)', async () => {
    const mock = db();
    mock.queueResult([]); // no rows
    await expect(upsertTenant(dbAsDatabase(mock))).rejects.toThrow(/no id/);
  });

  it('TENANT_SLUG matches the documented wfy site (work-for-you)', () => {
    expect(TENANT_SLUG).toBe('work-for-you');
  });
});

// ── cities (upsert by (tenantId, slug)) ──────────────────────────────────

describe('seed-wfy-tenant · seedCities', () => {
  const CITIES: ParsedCity[] = [
    {
      wpId: 2,
      slug: 'moscow',
      title: 'Москва',
      cityName: 'Работа для девушек в Москве',
      metaTitle: 'X',
      metaDescription: 'Y',
      ord: 0,
    },
    {
      wpId: 5,
      slug: 'kaluga',
      title: 'Калуга',
      cityName: 'Работа для девушек из Калуги',
      ord: 1,
    },
  ];

  it('calls insert + values + onConflictDoUpdate once per city', async () => {
    const mock = db();
    const count = await seedCities(dbAsDatabase(mock), TENANT_ID, CITIES);
    expect(count).toBe(2);

    const inserts = mock.calls.filter((c) => c.method === 'insert');
    const onConflicts = mock.calls.filter((c) => c.method === 'onConflictDoUpdate');
    expect(inserts).toHaveLength(2);
    expect(onConflicts).toHaveLength(2);
  });

  it('passes tenant_id in values so DB-side default cannot accidentally land NULL', async () => {
    const mock = db();
    await seedCities(dbAsDatabase(mock), TENANT_ID, CITIES.slice(0, 1));

    const valuesCall = mock.calls.find((c) => c.method === 'values');
    expect(valuesCall).toBeDefined();
    expect((valuesCall!.args[0] as { tenantId: string }).tenantId).toBe(TENANT_ID);
  });

  it('seeds zero cities for empty input without erroring', async () => {
    const mock = db();
    const count = await seedCities(dbAsDatabase(mock), TENANT_ID, []);
    expect(count).toBe(0);
    expect(mock.calls).toHaveLength(0);
  });
});

// ── partner salons (replace-all + delete-then-insert) ────────────────────

describe('seed-wfy-tenant · seedPartnerSalons', () => {
  const SALONS: AcfSalon[] = [
    { ord: 0, name: 'Vanilia', link: 'https://5massage.ru', description: 'D' },
    { ord: 1, name: 'IMPERIUM', address: 'A', logoWpId: 1587 },
  ];

  it('issues a delete BEFORE any insert (otherwise inserts get wiped)', async () => {
    const mock = db();
    await seedPartnerSalons(dbAsDatabase(mock), TENANT_ID, SALONS);

    const methods = mock.calls.map((c) => c.method);
    const firstDelete = methods.indexOf('delete');
    const firstInsert = methods.indexOf('insert');
    expect(firstDelete).toBeGreaterThanOrEqual(0);
    expect(firstInsert).toBeGreaterThan(firstDelete);
  });

  it('delete is tenant-scoped — protects other tenants from accidental wipe', async () => {
    const mock = db();
    await seedPartnerSalons(dbAsDatabase(mock), TENANT_ID, SALONS);

    expectTenantFilter(whereArgsOf(mock), partnerSalons.tenantId, TENANT_ID);
  });

  it('logoMediaId is null in v1 (WP-attachment→media mapping is Phase B.2)', async () => {
    const mock = db();
    await seedPartnerSalons(dbAsDatabase(mock), TENANT_ID, SALONS.slice(0, 1));

    const valuesCalls = mock.calls.filter((c) => c.method === 'values');
    for (const v of valuesCalls) {
      expect((v.args[0] as { logoMediaId: unknown }).logoMediaId).toBeNull();
    }
  });

  it('passes external link through as-is', async () => {
    const mock = db();
    await seedPartnerSalons(dbAsDatabase(mock), TENANT_ID, SALONS.slice(0, 1));

    const v = mock.calls.find((c) => c.method === 'values');
    expect((v!.args[0] as { externalLink: string }).externalLink).toBe('https://5massage.ru');
  });
});

// ── opportunities (replace-all) ──────────────────────────────────────────

describe('seed-wfy-tenant · seedOpportunities', () => {
  const OPPS: AcfOpportunity[] = [
    { ord: 1, title: 'МАШИНУ', text: 'за 6 месяцев', imageWpId: 1563 },
    { ord: 2, title: 'КВАРТИРУ', text: 'за 12 месяцев', imageWpId: 1564 },
  ];

  it('delete-then-insert with tenant-scope', async () => {
    const mock = db();
    await seedOpportunities(dbAsDatabase(mock), TENANT_ID, OPPS);

    const methods = mock.calls.map((c) => c.method);
    expect(methods.indexOf('delete')).toBeLessThan(methods.indexOf('insert'));
    expectTenantFilter(whereArgsOf(mock), wfyOpportunities.tenantId, TENANT_ID);
  });

  it('maps acf.text → headline (short tagline)', async () => {
    const mock = db();
    await seedOpportunities(dbAsDatabase(mock), TENANT_ID, OPPS.slice(0, 1));

    const v = mock.calls.find((c) => c.method === 'values');
    expect((v!.args[0] as { headline: string }).headline).toBe('за 6 месяцев');
  });

  it('coverImageKey is null (media mapping deferred)', async () => {
    const mock = db();
    await seedOpportunities(dbAsDatabase(mock), TENANT_ID, OPPS.slice(0, 1));

    const v = mock.calls.find((c) => c.method === 'values');
    expect((v!.args[0] as { coverImageKey: unknown }).coverImageKey).toBeNull();
  });
});

// ── vacancies (theme constants, upsert by code) ──────────────────────────

describe('seed-wfy-tenant · seedVacancies', () => {
  it('seeds exactly the documented 3 theme positions', async () => {
    const mock = db();
    const count = await seedVacancies(dbAsDatabase(mock), TENANT_ID);
    expect(count).toBe(3);
    // Guard against accidental constants mutation.
    expect(VACANCIES_FROM_THEME).toHaveLength(3);
    const codes = VACANCIES_FROM_THEME.map((v) => v.code);
    expect(codes).toEqual(['admin', 'masseuse', 'hostess']);
  });

  it('uses ON CONFLICT (tenantId, code) — idempotent re-run', async () => {
    const mock = db();
    await seedVacancies(dbAsDatabase(mock), TENANT_ID);

    const onConflicts = mock.calls.filter((c) => c.method === 'onConflictDoUpdate');
    expect(onConflicts).toHaveLength(3);
  });

  it('requirements default to empty array; conditions populated from theme', async () => {
    const mock = db();
    await seedVacancies(dbAsDatabase(mock), TENANT_ID);

    const valuesCalls = mock.calls.filter((c) => c.method === 'values');
    for (const v of valuesCalls) {
      const row = v.args[0] as { requirements: unknown[]; conditions: unknown[] };
      expect(row.requirements).toEqual([]);
      expect(Array.isArray(row.conditions)).toBe(true);
      expect((row.conditions as string[]).length).toBeGreaterThan(0);
    }
  });

  it('every row carries tenantId', async () => {
    const mock = db();
    await seedVacancies(dbAsDatabase(mock), TENANT_ID);

    const valuesCalls = mock.calls.filter((c) => c.method === 'values');
    for (const v of valuesCalls) {
      expect((v.args[0] as { tenantId: string }).tenantId).toBe(TENANT_ID);
    }
    // The DB-side delete is not used for vacancies (upsert-by-code instead),
    // so wfyVacancies.tenantId filter check is on values, not where.
    expect(valuesCalls).toHaveLength(3);
  });
});

// ── advantages (theme constants, replace-all) ────────────────────────────

describe('seed-wfy-tenant · seedAdvantages', () => {
  it('seeds exactly 6 theme advantages with ord 1..6', async () => {
    const mock = db();
    const count = await seedAdvantages(dbAsDatabase(mock), TENANT_ID);
    expect(count).toBe(6);
    expect(ADVANTAGES_FROM_THEME).toHaveLength(6);

    const valuesCalls = mock.calls.filter((c) => c.method === 'values');
    const ords = valuesCalls.map((v) => (v.args[0] as { ord: number }).ord);
    expect(ords).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('delete-then-insert with tenant-scope', async () => {
    const mock = db();
    await seedAdvantages(dbAsDatabase(mock), TENANT_ID);

    const methods = mock.calls.map((c) => c.method);
    expect(methods.indexOf('delete')).toBeLessThan(methods.indexOf('insert'));
    expectTenantFilter(whereArgsOf(mock), wfyAdvantages.tenantId, TENANT_ID);
  });

  it('iconName is null in v1 (theme uses ord-number visual)', async () => {
    const mock = db();
    await seedAdvantages(dbAsDatabase(mock), TENANT_ID);

    const valuesCalls = mock.calls.filter((c) => c.method === 'values');
    for (const v of valuesCalls) {
      expect((v.args[0] as { iconName: unknown }).iconName).toBeNull();
    }
  });
});

// ── city pages composite tenantId filter ──────────────────────────────────

describe('seed-wfy-tenant · city upserts use the right table', () => {
  it('values target wfyCityPages', async () => {
    const mock = db();
    await seedCities(dbAsDatabase(mock), TENANT_ID, [
      {
        wpId: 1,
        slug: 'moscow',
        title: 'Moscow',
        cityName: 'Moscow',
        ord: 0,
      },
    ]);

    const insertCall = mock.calls.find((c) => c.method === 'insert');
    expect(insertCall).toBeDefined();
    expect(insertCall!.args[0]).toBe(wfyCityPages);
  });

  it('upsert target is the composite (tenantId, slug) unique index', async () => {
    const mock = db();
    await seedCities(dbAsDatabase(mock), TENANT_ID, [
      { wpId: 1, slug: 'kaluga', title: 'K', cityName: 'K', ord: 0 },
    ]);

    const onConflictCall = mock.calls.find((c) => c.method === 'onConflictDoUpdate');
    expect(onConflictCall).toBeDefined();
    const target = (onConflictCall!.args[0] as { target: unknown[] }).target;
    expect(Array.isArray(target)).toBe(true);
    expect(target).toContain(wfyCityPages.tenantId);
    expect(target).toContain(wfyCityPages.slug);
  });
});

// ── readParsedSources error path ─────────────────────────────────────────

describe('seed-wfy-tenant · readParsedSources', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'wfy-seed-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('throws an actionable error when wxr.json is missing', () => {
    // create acf.json only
    writeFileSync(join(tmp, 'acf.json'), '{"salons":[],"opportunities":[]}');
    expect(() => readParsedSources(tmp)).toThrow(/wxr\.json.*Run.*parse/);
  });

  it('throws an actionable error when acf.json is missing', () => {
    writeFileSync(
      join(tmp, 'wxr.json'),
      '{"cities":[],"staticPages":[],"attachments":[]}',
    );
    expect(() => readParsedSources(tmp)).toThrow(/acf\.json.*Run.*parse/);
  });

  it('returns parsed JSON when both files present', () => {
    writeFileSync(
      join(tmp, 'wxr.json'),
      '{"cities":[],"staticPages":[],"attachments":[]}',
    );
    writeFileSync(join(tmp, 'acf.json'), '{"salons":[],"opportunities":[]}');

    const result = readParsedSources(tmp);
    expect(result.wxr.cities).toEqual([]);
    expect(result.acf.salons).toEqual([]);
  });
});
