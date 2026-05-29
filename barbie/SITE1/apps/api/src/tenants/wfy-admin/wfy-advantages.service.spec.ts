/**
 * WfyAdvantagesService — tenant-isolation tests.
 *
 * Mock-DB unit spec. Verifies:
 *   - every read/write path includes `eq(wfyAdvantages.tenantId, ctx.tenantId)`
 *   - update with empty patch falls back to get() (no .set() call)
 *   - delete returning empty → 404 (cross-tenant pretends not-found)
 *   - create reads tenantId from context (not DTO)
 *
 * Site-type capability (site_type='wfy-city-dir') is enforced by
 * WfyTenantCapabilityGuard — its tests live in
 * wfy-tenant-capability.guard.spec.ts (Track D.7).
 */
import { NotFoundException } from '@nestjs/common';

import { wfyAdvantages } from '@barbie-site1/db';

import { WfyAdvantagesService } from './wfy-advantages.service';
import { createMockDb, whereArgsOf } from '../../test-utils/mock-db';
import type { MockDb } from '../../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';
const ADV_ROW = {
  id: 'adv-1',
  tenantId: TENANT_A,
  title: 'Стабильный доход',
  description: null,
  iconName: null,
  ord: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeService(db: MockDb, tenantId: string | null = TENANT_A): WfyAdvantagesService {
  return new WfyAdvantagesService(db.asDatabase(), mockTenantContext(tenantId));
}

describe('WfyAdvantagesService · tenant isolation', () => {
  it('list — both queries filter by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([]);
    db.queueResult([{ value: 0 }]);
    const service = makeService(db);

    await service.list({});

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, wfyAdvantages.tenantId, TENANT_A);
  });

  it('get — select filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([ADV_ROW]);
    const service = makeService(db);

    await service.get('adv-1');

    expectTenantFilter(whereArgsOf(db), wfyAdvantages.tenantId, TENANT_A);
  });

  it('get — 404 when row not in this tenant', async () => {
    const db = createMockDb();
    db.queueResult([]);
    const service = makeService(db);

    await expect(service.get('adv-x')).rejects.toThrow(NotFoundException);
  });

  it('update — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([{ ...ADV_ROW, title: 'Updated' }]);
    const service = makeService(db);

    await service.update('adv-1', { title: 'Updated' });

    expectTenantFilter(whereArgsOf(db), wfyAdvantages.tenantId, TENANT_A);
  });

  it('delete — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([{ id: 'adv-1' }]);
    const service = makeService(db);

    await service.remove('adv-1');

    expectTenantFilter(whereArgsOf(db), wfyAdvantages.tenantId, TENANT_A);
  });

  it('delete — 404 when row not in this tenant', async () => {
    const db = createMockDb();
    db.queueResult([]);
    const service = makeService(db);

    await expect(service.remove('adv-x')).rejects.toThrow(NotFoundException);
  });
});

describe('WfyAdvantagesService · create', () => {
  it('inserts with tenantId from context (not from DTO)', async () => {
    const db = createMockDb();
    db.queueResult([ADV_ROW]);
    const service = makeService(db);

    await service.create({ title: 'Стабильный доход' });

    const valuesCalls = db.calls.filter((c) => c.method === 'values');
    expect(valuesCalls.length).toBe(1);
    const [vals] = valuesCalls[0].args as [{ tenantId: string; title: string }];
    expect(vals.tenantId).toBe(TENANT_A);
    expect(vals.title).toBe('Стабильный доход');
  });

  it('persists iconName when provided', async () => {
    const db = createMockDb();
    db.queueResult([{ ...ADV_ROW, iconName: 'wallet' }]);
    const service = makeService(db);

    const out = await service.create({ title: 'Test', iconName: 'wallet' });

    expect(out.iconName).toBe('wallet');
    const [vals] = db.calls.find((c) => c.method === 'values')!.args as [{ iconName?: string }];
    expect(vals.iconName).toBe('wallet');
  });
});

describe('WfyAdvantagesService · update edge cases', () => {
  it('empty patch falls back to get() (no .set() call)', async () => {
    const db = createMockDb();
    db.queueResult([ADV_ROW]); // the eventual get()
    const service = makeService(db);

    await service.update('adv-1', {});

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(0);
  });

  it('throws 404 when update returning is empty', async () => {
    const db = createMockDb();
    db.queueResult([]);
    const service = makeService(db);

    await expect(
      service.update('adv-x', { title: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('iconName=null clears the field', async () => {
    const db = createMockDb();
    db.queueResult([{ ...ADV_ROW, iconName: null }]);
    const service = makeService(db);

    await service.update('adv-1', { iconName: null });

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(1);
    const [patch] = sets[0].args as [{ iconName?: string | null }];
    expect(patch.iconName).toBeNull();
  });

  it('iconName=undefined — field not in set patch', async () => {
    const db = createMockDb();
    db.queueResult([{ ...ADV_ROW, title: 'Renamed' }]);
    const service = makeService(db);

    await service.update('adv-1', { title: 'Renamed' });

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(1);
    const [patch] = sets[0].args as [{ iconName?: unknown; title?: string }];
    expect('iconName' in patch).toBe(false);
    expect(patch.title).toBe('Renamed');
  });
});
