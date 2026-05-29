/**
 * WfyCitiesService — tenant-isolation tests.
 *
 * Mock-DB unit spec (per memory: project_nas_test_approach). Verifies:
 *   - every read/write path includes `eq(wfyCityPages.tenantId, ctx.tenantId)`
 *     in the .where() args (defence-in-depth Layer 2)
 *   - 23505 unique violation → ConflictException with WFY_CITY_SLUG_TAKEN
 *   - update with empty patch falls back to get() (no .set() call)
 *   - delete returning empty → 404 (cross-tenant access pretends not-found)
 *
 * Site-type capability (site_type='wfy-city-dir') is now enforced by
 * WfyTenantCapabilityGuard — its tests live in
 * wfy-tenant-capability.guard.spec.ts (Track D.7 guard extraction). The service
 * reads tenantId from the ALS context, so these specs no longer pre-queue a
 * tenant-lookup row.
 *
 * Not covered (integration concern):
 *   - real Postgres CHECK constraint on slug regex
 *   - real FK ON DELETE CASCADE
 *   - real ILIKE collation
 */
import { NotFoundException } from '@nestjs/common';

import { wfyCityPages } from '@barbie-site1/db';

import { WfyCitiesService } from './wfy-cities.service';
import { createMockDb, whereArgsOf } from '../../test-utils/mock-db';
import type { MockDb } from '../../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';
const CITY_ROW = {
  id: 'city-1',
  tenantId: TENANT_A,
  slug: 'moskva',
  cityName: 'Москва',
  region: null,
  country: 'RU',
  headline: null,
  description: null,
  extras: {},
  status: 'draft' as const,
  ord: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeService(db: MockDb, tenantId: string | null = TENANT_A): WfyCitiesService {
  return new WfyCitiesService(db.asDatabase(), mockTenantContext(tenantId));
}

describe('WfyCitiesService · tenant isolation', () => {
  it('list — both queries (rows + count) filter by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([]); // rows
    db.queueResult([{ value: 0 }]); // count
    const service = makeService(db);

    await service.list({});

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, wfyCityPages.tenantId, TENANT_A);
  });

  it('get — select filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([CITY_ROW]);
    const service = makeService(db);

    await service.get('city-1');

    expectTenantFilter(whereArgsOf(db), wfyCityPages.tenantId, TENANT_A);
  });

  it('get — 404 when row not in this tenant', async () => {
    const db = createMockDb();
    db.queueResult([]); // missing
    const service = makeService(db);

    await expect(service.get('city-x')).rejects.toThrow(NotFoundException);
  });

  it('update — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([{ ...CITY_ROW, cityName: 'Moscow City' }]);
    const service = makeService(db);

    await service.update('city-1', { cityName: 'Moscow City' });

    expectTenantFilter(whereArgsOf(db), wfyCityPages.tenantId, TENANT_A);
  });

  it('delete — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([{ id: 'city-1' }]);
    const service = makeService(db);

    await service.remove('city-1');

    expectTenantFilter(whereArgsOf(db), wfyCityPages.tenantId, TENANT_A);
  });

  it('delete — 404 when row not in this tenant (no leak)', async () => {
    const db = createMockDb();
    db.queueResult([]);
    const service = makeService(db);

    await expect(service.remove('city-x')).rejects.toThrow(NotFoundException);
  });
});

describe('WfyCitiesService · create', () => {
  it('inserts with tenantId from context (not from DTO)', async () => {
    const db = createMockDb();
    db.queueResult([CITY_ROW]);
    const service = makeService(db);

    await service.create({
      slug: 'moskva',
      cityName: 'Москва',
    });

    // values() call is the second insert-chain entry
    const valuesCalls = db.calls.filter((c) => c.method === 'values');
    expect(valuesCalls.length).toBe(1);
    const [vals] = valuesCalls[0].args as [{ tenantId: string; slug: string }];
    expect(vals.tenantId).toBe(TENANT_A);
    expect(vals.slug).toBe('moskva');
  });

  it('translates 23505 unique violation → 409 WFY_CITY_SLUG_TAKEN', async () => {
    const db = createMockDb();
    // Inject the 23505 by making `.values()` throw synchronously — the
    // service's try/catch wraps the entire insert chain, so a throw from
    // any chained call is captured the same way a real PG error would be.
    db.values.mockImplementationOnce(() => {
      const err: Error & { code?: string } = new Error('duplicate key');
      err.code = '23505';
      throw err;
    });
    const service = makeService(db);

    await expect(
      service.create({ slug: 'moskva', cityName: 'Москва' }),
    ).rejects.toMatchObject({
      response: { code: 'WFY_CITY_SLUG_TAKEN' },
    });
  });
});

describe('WfyCitiesService · update edge cases', () => {
  it('empty patch falls back to get() (no .set() call)', async () => {
    const db = createMockDb();
    db.queueResult([CITY_ROW]); // the eventual get()
    const service = makeService(db);

    await service.update('city-1', {});

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(0);
  });

  it('throws 404 when update returning is empty (row not in tenant)', async () => {
    const db = createMockDb();
    db.queueResult([]); // update returning nothing
    const service = makeService(db);

    await expect(
      service.update('city-x', { cityName: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });
});
