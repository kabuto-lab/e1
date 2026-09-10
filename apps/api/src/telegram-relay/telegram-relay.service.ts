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

import { Injectable, Inject, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { and, asc, eq, gt, lt, desc, isNull, ne, or, inArray } from 'drizzle-orm';
import {
  telegramRelayThreads,
  telegramRelayMessages,
  modelProfiles,
  employeeProfiles,
  mediaFiles,
  users,
  userTelegramAccounts,
  type TelegramRelayThread,
} from '@escort/db';
import { UsersService } from '../users/users.service';
import { AntiLeakService } from '../communications/anti-leak.service';

export type RelayRole = 'client' | 'counterpart';

export interface RouteResult {
  thread: TelegramRelayThread;
  role: RelayRole;
  /** Тред ещё не закреплён ни за кем — этому ответу нужно сперва пройти claimThreadByReply. */
  needsClaim: boolean;
}

/** chatId — кандидат команды, но тред уже закреплён за кем-то другим (пришёл слишком поздно). */
export interface RouteAlreadyClaimed {
  alreadyClaimed: true;
}

export interface RelayCandidate {
  userId: string;
  telegramId: bigint;
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
   * Резолвит кандидатов (команда анкеты, иначе сама модель) — тред создаётся «неразобранным»
   * (counterpartUserId/TelegramId = NULL), первое сообщение клиента разошлётся всем сразу
   * после активации (см. broadcastToCandidates). Бросает BadRequestException, если ни у кого
   * из кандидатов нет привязанного Telegram.
   */
  async createContactToken(
    modelId: string,
    clientUserId: string,
  ): Promise<{ deepLink: string | null }> {
    const candidates = await this.resolveCandidates(modelId);
    if (candidates.length === 0) {
      throw new BadRequestException('Model is not reachable via Telegram right now');
    }

    const ttlSec = Number(this.configService.get<string>('TELEGRAM_CONTACT_TOKEN_TTL_SEC') ?? '900');
    // 24 байта = 48 hex-символов: с префиксом 'contact_' (8) укладывается в лимит Telegram
    // на deep-link start-параметр (64 символа) — см. https://core.telegram.org/bots/features#deep-linking.
    const token = randomBytes(24).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + ttlSec * 1000);

    await this.db.insert(telegramRelayThreads).values({
      modelId,
      clientUserId,
      status: 'pending',
      token,
      tokenExpiresAt,
    });

    const botUsername = this.configService.get<string>('TELEGRAM_BOT_USERNAME');
    const deepLink = botUsername ? `https://t.me/${botUsername}?start=contact_${token}` : null;
    return { deepLink };
  }

  /** Есть ли кому переслать сообщение по этой анкете (команда менеджера или сама модель). Публичная проверка для UI — disable кнопки «Написать в Telegram». */
  async isAvailable(modelId: string): Promise<boolean> {
    return (await this.resolveCandidates(modelId)).length > 0;
  }

  /**
   * telegramId доп. рабочего слота (user_telegram_accounts) — только если он реально
   * принадлежит expectedUserId (защита на случай рассинхрона) и владелец не заблокирован.
   */
  private async getNotifiableExtraTelegramId(accountId: string, expectedUserId: string): Promise<bigint | null> {
    const [row] = await this.db
      .select({ userId: userTelegramAccounts.userId, telegramId: userTelegramAccounts.telegramId, status: users.status })
      .from(userTelegramAccounts)
      .innerJoin(users, eq(users.id, userTelegramAccounts.userId))
      .where(eq(userTelegramAccounts.id, accountId))
      .limit(1);
    if (!row || row.userId !== expectedUserId) return null;
    if (row.status === 'blacklisted' || row.status === 'suspended') return null;
    return row.telegramId;
  }

  /**
   * Кандидаты на приём обращения. Приоритет:
   *  1. Закреплённый оператор анкеты (model_profiles.operatorUserId — не только про Telegram,
   *     см. ТЗ «Логика ТГ» для исходного кейса: 40 анкет делятся 20/20 между двумя рабочими
   *     TG-аккаунтами). Если у оператора выбран конкретный доп. слот
   *     (operatorTelegramAccountId) — используем именно его; иначе основной users.telegramId
   *     оператора. Если назначен, но у него нет привязанного TG — считаем анкету недоступной
   *     (не откатываемся на broadcast, чтобы несостыковка была видна и не подменялась молча).
   *  2. Иначе — broadcast всей команде: менеджер анкеты + сотрудники его команды
   *     (employee_profiles) — у кого есть telegramId и аккаунт не заблокирован (см.
   *     UsersService.getNotifiableTelegramId).
   *  3. Если ни у кого из команды нет TG — сама модель (обратная совместимость с анкетами
   *     без менеджера/сотрудников).
   */
  async resolveCandidates(modelId: string): Promise<RelayCandidate[]> {
    const [profile] = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.id, modelId))
      .limit(1);
    if (!profile) return [];

    if (profile.operatorUserId) {
      const operatorTelegramId = profile.operatorTelegramAccountId
        ? await this.getNotifiableExtraTelegramId(profile.operatorTelegramAccountId, profile.operatorUserId)
        : await this.usersService.getNotifiableTelegramId(profile.operatorUserId);
      return operatorTelegramId ? [{ userId: profile.operatorUserId, telegramId: operatorTelegramId }] : [];
    }

    const candidates: RelayCandidate[] = [];

    if (profile.managerId) {
      const managerTelegramId = await this.usersService.getNotifiableTelegramId(profile.managerId);
      if (managerTelegramId) candidates.push({ userId: profile.managerId, telegramId: managerTelegramId });

      const employees = await this.db
        .select({ userId: employeeProfiles.userId })
        .from(employeeProfiles)
        .where(eq(employeeProfiles.managerId, profile.managerId));
      for (const e of employees as { userId: string }[]) {
        const telegramId = await this.usersService.getNotifiableTelegramId(e.userId);
        if (telegramId) candidates.push({ userId: e.userId, telegramId });
      }
    }

    if (candidates.length > 0) return candidates;

    if (profile.userId) {
      const telegramId = await this.usersService.getNotifiableTelegramId(profile.userId);
      if (telegramId) return [{ userId: profile.userId, telegramId }];
    }
    return [];
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
   * Активный тред этого клиента с ДРУГОЙ анкетой (не excludeModelId) — используется при новом
   * /start contact_<token>: если у клиента уже открыт диалог с другой моделью, бот сперва
   * спрашивает подтверждение (см. bot.service.ts, crc_/crx_), прежде чем закрывать старый тред
   * и открывать новый — иначе у клиента тихо накапливались бы параллельные активные диалоги.
   */
  async findActiveThreadForClient(
    clientTelegramId: bigint,
    excludeModelId: string,
  ): Promise<(TelegramRelayThread & { modelDisplayName: string }) | null> {
    const [row] = await this.db
      .select()
      .from(telegramRelayThreads)
      .where(
        and(
          eq(telegramRelayThreads.clientTelegramId, clientTelegramId),
          eq(telegramRelayThreads.status, 'active'),
          ne(telegramRelayThreads.modelId, excludeModelId),
        ),
      )
      .orderBy(desc(telegramRelayThreads.lastMessageAt))
      .limit(1);
    if (!row) return null;

    const [profile] = await this.db
      .select({ displayName: modelProfiles.displayName })
      .from(modelProfiles)
      .where(eq(modelProfiles.id, row.modelId))
      .limit(1);

    return { ...row, modelDisplayName: profile?.displayName ?? 'анкете' };
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
  ): Promise<RouteResult | RouteAmbiguous | RouteAlreadyClaimed | null> {
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
          if (thread.clientTelegramId === chatId) {
            return { thread, role: 'client', needsClaim: false };
          }
          if (thread.counterpartTelegramId === chatId) {
            return { thread, role: 'counterpart', needsClaim: false };
          }
          // chatId — кандидат команды, отвечающий на свою broadcast-копию.
          if (thread.counterpartUserId == null) {
            return { thread, role: 'counterpart', needsClaim: true };
          }
          return { alreadyClaimed: true };
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
    return { thread, role, needsClaim: false };
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
    if (senderRole === 'client' && thread.counterpartUserId == null) {
      return this.broadcastToCandidates(bot, thread, text, senderPlatformRole, senderLogin);
    }

    const senderTelegramId = senderRole === 'client' ? thread.clientTelegramId! : thread.counterpartTelegramId!;
    const recipientTelegramId = senderRole === 'client' ? thread.counterpartTelegramId! : thread.clientTelegramId!;

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

  /**
   * Разослать сообщение клиента всем текущим кандидатам (тред ещё не закреплён) — свежий
   * resolveCandidates на каждый вызов, чтобы новые/удалённые сотрудники учитывались сразу.
   * Каждому уходит отдельная копия с кнопкой «Завершить диалог»; кто первый ответит Reply —
   * закрепляется через claimThreadByReply.
   */
  private async broadcastToCandidates(
    bot: RelayBotApi,
    thread: TelegramRelayThread,
    text: string,
    senderPlatformRole: string,
    senderLogin?: string | null,
  ): Promise<RelaySendResult> {
    const candidates = await this.resolveCandidates(thread.modelId);
    if (candidates.length === 0) {
      return { delivered: false, error: 'chat_unavailable' };
    }

    const scan = this.antiLeakService.sanitizeMessage(text, senderPlatformRole, false);
    if (!scan.allowed) {
      await this.db.insert(telegramRelayMessages).values({
        threadId: thread.id,
        senderTelegramId: thread.clientTelegramId!,
        recipientTelegramId: candidates[0].telegramId,
        forwardedMessageId: null,
        content: text,
        blocked: true,
      });
      return { delivered: false, error: 'blocked_leak', warning: this.antiLeakService.getWarningMessage(scan.violations) };
    }

    const prefix = senderLogin ? `💬 Клиент (${senderLogin})` : '💬 Клиент';
    const formatted = `${prefix}:\n${scan.sanitized}`;

    let anyDelivered = false;
    for (const candidate of candidates) {
      try {
        const sent = await this.sendWithEndDialogButton(bot, Number(candidate.telegramId), thread.id, formatted);
        await this.db.insert(telegramRelayMessages).values({
          threadId: thread.id,
          senderTelegramId: thread.clientTelegramId!,
          recipientTelegramId: candidate.telegramId,
          forwardedMessageId: BigInt(sent.message_id),
          content: scan.sanitized,
          blocked: false,
        });
        anyDelivered = true;
      } catch (err: any) {
        this.logger.warn(`broadcast sendMessage to ${candidate.userId} failed: ${err?.message ?? err}`);
      }
    }

    await this.db
      .update(telegramRelayThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(telegramRelayThreads.id, thread.id));

    return anyDelivered ? { delivered: true } : { delivered: false, error: 'chat_unavailable' };
  }

  /** Атомарно закрепить тред за кандидатом — WHERE counterpart_user_id IS NULL гарантирует, что выигрывает только первый ответивший. */
  private async claimThread(threadId: string, userId: string, telegramId: bigint): Promise<boolean> {
    const updated = await this.db
      .update(telegramRelayThreads)
      .set({ counterpartUserId: userId, counterpartTelegramId: telegramId, claimedAt: new Date() })
      .where(and(eq(telegramRelayThreads.id, threadId), isNull(telegramRelayThreads.counterpartUserId)))
      .returning();
    return updated.length > 0;
  }

  /** Клейм по Telegram-Reply — chatId кандидата уже известен как telegramId. */
  async claimThreadByReply(threadId: string, userId: string, telegramId: bigint): Promise<boolean> {
    return this.claimThread(threadId, userId, telegramId);
  }

  /**
   * Проверка доступа к треду из веб-панели: тред должен быть по анкете команды
   * вызывающего (менеджер/сотрудник), а если у анкеты закреплён оператор
   * (model_profiles.operatorUserId) — доступ только у менеджера и у самого оператора,
   * остальным сотрудникам команды — нет (иначе «закрепление» ничего не даёт, см. ТЗ
   * «Логика ТГ», симметрично MessagesService.canAccessAsTeam).
   */
  private async assertTeamThreadAccess(threadId: string, userId: string, role: string): Promise<void> {
    const managerId = await this.getManagerIdForActor(userId, role);
    if (!managerId) {
      throw new ForbiddenException('Not allowed to access this thread');
    }

    const [thread] = await this.db
      .select({ modelId: telegramRelayThreads.modelId })
      .from(telegramRelayThreads)
      .where(eq(telegramRelayThreads.id, threadId))
      .limit(1);
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const [profile] = await this.db
      .select({ managerId: modelProfiles.managerId, operatorUserId: modelProfiles.operatorUserId })
      .from(modelProfiles)
      .where(eq(modelProfiles.id, thread.modelId))
      .limit(1);
    if (!profile || profile.managerId !== managerId) {
      throw new ForbiddenException('Not your team\'s thread');
    }
    if (profile.operatorUserId && role !== 'manager' && profile.operatorUserId !== userId) {
      throw new ForbiddenException('Not your team\'s thread');
    }
  }

  /**
   * Клейм из веб-панели («Модерация» → Telegram-обращения). Нужен привязанный Telegram —
   * иначе некуда пересылать ответы. Обязательно проверяем, что тред принадлежит команде
   * вызывающего — иначе любой менеджер/сотрудник платформы мог бы захватить чужое обращение
   * по id (thread не проверялся на принадлежность до этого фикса).
   */
  async claimThreadFromWeb(threadId: string, userId: string, role: string): Promise<void> {
    await this.assertTeamThreadAccess(threadId, userId, role);

    const telegramId = await this.usersService.getNotifiableTelegramId(userId);
    if (!telegramId) {
      throw new BadRequestException('Привяжите Telegram, чтобы взять обращение в работу');
    }
    const claimed = await this.claimThread(threadId, userId, telegramId);
    if (!claimed) {
      throw new BadRequestException('Обращение уже взято в работу другим сотрудником');
    }
  }

  /**
   * Удалить Telegram-обращение из веб-панели («Модерация» → Telegram) — каскадом сносит
   * пересланные сообщения (telegram_relay_messages). Та же проверка доступа, что и в
   * claimThreadFromWeb.
   */
  async deleteThreadFromWeb(threadId: string, userId: string, role: string): Promise<void> {
    await this.assertTeamThreadAccess(threadId, userId, role);
    await this.db.delete(telegramRelayThreads).where(eq(telegramRelayThreads.id, threadId));
  }

  /** managerId, за которым закреплён вызывающий — сам менеджер или сотрудник (employee_profiles.managerId). */
  async getManagerIdForActor(userId: string, role: string): Promise<string | null> {
    if (role === 'manager') return userId;
    if (role === 'employee') {
      const [row] = await this.db
        .select({ managerId: employeeProfiles.managerId })
        .from(employeeProfiles)
        .where(eq(employeeProfiles.userId, userId))
        .limit(1);
      return row?.managerId ?? null;
    }
    return null;
  }

  /**
   * Активные Telegram-обращения команды менеджера — для /dashboard/team-inbox.
   * Анкета с закреплённым оператором (model_profiles.operatorUserId) видна тут только
   * менеджеру и самому оператору — остальным сотрудникам команды не показывается,
   * иначе «закрепление» ничего не даёт (см. ТЗ «Логика ТГ»), симметрично MessagesService.getTeamInbox.
   */
  async getTeamInboxThreads(managerId: string, viewerId: string, viewerRole: string): Promise<
    Array<{
      threadId: string;
      model: { id: string; displayName: string; slug: string | null; availabilityStatus: string } | null;
      clientTelegramUsername: string | null;
      claimedBy: { userId: string; fullName: string | null; login: string | null } | null;
      claimedAt: Date | null;
      lastMessage: { content: string; createdAt: Date } | null;
    }>
  > {
    const allRows = await this.db
      .select({
        id: telegramRelayThreads.id,
        modelId: telegramRelayThreads.modelId,
        clientTelegramUsername: telegramRelayThreads.clientTelegramUsername,
        counterpartUserId: telegramRelayThreads.counterpartUserId,
        claimedAt: telegramRelayThreads.claimedAt,
        modelDisplayName: modelProfiles.displayName,
        modelSlug: modelProfiles.slug,
        modelAvailabilityStatus: modelProfiles.availabilityStatus,
        modelOperatorUserId: modelProfiles.operatorUserId,
      })
      .from(telegramRelayThreads)
      .innerJoin(modelProfiles, eq(modelProfiles.id, telegramRelayThreads.modelId))
      .where(and(eq(modelProfiles.managerId, managerId), eq(telegramRelayThreads.status, 'active')))
      .orderBy(desc(telegramRelayThreads.lastMessageAt));

    const rows = allRows.filter(
      (r: { modelOperatorUserId: string | null }) =>
        !r.modelOperatorUserId || viewerRole === 'manager' || r.modelOperatorUserId === viewerId,
    );
    if (rows.length === 0) return [];

    const claimerIds: string[] = Array.from(
      new Set<string>(rows.map((r: any) => r.counterpartUserId).filter((id: any): id is string => !!id)),
    );
    const claimers = claimerIds.length > 0
      ? await this.db.select({ id: users.id, login: users.login, fullName: users.fullName }).from(users).where(inArray(users.id, claimerIds))
      : [];
    const claimerMap = new Map<string, any>(claimers.map((c: any) => [c.id, c]));

    const threadIds = rows.map((r: any) => r.id);
    const msgs = await this.db
      .select({ threadId: telegramRelayMessages.threadId, content: telegramRelayMessages.content, createdAt: telegramRelayMessages.createdAt })
      .from(telegramRelayMessages)
      .where(inArray(telegramRelayMessages.threadId, threadIds))
      .orderBy(desc(telegramRelayMessages.createdAt));
    const lastMsgByThread = new Map<string, { content: string; createdAt: Date }>();
    for (const m of msgs as { threadId: string; content: string; createdAt: Date }[]) {
      if (!lastMsgByThread.has(m.threadId)) lastMsgByThread.set(m.threadId, m);
    }

    return rows.map((r: any) => {
      const claimer: any = r.counterpartUserId ? claimerMap.get(r.counterpartUserId) : null;
      return {
        threadId: r.id,
        model: { id: r.modelId, displayName: r.modelDisplayName, slug: r.modelSlug, availabilityStatus: r.modelAvailabilityStatus },
        clientTelegramUsername: r.clientTelegramUsername,
        claimedBy: claimer ? { userId: claimer.id, fullName: claimer.fullName, login: claimer.login } : null,
        claimedAt: r.claimedAt,
        lastMessage: lastMsgByThread.get(r.id) ?? null,
      };
    });
  }
}
