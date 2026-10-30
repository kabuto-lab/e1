import { ConfigService } from '@nestjs/config';
import { TelegramNotifyService } from './telegram-notify.service';
import { requestTelegramApi } from './telegram-http.util';

jest.mock('./telegram-http.util', () => ({ requestTelegramApi: jest.fn() }));

describe('TelegramNotifyService', () => {
  const requestMock = requestTelegramApi as jest.Mock;
  let service: TelegramNotifyService;

  beforeEach(() => {
    requestMock.mockReset().mockResolvedValue({ status: 200, body: '{"ok":true}' });
    service = new TelegramNotifyService(new ConfigService({
      TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_NOTIFY_CHANNEL_ID: '-100123',
    }));
  });

  it('safely formats model names and links with markup characters', async () => {
    await service.notifyNewClientMessage(222n, 'Anna_test <VIP> & Co', 'https://mymuseclub.com/dashboard/team-inbox?a=1&b="test"');
    const body = requestMock.mock.calls[0][2];
    expect(body.chat_id).toBe('222');
    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain('Anna_test &lt;VIP&gt; &amp; Co');
    expect(body.text).toContain('href="https://mymuseclub.com/dashboard/team-inbox?a=1&amp;b=&quot;test&quot;"');
    expect(requestMock.mock.calls[0].slice(0, 2)).toEqual(['test-token', 'sendMessage']);
  });

  it('escapes guest contact details and does not duplicate Telegram recipients', async () => {
    await service.notifyMany([222n, null, 222n], {
      event: 'booking_requested', bookingId: 'booking-id', note: 'Гость: <Иван> @client_test',
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock.mock.calls[0][2].text).toContain('Гость: &lt;Иван&gt; @client_test');
  });

  it('sends booking alerts to the configured group', async () => {
    await service.notifyNewBookingRequest('Anna_test', 'https://mymuseclub.com/dashboard/bookings/booking-id');
    expect(requestMock.mock.calls[0][2]).toMatchObject({ chat_id: '-100123', parse_mode: 'HTML' });
  });
});
