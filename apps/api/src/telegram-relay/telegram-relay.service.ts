/**
 * TelegramRelayService — анонимная переписка клиент ↔ модель/менеджер через бота.
 *
 * Токены создаются и потребляются по образцу TelegramLinkTokenService (см. auth/telegram-link-token.service.ts):
 * одноразовый hex-токен с TTL, атомарный UPDATE ... WHERE status='pending' AND expires > now() RETURNING.
 *
 * Роутинг входящих сообщений (routeIncoming) отдаёт приоритет Telegram-Reply на конкретное
 * пересланное сообщение — это единственный надёжный способ понять, какому клиенту отвечает
 * менеджер, если у него несколько параллельных активных тредов.
 */

import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { and, eq, gt, lt, desc, isNull, or } from 'drizzle-orm';
import {
  telegramRelayThreads,
  telegramRelayMessages,
  modelProfiles,
  type TelegramRelayThread,
} from '@escort/db';
import { UsersService } from '../users/users.service';
import { AntiLeakService } from '../communications/anti-leak.service';

export type RelayRole = 'client' | 'counterpart';

export interface RouteResult {
  thread: TelegramRelayThread;
  role: RelayRole;
}

export interface RouteAmbiguous {
  ambiguous: true;
  threads: TelegramRelayThread[];
}

export interface RelaySendResult {
  delivered: boolean;
  warning?: string;
  error?: 'chat_unavailable' | 'blocked_leak';
}

@Injectable()
export class TelegramRelayService {
  private readonly logger = new Logger(TelegramRelayService.name);

  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly antiLeakService: AntiLeakService,
  ) {}

  /**
   * Создать pending-тред + одноразовый contact-токен для авторизованного клиента.
   * Резолвит получателя (менеджер анкеты, иначе сама модель) — у кого есть telegramId.
   * Бросает BadRequestException, если ни у кого из них Telegram не привязан.
   */
  async createContactToken(
    modelId: string,
    clientUserId: string,
  ): Promise<{ deepLink: string | null }> {
    const counterpart = await this.resolveCounterpart(modelId);
    if (!counterpart) {
      throw new BadRequestException('Model is not reachable via Telegram right now');
    }
    const { userId: counterpartUserId, telegramId: counterpartTelegramId } = counterpart;

    const ttlSec = Number(this.configService.get<string>('TELEGRAM_CONTACT_TOKEN_TTL_SEC') ?? '900');
    // 24 байта = 48 hex-символов: с префиксом 'contact_' (8) укладывается в лимит Telegram
    // на deep-link start-параметр (64 символа) — см. https://core.telegram.org/bots/features#deep-linking.
    const token = randomBytes(24).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + ttlSec * 1000);

    await this.db.insert(telegramRelayThreads).values({
      modelId,
      clientUserId,
      counterpartUserId,
      counterpartTelegramId,
      status: 'pending',
      token,
      tokenExpiresAt,
    });

    const botUsername = this.configService.get<string>('TELEGRAM_BOT_USERNAME');
    const deepLink = botUsername ? `https://t.me/${botUsername}?start=contact_${token}` : null;
    return { deepLink };
  }

  /** Есть ли кому переслать сообщение по этой анкете (менеджер или сама модель с привязанным TG). Публичная проверка для UI — disable кнопки «Написать в Telegram». */
  async isAvailable(modelId: string): Promise<boolean> {
    return (await this.resolveCounterpart(modelId)) !== null;
  }

  /** Менеджер анкеты, иначе сама модель — у кого есть telegramId. Null, если ни у кого. */
  private async resolveCounterpart(modelId: string): Promise<{ userId: string; telegramId: bigint } | null> {
    const [profile] = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.id, modelId))
      .limit(1);
    if (!profile) return null;

    if (profile.managerId) {
      const manager = await this.usersService.findById(profile.managerId);
      if (manager?.telegramId) {
        return { userId: manager.id, telegramId: manager.telegramId };
      }
    }
    if (profile.userId) {
      const modelUser = await this.usersService.findById(profile.userId);
      if (modelUser?.telegramId) {
        return { userId: modelUser.id, telegramId: modelUser.telegramId };
      }
    }
    return null;
  }

  /**
   * Потребить contact-токен при /start contact_<token>: привязывает clientTelegramId,
   * переводит тред в 'active'. Бросает BadRequestException, если токен невалиден/просрочен/уже использован.
   */
  async consumeContactToken(
    token: string,
    clientTelegramId: bigint,
    clientTelegramUsername?: string | null,
  ): Promise<TelegramRelayThread & { modelDisplayName: string }> {
    if (!token || token.length !== 48 || !/^[a-f0-9]+$/.test(token)) {
      throw new BadRequestException('Invalid token format');
    }

    const now = new Date();
    const updated = await this.db
      .update(telegramRelayThreads)
      .set({
        clientTelegramId,
        clientTelegramUsername: clientTelegramUsername ?? null,
        status: 'active',
        token: null,
        tokenExpiresAt: null,
        lastMessageAt: now,
      })
      .where(
        and(
          eq(telegramRelayThreads.token, token),
          eq(telegramRelayThreads.status, 'pending'),
          gt(telegramRelayThreads.tokenExpiresAt, now),
        ),
      )
      .returning();

    if (!updated || updated.length === 0) {
      throw new BadRequestException('Token is invalid, expired, or already used');
    }

    void this.cleanupExpiredPending().catch((err) =>
      this.logger.warn(`cleanupExpiredPending failed: ${err?.message ?? err}`),
    );

    const thread = updated[0] as TelegramRelayThread;
    const [profile] = await this.db
      .select({ displayName: modelProfiles.displayName })
      .from(modelProfiles)
      .where(eq(modelProfiles.id, thread.modelId))
      .limit(1);

    return { ...thread, modelDisplayName: profile?.displayName ?? 'анкете' };
  }

  /** Удалить protected-мусор: pending-токены, просроченные более 7 дней назад. */
  private async cleanupExpiredPending(): Promise<void> {
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.db
      .delete(telegramRelayThreads)
      .where(and(eq(telegramRelayThreads.status, 'pending'), lt(telegramRelayThreads.tokenExpiresAt, threshold)));
  }

  /**
   * Определить, к какому активному треду относится входящее сообщение из chatId.
   * Приоритет: точный маршрут по Telegram-Reply → иначе последний активный тред с участием chatId.
   * Если активных тредов несколько и Reply не использован — возвращает { ambiguous: true, threads }.
   */
  async routeIncoming(
    chatId: bigint,
    replyToMessageId?: number,
  ): Promise<RouteResult | RouteAmbiguous | null> {
    if (replyToMessageId) {
      const [exact] = await this.db
        .select()
        .from(telegramRelayMessages)
        .where(
          and(
            eq(telegramRelayMessages.recipientTelegramId, chatId),
            eq(telegramRelayMessages.forwardedMessageId, BigInt(replyToMessageId)),
          ),
        )
        .limit(1);
      if (exact) {
        const [thread] = await this.db
          .select()
          .from(telegramRelayThreads)
          .where(and(eq(telegramRelayThreads.id, exact.threadId), eq(telegramRelayThreads.status, 'active')))
          .limit(1);
        if (thread) {
          const role: RelayRole = thread.clientTelegramId === chatId ? 'client' : 'counterpart';
          return { thread, role };
        }
      }
    }

    const threads = await this.db
      .select()
      .from(telegramRelayThreads)
      .where(
        and(
          eq(telegramRelayThreads.status, 'active'),
          or(eq(telegramRelayThreads.clientTelegramId, chatId), eq(telegramRelayThreads.counterpartTelegramId, chatId)),
        ),
      )
      .orderBy(desc(telegramRelayThreads.lastMessageAt));

    if (threads.length === 0) return null;
    if (threads.length > 1) return { ambiguous: true, threads };

    const thread = threads[0];
    const role: RelayRole = thread.clientTelegramId === chatId ? 'client' : 'counterpart';
    return { thread, role };
  }

  /**
   * Переслать сообщение через бота от senderRole к противоположной стороне треда.
   * senderPlatformRole используется только для AntiLeakService (manager/admin — без фильтра).
   */
  async relayMessage(
    bot: { api: { sendMessage: (chatId: number | string, text: string) => Promise<{ message_id: number }> } },
    thread: TelegramRelayThread,
    senderRole: RelayRole,
    text: string,
    senderPlatformRole: string,
  ): Promise<RelaySendResult> {
    const senderTelegramId = senderRole === 'client' ? thread.clientTelegramId! : thread.counterpartTelegramId;
    const recipientTelegramId = senderRole === 'client' ? thread.counterpartTelegramId : thread.clientTelegramId!;

    const scan = this.antiLeakService.sanitizeMessage(text, senderPlatformRole, false);
    if (!scan.allowed) {
      await this.db.insert(telegramRelayMessages).values({
        threadId: thread.id,
        senderTelegramId,
        recipientTelegramId,
        forwardedMessageId: null,
        content: text,
        blocked: true,
      });
      return { delivered: false, error: 'blocked_leak', warning: this.antiLeakService.getWarningMessage(scan.violations) };
    }

    const prefix = senderRole === 'client' ? '💬 Клиент' : '💬 Ответ по анкете';
    const formatted = `${prefix}:\n${scan.sanitized}`;

    try {
      const sent = await bot.api.sendMessage(Number(recipientTelegramId), formatted);
      await this.db.insert(telegramRelayMessages).values({
        threadId: thread.id,
        senderTelegramId,
        recipientTelegramId,
        forwardedMessageId: BigInt(sent.message_id),
        content: scan.sanitized,
        blocked: false,
      });
      await this.db
        .update(telegramRelayThreads)
        .set({ lastMessageAt: new Date() })
        .where(eq(telegramRelayThreads.id, thread.id));
      return { delivered: true };
    } catch (err: any) {
      this.logger.warn(`relay sendMessage failed: ${err?.message ?? err}`);
      await this.db.insert(telegramRelayMessages).values({
        threadId: thread.id,
        senderTelegramId,
        recipientTelegramId,
        forwardedMessageId: null,
        content: scan.sanitized,
        blocked: false,
      });
      return { delivered: false, error: 'chat_unavailable' };
    }
  }
}
