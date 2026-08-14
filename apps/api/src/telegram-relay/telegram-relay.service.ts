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
import { and, asc, eq, gt, lt, desc, isNull, or } from 'drizzle-orm';
import {
  telegramRelayThreads,
  telegramRelayMessages,
  modelProfiles,
  mediaFiles,
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

/**
 * Клавиатура «Завершить диалог» — прикрепляется к каждому сообщению в активном relay-треде
 * (с обеих сторон), чтобы любой участник мог выйти из переписки в один клик.
 * callback_data лимит Telegram — 64 байта; 'cle_' (4) + threadId (uuid, 36) = 40, с запасом.
 */
export function buildEndDialogKeyboard(threadId: string) {
  return { inline_keyboard: [[{ text: '🚫 Завершить диалог', callback_data: `cle_${threadId}` }]] };
}

/** Минимальный интерфейс бота, нужный для отправки/редактирования сообщений с кнопкой. */
export interface RelayBotApi {
  api: {
    sendMessage: (
      chatId: number | string,
      text: string,
      other?: { reply_markup?: unknown },
    ) => Promise<{ message_id: number }>;
    editMessageReplyMarkup: (
      chatId: number | string,
      messageId: number,
      other?: { reply_markup?: unknown },
    ) => Promise<unknown>;
  };
}

@Injectable()
export class TelegramRelayService {
  private readonly logger = new Logger(TelegramRelayService.name);

  /**
   * chatId → message_id последнего отправленного в этот чат сообщения с кнопкой
   * «Завершить диалог». In-memory (не переживает рестарт процесса) — это чисто
   * визуальная подчистка старых кнопок, не влияет на маршрутизацию/бизнес-логику.
   */
  private readonly lastButtonMessage = new Map<number, number>();

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

  /**
   * Менеджер анкеты, иначе сама модель — у кого есть telegramId и аккаунт не заблокирован/приостановлен
   * (см. UsersService.getNotifiableTelegramId — заблокированный менеджер/модель не должны получать
   * relay-запросы клиентов в Telegram в обход бана). Null, если ни у кого.
   */
  private async resolveCounterpart(modelId: string): Promise<{ userId: string; telegramId: bigint } | null> {
    const [profile] = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.id, modelId))
      .limit(1);
    if (!profile) return null;

    if (profile.managerId) {
      const telegramId = await this.usersService.getNotifiableTelegramId(profile.managerId);
      if (telegramId) return { userId: profile.managerId, telegramId };
    }
    if (profile.userId) {
      const telegramId = await this.usersService.getNotifiableTelegramId(profile.userId);
      if (telegramId) return { userId: profile.userId, telegramId };
    }
    return null;
  }

  /**
   * Потребить contact-токен при /start contact_<token>: привязывает clientTelegramId,
   * но НЕ переводит тред в 'active' — остаётся 'pending' (токен уже погашен, повторно не
   * сработает), пока пользователь не пройдёт онбординг и не нажмёт «Начать» (activateThread).
   * До этого момента routeIncoming не находит тред (фильтрует только status='active') —
   * случайное сообщение в процессе онбординга никуда не пересылается.
   * Бросает BadRequestException, если токен невалиден/просрочен/уже использован.
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

  /** Тред по id — для шагов онбординга между callback-кнопками (нужен modelId). */
  async findThreadById(threadId: string): Promise<TelegramRelayThread | null> {
    const [thread] = await this.db
      .select()
      .from(telegramRelayThreads)
      .where(eq(telegramRelayThreads.id, threadId))
      .limit(1);
    return thread ?? null;
  }

  /**
   * Активировать тред после подтверждения онбординга («Начать»): только тогда routeIncoming
   * начинает принимать сообщения. Идемпотентно молчит, если тред уже не 'pending'.
   */
  async activateThread(threadId: string): Promise<(TelegramRelayThread & { modelDisplayName: string }) | null> {
    const [updated] = await this.db
      .update(telegramRelayThreads)
      .set({ status: 'active', lastMessageAt: new Date() })
      .where(and(eq(telegramRelayThreads.id, threadId), eq(telegramRelayThreads.status, 'pending')))
      .returning();
    if (!updated) return null;

    const [profile] = await this.db
      .select({ displayName: modelProfiles.displayName })
      .from(modelProfiles)
      .where(eq(modelProfiles.id, updated.modelId))
      .limit(1);

    return { ...updated, modelDisplayName: profile?.displayName ?? 'анкете' };
  }

  /** Карточка анкеты для шага онбординга (фото + имя/возраст/город) перед стартом переписки. */
  async getModelPreview(modelId: string): Promise<{
    displayName: string;
    age: number | null;
    city: string | null;
    photoUrls: string[];
  } | null> {
    const [profile] = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.id, modelId))
      .limit(1);
    if (!profile) return null;

    const attrs = (profile.physicalAttributes ?? {}) as { age?: number; city?: string };
    const extraPhotos = await this.db
      .select({ url: mediaFiles.cdnUrl })
      .from(mediaFiles)
      .where(and(eq(mediaFiles.modelId, modelId), eq(mediaFiles.fileType, 'photo'), eq(mediaFiles.isPublicVisible, true)))
      .orderBy(asc(mediaFiles.sortOrder))
      .limit(3);

    const photoUrls = [
      ...(profile.mainPhotoUrl ? [profile.mainPhotoUrl as string] : []),
      ...extraPhotos.map((p: { url: string | null }) => p.url).filter((u: string | null): u is string => !!u && u !== profile.mainPhotoUrl),
    ].slice(0, 3);

    return {
      displayName: profile.displayName,
      age: attrs.age ?? null,
      city: attrs.city ?? null,
      photoUrls,
    };
  }

  /**
   * Завершить тред по кнопке «Завершить диалог» (любая сторона). После этого routeIncoming
   * (фильтрует status='active') перестаёт находить тред — новые сообщения никуда не пересылаются.
   * Идемпотентно: повторный клик на уже закрытый тред просто вернёт null.
   */
  async closeThread(threadId: string): Promise<TelegramRelayThread | null> {
    const [updated] = await this.db
      .update(telegramRelayThreads)
      .set({ status: 'closed' })
      .where(
        and(
          eq(telegramRelayThreads.id, threadId),
          or(eq(telegramRelayThreads.status, 'active'), eq(telegramRelayThreads.status, 'pending')),
        ),
      )
      .returning();
    return updated ?? null;
  }

  /**
   * Зарегистрировать message_id как «текущее последнее сообщение с кнопкой» для chatId —
   * без отправки. Для случаев, когда сообщение с кнопкой уже отправлено/отредактировано
   * напрямую через ctx (см. bot.service.ts, экран подтверждения «Начать»).
   */
  registerButtonMessage(chatId: number, messageId: number): void {
    this.lastButtonMessage.set(chatId, messageId);
  }

  /**
   * Отправить сообщение с кнопкой «Завершить диалог», предварительно убрав кнопку
   * с предыдущего такого сообщения в этом чате — чтобы кнопка висела только на
   * последнем сообщении, а не копилась на всей истории переписки.
   */
  async sendWithEndDialogButton(
    bot: RelayBotApi,
    chatId: number,
    threadId: string,
    text: string,
  ): Promise<{ message_id: number }> {
    const prevMessageId = this.lastButtonMessage.get(chatId);
    if (prevMessageId) {
      try {
        await bot.api.editMessageReplyMarkup(chatId, prevMessageId, { reply_markup: { inline_keyboard: [] } });
      } catch {
        // Старое сообщение недоступно для редактирования (удалено/устарело) — не критично.
      }
    }
    const sent = await bot.api.sendMessage(chatId, text, { reply_markup: buildEndDialogKeyboard(threadId) });
    this.lastButtonMessage.set(chatId, sent.message_id);
    return sent;
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
   * senderLogin — логин клиента на платформе; показывается модели/менеджеру в префиксе сообщения
   * (только когда senderRole === 'client' — обратное направление остаётся анонимным по замыслу).
   */
  async relayMessage(
    bot: RelayBotApi,
    thread: TelegramRelayThread,
    senderRole: RelayRole,
    text: string,
    senderPlatformRole: string,
    senderLogin?: string | null,
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

    const prefix =
      senderRole === 'client'
        ? senderLogin
          ? `💬 Клиент (${senderLogin})`
          : '💬 Клиент'
        : '💬 Ответ по анкете';
    const formatted = `${prefix}:\n${scan.sanitized}`;

    try {
      const sent = await this.sendWithEndDialogButton(bot, Number(recipientTelegramId), thread.id, formatted);
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
