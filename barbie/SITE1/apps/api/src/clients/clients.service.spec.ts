/**
 * ClientsService — tenant-isolation invariant tests (ENTITY §2.2).
 *
 * Дополнительный риск: phone-uniqueness preflight (findByPhoneInternal)
 * должен быть tenant-scoped, иначе утечка факта существования клиента в другом тенанте.
 */
import { clients } from '@barbie-site1/db';

import { ClientsService } from './clients.service';
import { createMockDb, whereArgsOf, type MockDb } from '../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';

function makeService(db: MockDb, tenantId: string | null = TENANT_A): ClientsService {
  const ctx = mockTenantContext(tenantId);
  return new ClientsService(db.asDatabase(), ctx);
}

function mockClientRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cli-1',
    tenantId: TENANT_A,
    userId: null,
    name: 'X',
    phone: '+71234567890',
    email: null,
    birthdate: null,
    notes: null,
    tags: [],
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ClientsService · tenant isolation', () => {
  it('listClients — rows + count оба tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([]); // rows
    db.queueResult([{ value: 0 }]); // count
    const service = makeService(db);

    await service.listClients({});

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, clients.tenantId, TENANT_A);
  });

  it('getClient — select tenant-filtered (включая notes/PII)', async () => {
    const db = createMockDb();
    db.queueResult([mockClientRow({ notes: 'sensitive' })]);
    const service = makeService(db);

    await service.getClient('cli-1');

    expectTenantFilter(whereArgsOf(db), clients.tenantId, TENANT_A);
  });

  it('createClient — phone-uniqueness preflight tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([]); // findByPhoneInternal — никого нет
    db.queueResult([mockClientRow()]); // returning из insert
    const service = makeService(db);

    await service.createClient({
      name: 'X',
      phone: '+71234567890',
    });

    // Critical: preflight phone-lookup ДОЛЖЕН быть tenant-filtered.
    // Иначе при наличии того же phone у другого тенанта мы вернём 409 и утечём существование.
    expectTenantFilter(whereArgsOf(db), clients.tenantId, TENANT_A);
  });

  it('updateClient — pre-load + update — оба tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([mockClientRow()]); // pre-load
    db.queueResult([mockClientRow({ name: 'New' })]); // returning
    const service = makeService(db);

    await service.updateClient('cli-1', { name: 'New' });

    expectTenantFilter(whereArgsOf(db), clients.tenantId, TENANT_A);
  });

  it('бросает при отсутствии tenant context', async () => {
    const db = createMockDb();
    const service = makeService(db, /* tenantId */ null);

    await expect(service.listClients({})).rejects.toThrow(/TenantContext is missing/);
    await expect(service.getClient('cli-1')).rejects.toThrow(/TenantContext is missing/);
  });
});
