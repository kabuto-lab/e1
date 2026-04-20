/**
 * TelegramLinkTokenService — web-first линковка Telegram-идентичности (§Q2).
 *
 * Flow:
 *   1. Авторизованный пользователь (web) → POST /auth/telegram/link-token.
 *      Сервис создаёт одноразовый токен, возвращает deep-link t.me/<bot>?start=link_<token>.
 *   2. Бот получает /start link_<token> → POST /auth/telegram/consume с
 *      заголовком x-bot-secret и телом { token, telegramId, username?, languageCode? }.
 *   3. Сервис проверяет: token существует, не consumed, не expired — атомарно
 *      помечает consumed и возвращает userId. UsersService.linkTelegramIdentity
 *      уже довешивает tg-поля на user.
 *
 * Cleanup: lazy — при каждом consume чистим expired-токены старше 7 дней (дёшево,
 * один DELETE по индексу expires_at). Batch-job не добавляем (§Q6).
 */

import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { telegramLinkTokens } from '@escort/db';

@Injectable()
export class TelegramLinkTokenService {
  private readonly logger = new Logger(TelegramLinkTokenService.name);

  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Создать одноразовый link-token для userId.
   * Возвращает токен, expiresAt и deep-link (если TELEGRAM_BOT_USERNAME задан).
   */
  async createLinkToken(userId: string): Promise<{
    token: string;
    expiresAt: Date;
    deepLink: string | null;
  }> {
    const ttlSec = Number(this.configService.get<string>('TELEGRAM_LINK_TOKEN_TTL_SEC') ?? '300');
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlSec * 1000);

    await this.db.insert(telegramLinkTokens).values({
      userId,
      token,
      expiresAt,
    });

    const botUsername = this.configService.get<string>('TELEGRAM_BOT_USERNAME');
    const deepLink = botUsername ? `https://t.me/${botUsername}?start=link_${token}` : null;

    return { token, expiresAt, deepLink };
  }

  /**
   * Потребить токен: проверяет существование, consumed, expiry; атомарно помечает consumed.
   * Возвращает userId, которому принадлежит токен. Одновременно вычищает старый мусор.
   *
   * Атомарность: UPDATE … WHERE consumed_at IS NULL AND expires_at > now() RETURNING user_id.
   * Если строк не вернулось — или уже consumed, или просрочен, или не существует → 400.
   */
  async consumeToken(token: string): Promise<{ userId: string }> {
    if (!token || token.length !== 64 || !/^[a-f0-9]+$/.test(token)) {
      throw new BadRequestException('Invalid token format');
    }

    const now = new Date();
    const updated = await this.db
      .update(telegramLinkTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(telegramLinkTokens.token, token),
          isNull(telegramLinkTokens.consumedAt),
          gt(telegramLinkTokens.expiresAt, now),
        ),
      )
      .returning({ userId: telegramLinkTokens.userId });

    if (!updated || updated.length === 0) {
      throw new BadRequestException('Token is invalid, expired, or already used');
    }

    // Lazy cleanup: удалить всё, что истекло более 7 дней назад.
    void this.cleanupExpired().catch((err) =>
      this.logger.warn(`cleanupExpired failed: ${err?.message ?? err}`),
    );

    return { userId: updated[0].userId };
  }

  /**
   * Удалить link-tokens старше 7 дней (expires_at < now - 7d).
   * Consumed токены старше 7 дней тоже уходят — аудит линковки хранится в users.telegram_linked_at.
   */
  private async cleanupExpired(): Promise<void> {
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.db
      .delete(telegramLinkTokens)
      .where(lt(telegramLinkTokens.expiresAt, threshold));
  }
}
