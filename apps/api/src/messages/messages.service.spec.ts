import { ConfigService } from '@nestjs/config';
import { conversations, modelProfiles, users } from '@escort/db';
import { MessagesService } from './messages.service';

function setup() {
  const tgNotify = { notifyNewClientMessage: jest.fn().mockResolvedValue(undefined) };
  const relay = { resolveCandidates: jest.fn().mockResolvedValue([{ userId: 'operator', telegramId: 222n }]) };
  const history: any[] = [{ id: 'old-message', senderId: 'client' }];
  const db = {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockImplementation((message: any) => ({
        returning: async () => {
          const row = { ...message, id: `message-${history.length}`, createdAt: new Date() };
          history.push(row);
          return [row];
        },
      })),
    }),
    update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockImplementation((table) => ({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockImplementation(async () => {
            if (table === conversations) return [{ modelId: 'model' }];
            if (table === modelProfiles) return [{ displayName: 'Anna_test' }];
            if (table === users) return [{ fullName: 'Клиент', role: 'client' }];
            return [];
          }),
        }),
      })),
    }),
  };
  const service = new MessagesService(
    db, { sanitizeMessage: (content: string) => ({ allowed: true, sanitized: content }) } as any,
    tgNotify as any, new ConfigService({ FRONTEND_URL: 'https://mymuseclub.com' }), {} as any, relay as any,
  );
  jest.spyOn(service as any, 'assertCanAccess').mockResolvedValue(undefined);
  return { service, tgNotify, relay };
}

describe('Platform message Telegram notifications', () => {
  it('notifies the assigned operator for repeat client messages in an existing conversation', async () => {
    const { service, tgNotify, relay } = setup();
    await Promise.all([
      service.saveMessage('conversation', 'client', 'client', 'Здравствуйте'),
      service.saveMessage('conversation', 'client', 'client', 'Есть свободное время?'),
    ]);
    await new Promise((resolve) => setImmediate(resolve));
    expect(relay.resolveCandidates).toHaveBeenCalledWith('model');
    expect(tgNotify.notifyNewClientMessage).toHaveBeenCalledTimes(2);
    expect(tgNotify.notifyNewClientMessage).toHaveBeenCalledWith(222n, 'Anna_test', 'https://mymuseclub.com/dashboard/team-inbox');
  });

  it('does not notify operators about their own replies', async () => {
    const { service, tgNotify } = setup();
    await service.saveMessage('conversation', 'operator', 'employee', 'Здравствуйте');
    await new Promise((resolve) => setImmediate(resolve));
    expect(tgNotify.notifyNewClientMessage).not.toHaveBeenCalled();
  });

  it('keeps a client message saved if recipient lookup fails', async () => {
    const { service, relay, tgNotify } = setup();
    relay.resolveCandidates.mockRejectedValue(new Error('lookup unavailable'));
    await expect(service.saveMessage('conversation', 'client', 'client', 'Здравствуйте')).resolves.toMatchObject({ content: 'Здравствуйте' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(tgNotify.notifyNewClientMessage).not.toHaveBeenCalled();
  });
});
