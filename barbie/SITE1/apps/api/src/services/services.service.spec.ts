/**
 * ServicesService — tenant-isolation invariant tests (ENTITY §2.2).
 *
 * Покрывает list / get / update. Особенный кейс — createService с salonId:
 * preflight assertSalonBelongsToTenant() тоже должен быть tenant-filtered
 * (иначе можно подсунуть чужой salonId).
 */
import { salons, services } from '@barbie-site1/db';

import { ServicesService } from './services.service';
import { createMockDb, whereArgsOf, type MockDb } from '../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';

function makeService(db: MockDb, tenantId: string | null = TENANT_A): ServicesService {
  const ctx = mockTenantContext(tenantId);
  return new ServicesService(db.asDatabase(), ctx);
}

function mockServiceRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'svc-1',
    tenantId: TENANT_A,
    salonId: null,
    name: 'X',
    slug: 'x',
    description: null,
    category: 'massage' as const,
    durationMin: 60,
    priceKopecks: 500000n,
    currency: 'RUB' as const,
    coverImageKey: null,
    status: 'active' as const,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ServicesService · tenant isolation', () => {
  it('listServices — rows + count оба tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([]); // rows
    db.queueResult([{ value: 0 }]); // count
    const service = makeService(db);

    await service.listServices({});

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, services.tenantId, TENANT_A);
  });

  it('getService — select tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([mockServiceRow()]);
    const service = makeService(db);

    await service.getService('svc-1');

    expectTenantFilter(whereArgsOf(db), services.tenantId, TENANT_A);
  });

  it('updateService — getService pre-load + update — оба tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([mockServiceRow()]); // pre-load в getService
    db.queueResult([mockServiceRow({ name: 'New' })]); // returning из update
    const service = makeService(db);

    await service.updateService('svc-1', { name: 'New' });

    expectTenantFilter(whereArgsOf(db), services.tenantId, TENANT_A);
  });

  it('createService с salonId — preflight assertSalonBelongsToTenant tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([{ id: 'salon-1' }]); // assertSalonBelongsToTenant
    db.queueResult([mockServiceRow({ salonId: 'salon-1' })]); // returning из insert
    const service = makeService(db);

    await service.createService({
      name: 'X',
      slug: 'x',
      category: 'massage',
      durationMin: 60,
      priceKopecks: '500000',
      salonId: 'salon-1',
    });

    const wheres = whereArgsOf(db);
    // Должна быть проверка `salons.tenant_id === TENANT_A` в preflight.
    expectTenantFilter(wheres, salons.tenantId, TENANT_A);
  });

  it('бросает при отсутствии tenant context', async () => {
    const db = createMockDb();
    const service = makeService(db, /* tenantId */ null);

    await expect(service.listServices({})).rejects.toThrow(/TenantContext is missing/);
    await expect(service.getService('svc-1')).rejects.toThrow(/TenantContext is missing/);
  });
});
