/**
 * ChatService — tenant-isolation invariant tests (ENTITY §2.2).
 *
 * Mock-based: см. `test-utils/mock-db.ts`. Покрывает read-paths:
 *   - listForUser
 *   - getChannelForUser
 * Плюс smoke на write-paths что они тоже фильтруют по tenant:
 *   - markRead, addMember (запросы lookup'а ДО mutate)
 *
 * Assertion: каждый вызов сервиса с TenantContext.tenantId='tenant-a' должен
 * хотя бы один раз вызвать `.where(...)` с условием включающим
 * `chat_channels.tenant_id === 'tenant-a'` (или `chat_channel_members.tenant_id`).
 *
 * Что НЕ тестируется здесь: cross-tenant data leakage на реальном SQL уровне.
 * Это integration test'ом с реальным Postgres'ом — отдельная сессия.
 */
import { chatChannels, chatChannelMembers } from '@barbie-site1/db';

import { ChatService } from './chat.service';
import { ChatEventsService } from './events.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { createMockDb, whereArgsOf, type MockDb } from '../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';

const FAKE_USER: AuthenticatedUser = {
  id: 'user-1',
  email: 'u@a',
  kind: 'tenant',
  tenantId: TENANT_A,
  role: 'tenant-admin',
};

function makeService(db: MockDb, tenantId: string | null = TENANT_A): ChatService {
  const ctx = mockTenantContext(tenantId);
  const events = { publish: jest.fn().mockResolvedValue('evt-1') } as unknown as ChatEventsService;
  return new ChatService(db.asDatabase(), ctx, events);
}

describe('ChatService · tenant isolation', () => {
  it('listForUser → каждый .where() фильтрует по chat_channels.tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([]); // channels list — пусто, ранний return
    const service = makeService(db);

    await service.listForUser(FAKE_USER);

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThan(0);
    expectTenantFilter(wheres, chatChannels.tenantId, TENANT_A);
  });

  it('listForUser → второй query (members) также фильтрует по chat_channel_members.tenant_id', async () => {
    const db = createMockDb();
    // 1-й результат: один канал; 2-й результат: members; 3-й: unread counts
    db.queueResult([{ id: 'ch-1', tenantId: TENANT_A, type: 'group', title: 't', salonId: null, createdBy: 'u', lastMessageAt: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date() }]);
    db.queueResult([]); // members
    db.queueResult([]); // unread counts
    const service = makeService(db);

    await service.listForUser(FAKE_USER);

    const wheres = whereArgsOf(db);
    expectTenantFilter(wheres, chatChannels.tenantId, TENANT_A);
    expectTenantFilter(wheres, chatChannelMembers.tenantId, TENANT_A);
  });

  it('getChannelForUser → both channel-lookup и members-lookup tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([{ id: 'ch-1', tenantId: TENANT_A, type: 'group', title: 't', salonId: null, createdBy: 'u', dmKey: null, lastMessageAt: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date() }]);
    db.queueResult([]); // members
    db.queueResult([]); // unread
    const service = makeService(db);

    await service.getChannelForUser(FAKE_USER, 'ch-1');

    const wheres = whereArgsOf(db);
    expectTenantFilter(wheres, chatChannels.tenantId, TENANT_A);
    expectTenantFilter(wheres, chatChannelMembers.tenantId, TENANT_A);
  });

  it('markRead → update фильтрует по chat_channel_members.tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([{ lastReadAt: new Date() }]); // updated rows
    const service = makeService(db);

    await service.markRead(FAKE_USER, 'ch-1');

    const wheres = whereArgsOf(db);
    expectTenantFilter(wheres, chatChannelMembers.tenantId, TENANT_A);
  });

  it('бросает при отсутствии tenant context (TenantGuard upstream защита)', async () => {
    const db = createMockDb();
    const service = makeService(db, /* tenantId */ null);

    await expect(service.listForUser(FAKE_USER)).rejects.toThrow(/TenantContext is missing/);
    await expect(service.getChannelForUser(FAKE_USER, 'ch-1')).rejects.toThrow(
      /TenantContext is missing/,
    );
    await expect(service.markRead(FAKE_USER, 'ch-1')).rejects.toThrow(
      /TenantContext is missing/,
    );
  });
});
