/**
 * ChatEventsService — tenant-isolation invariant tests (ENTITY §2.2).
 *
 * SSE catch-up — это read endpoint: возвращает chat_events.payload для tenant'а.
 * Если фильтр по tenant_id отсутствует, attacker мог бы получить события
 * чужого тенанта через `?since=<id>`.
 */
import { chatChannelMembers, chatEvents } from '@barbie-site1/db';

import { ChatEventsService } from './events.service';
import { createMockDb, whereArgsOf } from '../test-utils/mock-db';
import { expectTenantFilter } from '../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';

describe('ChatEventsService · tenant isolation', () => {
  it('catchUp — both member lookup AND events fetch tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([{ channelId: 'ch-1' }]); // member channels lookup
    db.queueResult([]); // events
    const service = new ChatEventsService(db.asDatabase());

    await service.catchUp(TENANT_A, 'user-1', BigInt(0));

    const wheres = whereArgsOf(db);
    expectTenantFilter(wheres, chatChannelMembers.tenantId, TENANT_A);
    expectTenantFilter(wheres, chatEvents.tenantId, TENANT_A);
  });

  it('catchUp — пустой memberRows → events fetch пропускается (short-circuit, no leak)', async () => {
    const db = createMockDb();
    db.queueResult([]); // member channels = []
    const service = new ChatEventsService(db.asDatabase());

    const result = await service.catchUp(TENANT_A, 'user-1', BigInt(0));

    expect(result).toEqual([]);
    // Только один select() call, не два — events lookup пропущен.
    const selects = db.calls.filter((c) => c.method === 'select');
    expect(selects).toHaveLength(1);
  });
});
