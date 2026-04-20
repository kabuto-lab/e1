/**
 * API-клиент для вызовов NestJS со стороны бота.
 * Все эндпоинты, защищённые BotSecretGuard, шлются с заголовком x-bot-secret.
 */

import type { BotEnv } from './env';

export class ApiClient {
  constructor(private readonly env: BotEnv) {}

  /**
   * Потребить link-token: привязывает telegram_id к user на стороне бэка.
   * Возвращает userId и фактические TG-поля после записи.
   * Ошибки: 400 (token invalid/expired/used), 401 (x-bot-secret), 409 (tgId занят).
   */
  async consumeLinkToken(params: {
    token: string;
    telegramId: string;
    telegramUsername?: string;
    telegramLanguageCode?: string;
  }): Promise<{
    userId: string;
    telegramId: string;
    telegramUsername: string | null;
    telegramLinkedAt: string;
  }> {
    return this.post('/auth/telegram/consume', params);
  }

  /**
   * Выдать пару JWT по telegram_id. Используется, когда привязанный user хочет
   * открыть web-ЛК из бота: бот получает accessToken, возвращает ссылку с ним.
   */
  async loginByTelegramId(telegramId: string): Promise<{
    user: {
      id: string;
      role: string;
      status: string;
      telegramId: string | null;
      telegramUsername: string | null;
    };
    accessToken: string;
    refreshToken: string;
  }> {
    return this.post('/auth/telegram/login', { telegramId });
  }

  /**
   * Зарегистрировать нового TG-only клиента. Используется в /register, когда
   * пользователь без аккаунта хочет начать. role по умолчанию — client.
   */
  async registerByTelegram(params: {
    telegramId: string;
    telegramUsername?: string;
    telegramLanguageCode?: string;
    role?: 'client' | 'model';
  }): Promise<{
    user: {
      id: string;
      role: string;
      status: string;
      telegramId: string | null;
      telegramUsername: string | null;
    };
    accessToken: string;
    refreshToken: string;
  }> {
    return this.post('/auth/telegram/register', params);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(new URL(path, this.env.API_URL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': this.env.BOT_SECRET,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: any;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new ApiError(`Invalid JSON from ${path}: ${text.slice(0, 120)}`, res.status);
    }

    if (!res.ok) {
      const message = Array.isArray(json?.message) ? json.message.join('; ') : json?.message ?? res.statusText;
      throw new ApiError(message, res.status, json);
    }

    return json as T;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
