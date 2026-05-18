/**
 * MessagesService — tenant-isolation invariant tests (ENTITY §2.2).
 *
 * Покрывает read-path (list) и smoke check write-paths (update/remove
 * читают существующее сообщение — это тоже cross-tenant attack vector).
 */
import { chatMessages, chatChannelMembers, chatChannels } from '@barbie-site1/db';

import { MessagesService } from './messages.service';
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

function makeService(db: MockDb, tenantId: string | null = TENANT_A): MessagesService {
  const ctx = mockTenantContext(tenantId);
  const events = { publish: jest.fn().mockResolvedValue('evt-1') } as unknown as ChatEventsService;
  return new MessagesService(db.asDatabase(), ctx, events);
}

describe('MessagesService · tenant isolation', () => {
  it('list → membership-check и messages-select оба tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([{ userId: 'user-1' }]); // assertMember lookup
    db.queueResult([]); // messages
    const service = makeService(db);

    await service.list(FAKE_USER, 'ch-1', { limit: 50 });

    const wheres = whereArgsOf(db);
    expectTenantFilter(wheres, chatChannelMembers.tenantId, TENANT_A);
    expectTenantFilter(wheres, chatMessages.tenantId, TENANT_A);
  });

  it('list с ?before — pivot lookup тоже tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([{ userId: 'user-1' }]); // assertMember
    db.queueResult([{ createdAt: new Date('2026-01-01') }]); // pivot
    db.queueResult([]); // messages
    const service = makeService(db);

    await service.list(FAKE_USER, 'ch-1', { before: 'msg-pivot' });

    const wheres = whereArgsOf(db);
    expectTenantFilter(wheres, chatMessages.tenantId, TENANT_A);
  });

  it('update — pre-load + assertChannelOpen + update — все три tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([
      {
        id: 'msg-1',
        tenantId: TENANT_A,
        channelId: 'ch-1',
        authorUserId: 'user-1',
        body: 'hi',
        attachments: [],
        replyToMessageId: null,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date(),
      },
    ]);
    db.queueResult([{ archivedAt: null }]); // assertChannelOpen
    db.queueResult([
      {
        id: 'msg-1',
        tenantId: TENANT_A,
        channelId: 'ch-1',
        authorUserId: 'user-1',
        body: 'edited',
        attachments: [],
        replyToMessageId: null,
        editedAt: new Date(),
        deletedAt: null,
        createdAt: new Date(),
      },
    ]); // update
    const service = makeService(db);

    await service.update(FAKE_USER, 'msg-1', { body: 'edited' });

    const wheres = whereArgsOf(db);
    expectTenantFilter(wheres, chatMessages.tenantId, TENANT_A);
    expectTenantFilter(wheres, chatChannels.tenantId, TENANT_A);
  });

  it('бросает при отсутствии tenant context', async () => {
    const db = createMockDb();
    const service = makeService(db, /* tenantId */ null);

    await expect(service.list(FAKE_USER, 'ch-1', {})).rejects.toThrow(
      /TenantContext is missing/,
    );
  });
});
