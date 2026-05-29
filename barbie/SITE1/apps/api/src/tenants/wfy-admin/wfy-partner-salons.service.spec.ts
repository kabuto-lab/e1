/**
 * WfyPartnerSalonsService — tenant-isolation + cross-tenant media leak tests.
 *
 * Mock-DB unit spec (per memory: project_nas_test_approach). Verifies:
 *   - every read/write path includes `eq(partnerSalons.tenantId, ctx.tenantId)`
 *     in the .where() args (defence-in-depth Layer 2)
 *   - update with empty patch falls back to get() (no .set() call)
 *   - delete returning empty → 404 (cross-tenant access pretends not-found)
 *   - assertMediaBelongsToTenant: 404 MEDIA_NOT_FOUND when logo from another tenant
 *     (Sentinel — cross-tenant media leak protection, schema docstring §9-11)
 *   - update with logoMediaId=null clears the field without media lookup
 *
 * Site-type capability (site_type='wfy-city-dir') is now enforced by
 * WfyTenantCapabilityGuard — its tests live in
 * wfy-tenant-capability.guard.spec.ts (Track D.7 guard extraction). The service
 * reads tenantId from the ALS context, so these specs no longer pre-queue a
 * tenant-lookup row.
 *
 * Not covered (integration concern):
 *   - real Postgres FK ON DELETE SET NULL when media deleted
 *   - real ILIKE collation
 */
import { NotFoundException } from '@nestjs/common';

import { partnerSalons, media } from '@barbie-site1/db';

import { WfyPartnerSalonsService } from './wfy-partner-salons.service';
import { createMockDb, whereArgsOf } from '../../test-utils/mock-db';
import type { MockDb } from '../../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';
const TENANT_B = '00000000-0000-0000-0000-00000000000b';
const MEDIA_ID = '00000000-0000-0000-0000-000000000111';
const PARTNER_ROW = {
  id: 'partner-1',
  tenantId: TENANT_A,
  name: 'Imperium Spa Москва',
  description: null,
  address: null,
  phone: null,
  email: null,
  externalLink: null,
  logoMediaId: null,
  ord: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeService(db: MockDb, tenantId: string | null = TENANT_A): WfyPartnerSalonsService {
  return new WfyPartnerSalonsService(db.asDatabase(), mockTenantContext(tenantId));
}

/** Queue the result of the assertMediaBelongsToTenant lookup. */
function queueMediaTenant(db: MockDb, mediaTenantId: string | null): void {
  db.queueResult(mediaTenantId === null ? [] : [{ tenantId: mediaTenantId }]);
}

describe('WfyPartnerSalonsService · tenant isolation', () => {
  it('list — both queries (rows + count) filter by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([]); // rows
    db.queueResult([{ value: 0 }]); // count
    const service = makeService(db);

    await service.list({});

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, partnerSalons.tenantId, TENANT_A);
  });

  it('get — select filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([PARTNER_ROW]);
    const service = makeService(db);

    await service.get('partner-1');

    expectTenantFilter(whereArgsOf(db), partnerSalons.tenantId, TENANT_A);
  });

  it('get — 404 when row not in this tenant', async () => {
    const db = createMockDb();
    db.queueResult([]); // missing
    const service = makeService(db);

    await expect(service.get('partner-x')).rejects.toThrow(NotFoundException);
  });

  it('update — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([{ ...PARTNER_ROW, name: 'Imperium Spa SPb' }]);
    const service = makeService(db);

    await service.update('partner-1', { name: 'Imperium Spa SPb' });

    expectTenantFilter(whereArgsOf(db), partnerSalons.tenantId, TENANT_A);
  });

  it('delete — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([{ id: 'partner-1' }]);
    const service = makeService(db);

    await service.remove('partner-1');

    expectTenantFilter(whereArgsOf(db), partnerSalons.tenantId, TENANT_A);
  });

  it('delete — 404 when row not in this tenant (no leak)', async () => {
    const db = createMockDb();
    db.queueResult([]);
    const service = makeService(db);

    await expect(service.remove('partner-x')).rejects.toThrow(NotFoundException);
  });
});

describe('WfyPartnerSalonsService · create', () => {
  it('inserts with tenantId from context (not from DTO)', async () => {
    const db = createMockDb();
    db.queueResult([PARTNER_ROW]);
    const service = makeService(db);

    await service.create({ name: 'Imperium Spa Москва' });

    const valuesCalls = db.calls.filter((c) => c.method === 'values');
    expect(valuesCalls.length).toBe(1);
    const [vals] = valuesCalls[0].args as [{ tenantId: string; name: string }];
    expect(vals.tenantId).toBe(TENANT_A);
    expect(vals.name).toBe('Imperium Spa Москва');
  });

  it('accepts logoMediaId when media belongs to same tenant', async () => {
    const db = createMockDb();
    queueMediaTenant(db, TENANT_A); // assertMediaBelongsToTenant lookup
    db.queueResult([{ ...PARTNER_ROW, logoMediaId: MEDIA_ID }]);
    const service = makeService(db);

    const out = await service.create({ name: 'Test', logoMediaId: MEDIA_ID });

    expect(out.logoMediaId).toBe(MEDIA_ID);
    expectTenantFilter(whereArgsOf(db), media.id, MEDIA_ID);
  });

  it('rejects logoMediaId with 404 MEDIA_NOT_FOUND when media is in another tenant', async () => {
    const db = createMockDb();
    queueMediaTenant(db, TENANT_B); // cross-tenant media!
    const service = makeService(db);

    await expect(
      service.create({ name: 'Test', logoMediaId: MEDIA_ID }),
    ).rejects.toMatchObject({
      response: { code: 'MEDIA_NOT_FOUND', id: MEDIA_ID },
    });
  });

  it('rejects logoMediaId with 404 MEDIA_NOT_FOUND when media does not exist', async () => {
    const db = createMockDb();
    queueMediaTenant(db, null); // empty result
    const service = makeService(db);

    await expect(
      service.create({ name: 'Test', logoMediaId: MEDIA_ID }),
    ).rejects.toMatchObject({
      response: { code: 'MEDIA_NOT_FOUND', id: MEDIA_ID },
    });
  });
});

describe('WfyPartnerSalonsService · update edge cases', () => {
  it('empty patch falls back to get() (no .set() call)', async () => {
    const db = createMockDb();
    db.queueResult([PARTNER_ROW]); // the eventual get()
    const service = makeService(db);

    await service.update('partner-1', {});

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(0);
  });

  it('throws 404 when update returning is empty (row not in tenant)', async () => {
    const db = createMockDb();
    db.queueResult([]); // update returning nothing
    const service = makeService(db);

    await expect(
      service.update('partner-x', { name: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('logoMediaId=null clears the field without media lookup', async () => {
    const db = createMockDb();
    db.queueResult([{ ...PARTNER_ROW, logoMediaId: null }]);
    const service = makeService(db);

    await service.update('partner-1', { logoMediaId: null });

    // No media table query should have happened — only the update.
    const mediaQueries = db.calls.filter(
      (c) => c.method === 'from' && c.args.length > 0 && c.args[0] === media,
    );
    expect(mediaQueries.length).toBe(0);

    // The set patch contains logoMediaId: null
    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(1);
    const [patch] = sets[0].args as [{ logoMediaId?: string | null }];
    expect(patch.logoMediaId).toBeNull();
  });

  it('logoMediaId switch — runs assertMedia before update', async () => {
    const db = createMockDb();
    queueMediaTenant(db, TENANT_A); // assertMedia lookup
    db.queueResult([{ ...PARTNER_ROW, logoMediaId: MEDIA_ID }]);
    const service = makeService(db);

    const out = await service.update('partner-1', { logoMediaId: MEDIA_ID });

    expect(out.logoMediaId).toBe(MEDIA_ID);
    expectTenantFilter(whereArgsOf(db), media.id, MEDIA_ID);
  });

  it('logoMediaId switch — 404 MEDIA_NOT_FOUND on cross-tenant', async () => {
    const db = createMockDb();
    queueMediaTenant(db, TENANT_B); // wrong tenant
    const service = makeService(db);

    await expect(
      service.update('partner-1', { logoMediaId: MEDIA_ID }),
    ).rejects.toMatchObject({
      response: { code: 'MEDIA_NOT_FOUND', id: MEDIA_ID },
    });
  });

  it('logoMediaId=undefined — field not in set patch', async () => {
    const db = createMockDb();
    db.queueResult([{ ...PARTNER_ROW, name: 'Renamed' }]);
    const service = makeService(db);

    await service.update('partner-1', { name: 'Renamed' });

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(1);
    const [patch] = sets[0].args as [{ logoMediaId?: unknown; name?: string }];
    expect('logoMediaId' in patch).toBe(false);
    expect(patch.name).toBe('Renamed');
  });
});
