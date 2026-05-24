/**
 * SalonsService — tenant-isolation invariant tests (ENTITY §2.2).
 *
 * Покрывает read-path (list, get) и update-path. Mock-based: проверяем что
 * каждый запрос содержит .where() с фильтром по `salons.tenantId === currentTenantId`.
 * Семантика SQL не проверяется — для этого нужен integration test с реальной Postgres.
 */
import { salons } from '@barbie-site1/db';

import { SalonsService } from './salons.service';
import { createMockDb, whereArgsOf, type MockDb } from '../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';

function makeService(db: MockDb, tenantId: string | null = TENANT_A): SalonsService {
  const ctx = mockTenantContext(tenantId);
  return new SalonsService(db.asDatabase(), ctx);
}

describe('SalonsService · tenant isolation', () => {
  it('listSalons — оба запроса (rows + count) tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([]); // rows
    db.queueResult([{ value: 0 }]); // count
    const service = makeService(db);

    await service.listSalons({});

    const wheres = whereArgsOf(db);
    // Должно быть как минимум 2 .where() — для select rows и для count.
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, salons.tenantId, TENANT_A);
  });

  it('getSalon — select tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([
      {
        id: 'salon-1',
        tenantId: TENANT_A,
        name: 'X',
        slug: 'x',
        address: 'A',
        city: 'C',
        region: null,
        country: 'RU',
        postalCode: null,
        geoLat: null,
        geoLng: null,
        phone: null,
        email: null,
        workingHours: {},
        status: 'active',
        coverImageKey: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const service = makeService(db);

    await service.getSalon('salon-1');

    expectTenantFilter(whereArgsOf(db), salons.tenantId, TENANT_A);
  });

  it('updateSalon — both pre-load и update — tenant-filtered', async () => {
    const db = createMockDb();
    // updateSalon под капотом не делает pre-load (только обращается напрямую к update),
    // но потом может пасть на pустое и пойти в getSalon. Очередь: 1 — updated row.
    db.queueResult([
      {
        id: 'salon-1',
        tenantId: TENANT_A,
        name: 'New',
        slug: 'x',
        address: 'A',
        city: 'C',
        region: null,
        country: 'RU',
        postalCode: null,
        geoLat: null,
        geoLng: null,
        phone: null,
        email: null,
        workingHours: {},
        status: 'active',
        coverImageKey: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const service = makeService(db);

    await service.updateSalon('salon-1', { name: 'New' });

    expectTenantFilter(whereArgsOf(db), salons.tenantId, TENANT_A);
  });

  it('бросает при отсутствии tenant context', async () => {
    const db = createMockDb();
    const service = makeService(db, /* tenantId */ null);

    await expect(service.listSalons({})).rejects.toThrow(/TenantContext is missing/);
    await expect(service.getSalon('salon-1')).rejects.toThrow(/TenantContext is missing/);
  });
});
