/**
 * StaffService — tenant-isolation invariant tests (ENTITY §2.2).
 *
 * Покрывает list / get + staff_services M2M join. Особенный риск: при getStaff
 * вторичный запрос в staff_services должен тоже быть tenant-filtered
 * (иначе можно собрать кросс-тенантный mapping staff↔service).
 */
import { staff, staffServices } from '@barbie-site1/db';

import { StaffService } from './staff.service';
import { createMockDb, whereArgsOf, type MockDb } from '../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';

function makeService(db: MockDb, tenantId: string | null = TENANT_A): StaffService {
  const ctx = mockTenantContext(tenantId);
  return new StaffService(db.asDatabase(), ctx);
}

function mockStaffRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'st-1',
    tenantId: TENANT_A,
    salonId: 'salon-1',
    userId: null,
    name: 'X',
    bio: null,
    photoKey: null,
    specialties: [],
    schedule: {
      weekly: { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
    },
    status: 'active' as const,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('StaffService · tenant isolation', () => {
  it('listStaff — rows + count оба tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([]); // rows
    db.queueResult([{ value: 0 }]); // count
    const service = makeService(db);

    await service.listStaff({});

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, staff.tenantId, TENANT_A);
  });

  it('getStaff — staff select + staff_services join — оба tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([mockStaffRow()]); // staff
    db.queueResult([{ serviceId: 'svc-1' }]); // staff_services
    const service = makeService(db);

    await service.getStaff('st-1');

    const wheres = whereArgsOf(db);
    expectTenantFilter(wheres, staff.tenantId, TENANT_A);
    // Critical: staff_services join тоже должен фильтроваться.
    expectTenantFilter(wheres, staffServices.tenantId, TENANT_A);
  });

  it('бросает при отсутствии tenant context', async () => {
    const db = createMockDb();
    const service = makeService(db, /* tenantId */ null);

    await expect(service.listStaff({})).rejects.toThrow(/TenantContext is missing/);
    await expect(service.getStaff('st-1')).rejects.toThrow(/TenantContext is missing/);
  });
});
