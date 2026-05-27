/**
 * WfyOpportunitiesService — tenant-isolation + site-type-capability tests.
 *
 * Mock-DB unit spec. Verifies:
 *   - requireWfyTenant: 409/404 paths
 *   - every read/write path includes `eq(wfyOpportunities.tenantId, ctx.tenantId)`
 *   - update with empty patch falls back to get() (no .set() call)
 *   - delete returning empty → 404 (cross-tenant pretends not-found)
 *   - create accepts coverImageKey as free-form string (no FK validation)
 *
 * Не покрывается (по schema design):
 *   - coverImageKey cross-tenant validation — coverImageKey IS a string, not FK
 *     (per schema docstring). Format-invariant validation is Productor-debt.
 */
import { ConflictException, NotFoundException } from '@nestjs/common';

import { wfyOpportunities, tenants } from '@barbie-site1/db';

import { WfyOpportunitiesService } from './wfy-opportunities.service';
import { createMockDb, whereArgsOf } from '../../test-utils/mock-db';
import type { MockDb } from '../../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';
const OPP_ROW = {
  id: 'opp-1',
  tenantId: TENANT_A,
  title: 'Заработай на машину',
  headline: '1 500 000 ₽',
  description: null,
  coverImageKey: null,
  ord: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeService(db: MockDb, tenantId: string | null = TENANT_A): WfyOpportunitiesService {
  return new WfyOpportunitiesService(db.asDatabase(), mockTenantContext(tenantId));
}

function queueTenantSiteType(db: MockDb, siteType: string | null): void {
  db.queueResult(siteType === null ? [] : [{ siteType }]);
}

describe('WfyOpportunitiesService · site-type capability', () => {
  it('refuses with 409 when tenant.site_type ≠ wfy-city-dir', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'salon-detail');
    const service = makeService(db);

    await expect(service.list({})).rejects.toThrow(ConflictException);
  });

  it('refuses with 404 when tenant row is missing', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, null);
    const service = makeService(db);

    await expect(service.list({})).rejects.toThrow(NotFoundException);
  });

  it('allows wfy-city-dir tenants through', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([OPP_ROW]);
    db.queueResult([{ value: 1 }]);
    const service = makeService(db);

    const out = await service.list({});
    expect(out.total).toBe(1);
    expect(out.data[0].title).toBe('Заработай на машину');
  });
});

describe('WfyOpportunitiesService · tenant isolation', () => {
  it('list — both queries filter by tenant_id', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([]);
    db.queueResult([{ value: 0 }]);
    const service = makeService(db);

    await service.list({});

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, wfyOpportunities.tenantId, TENANT_A);
  });

  it('get — select filters by tenant_id', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([OPP_ROW]);
    const service = makeService(db);

    await service.get('opp-1');

    expectTenantFilter(whereArgsOf(db), wfyOpportunities.tenantId, TENANT_A);
  });

  it('get — 404 when row not in this tenant', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([]);
    const service = makeService(db);

    await expect(service.get('opp-x')).rejects.toThrow(NotFoundException);
  });

  it('update — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([{ ...OPP_ROW, title: 'Updated' }]);
    const service = makeService(db);

    await service.update('opp-1', { title: 'Updated' });

    expectTenantFilter(whereArgsOf(db), wfyOpportunities.tenantId, TENANT_A);
  });

  it('delete — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([{ id: 'opp-1' }]);
    const service = makeService(db);

    await service.remove('opp-1');

    expectTenantFilter(whereArgsOf(db), wfyOpportunities.tenantId, TENANT_A);
  });

  it('delete — 404 when row not in this tenant', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([]);
    const service = makeService(db);

    await expect(service.remove('opp-x')).rejects.toThrow(NotFoundException);
  });

  it('requireWfyTenant query targets tenants.id with current tenant', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([OPP_ROW]);
    const service = makeService(db);

    await service.get('opp-1');

    expectTenantFilter(whereArgsOf(db), tenants.id, TENANT_A);
  });
});

describe('WfyOpportunitiesService · create', () => {
  it('inserts with tenantId from context (not from DTO)', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([OPP_ROW]);
    const service = makeService(db);

    await service.create({ title: 'Заработай на машину' });

    const valuesCalls = db.calls.filter((c) => c.method === 'values');
    expect(valuesCalls.length).toBe(1);
    const [vals] = valuesCalls[0].args as [{ tenantId: string; title: string }];
    expect(vals.tenantId).toBe(TENANT_A);
    expect(vals.title).toBe('Заработай на машину');
  });

  it('accepts coverImageKey as free-form string (no FK validation)', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([
      { ...OPP_ROW, coverImageKey: 'tenant/abc.../wfy-opp/cover.jpg' },
    ]);
    const service = makeService(db);

    const out = await service.create({
      title: 'Test',
      coverImageKey: 'tenant/abc.../wfy-opp/cover.jpg',
    });

    expect(out.coverImageKey).toBe('tenant/abc.../wfy-opp/cover.jpg');
  });
});

describe('WfyOpportunitiesService · update edge cases', () => {
  it('empty patch falls back to get() (no .set() call)', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir'); // update's requireWfyTenant
    queueTenantSiteType(db, 'wfy-city-dir'); // get() calls requireWfyTenant again
    db.queueResult([OPP_ROW]);
    const service = makeService(db);

    await service.update('opp-1', {});

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(0);
  });

  it('throws 404 when update returning is empty', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([]);
    const service = makeService(db);

    await expect(
      service.update('opp-x', { title: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('coverImageKey=null clears the field', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([{ ...OPP_ROW, coverImageKey: null }]);
    const service = makeService(db);

    await service.update('opp-1', { coverImageKey: null });

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(1);
    const [patch] = sets[0].args as [{ coverImageKey?: string | null }];
    expect(patch.coverImageKey).toBeNull();
  });

  it('coverImageKey=undefined — field not in set patch', async () => {
    const db = createMockDb();
    queueTenantSiteType(db, 'wfy-city-dir');
    db.queueResult([{ ...OPP_ROW, title: 'Renamed' }]);
    const service = makeService(db);

    await service.update('opp-1', { title: 'Renamed' });

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(1);
    const [patch] = sets[0].args as [{ coverImageKey?: unknown; title?: string }];
    expect('coverImageKey' in patch).toBe(false);
    expect(patch.title).toBe('Renamed');
  });
});
