/**
 * Models Service - бизнес-логика работы с профилями моделей
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, like, desc, asc, count, sql } from 'drizzle-orm';
import { modelProfiles, bookings, escrowTransactions, users, type ModelProfile, type NewModelProfile } from '@escort/db';
import { UsersService } from '../users/users.service';

const LOGIN_ALPHABET = '23456789';
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

type CatalogFilters = {
  availabilityStatus?: 'offline' | 'online' | 'in_shift' | 'busy';
  verificationStatus?: 'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected';
  eliteStatus?: boolean;
  managerId?: string;
  /** Точное совпадение с physicalAttributes.city */
  city?: string;
  /** Точное совпадение с physicalAttributes.country */
  country?: string;
  ageMin?: number;
  ageMax?: number;
  /** Публичный каталог: только опубликованные. Для дашборда админа — все анкеты. */
  includeDrafts?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'rating' | 'createdAt' | 'displayName';
  order?: 'asc' | 'desc';
};

@Injectable()
export class ModelsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Клиент открыл deep-link бота по анкете (до оплаты) — уведомляем менеджера анкеты
   * (или саму модель, если менеджера нет / у него не привязан TG) в его личном Telegram.
   * Личный TG модели/менеджера клиенту не передаём — бот только пересылает уведомление.
   */
  async sendContactRequestNotification(
    modelId: string,
    clientTelegramId: string,
    clientTelegramUsername?: string,
  ): Promise<{ notified: boolean; displayName: string }> {
    const profile = await this.findById(modelId);
    if (!profile) throw new NotFoundException('Profile not found');

    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return { notified: false, displayName: profile.displayName };

    let targetTelegramId: string | null = null;
    if (profile.managerId) {
      const manager = await this.usersService.findById(profile.managerId);
      targetTelegramId = manager?.telegramId ? manager.telegramId.toString() : null;
    }
    if (!targetTelegramId && profile.userId) {
      const modelUser = await this.usersService.findById(profile.userId);
      targetTelegramId = modelUser?.telegramId ? modelUser.telegramId.toString() : null;
    }

    const adminIds = (this.configService.get<string>('TELEGRAM_ADMIN_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const recipients = targetTelegramId ? [targetTelegramId] : adminIds;
    if (recipients.length === 0) return { notified: false, displayName: profile.displayName };

    const clientTag = clientTelegramUsername ? `@${clientTelegramUsername}` : `id ${clientTelegramId}`;
    const text =
      `💬 Клиент ${clientTag} хочет пообщаться по анкете «${profile.displayName}» до оплаты.\n` +
      `Напишите ему в Telegram, чтобы ответить.`;

    await Promise.allSettled(
      recipients.map((chatId) =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        }),
      ),
    );

    return { notified: true, displayName: profile.displayName };
  }

  /** Логин для аккаунта, автосоздаваемого вместе с анкетой (см. createFullProfile). */
  private async generateModelLogin(base: string): Promise<string> {
    const cleaned = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'model';
    for (let attempt = 0; attempt < 20; attempt++) {
      const suffix = attempt === 0 ? '' : `-${Array.from({ length: 4 }, () => LOGIN_ALPHABET[Math.floor(Math.random() * LOGIN_ALPHABET.length)]).join('')}`;
      const candidate = `${cleaned}${suffix}`;
      const existing = await this.usersService.findByLogin(candidate);
      if (!existing) return candidate;
    }
    throw new Error('Failed to generate a unique login for model account');
  }

  private generateModelPassword(): string {
    return Array.from({ length: 12 }, () => PASSWORD_ALPHABET[Math.floor(Math.random() * PASSWORD_ALPHABET.length)]).join('');
  }

  /**
   * Создать профиль модели (legacy — displayName + slug only)
   */
  async createProfile(userId: string, displayName: string, slug?: string): Promise<ModelProfile> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      throw new ConflictException('Profile already exists for this user');
    }

    if (slug) {
      const existingSlug = await this.findBySlug(slug);
      if (existingSlug) {
        throw new ConflictException('This slug is already taken');
      }
    }

    const newProfiles = await this.db.insert(modelProfiles).values({
      userId,
      displayName,
      slug,
    }).returning();

    return newProfiles[0];
  }

  /**
   * Создать профиль модели со всеми полями
   */
  async createFullProfile(data: {
    displayName: string;
    slug?: string;
    biography?: string;
    physicalAttributes?: any;
    languages?: string[];
    psychotypeTags?: string[];
    rateHourly?: number;
    rateOvernight?: number;
    managerId?: string;
    userId?: string | null;
    isPublished?: boolean;
    contactMethod?: 'phone' | 'telegram' | 'email' | 'whatsapp';
    contactValue?: string;
  }): Promise<ModelProfile> {
    if (data.slug) {
      const existingSlug = await this.findBySlug(data.slug);
      if (existingSlug) {
        throw new ConflictException('This slug is already taken');
      }
    }

    const slug = data.slug || this.generateSlug(data.displayName);

    // Анкета всегда привязана к аккаунту (model_profiles.user_id NOT NULL) — если вызывающий
    // не передал существующий userId, создаём аккаунт модели тут же (логин из slug, случайный
    // пароль сохраняется plaintext в users.initial_password — иначе его негде будет посмотреть).
    let userId = data.userId ?? null;
    if (!userId) {
      const login = await this.generateModelLogin(slug);
      const password = this.generateModelPassword();
      const created = await this.usersService.createUser({
        login,
        password,
        role: 'model',
        storeInitialPasswordPlaintext: true,
      });
      userId = created.id;
    }

    // Значение "способа связи" пишем в соответствующую колонку — getContactsForUser
    // отдаёт все контактные поля разом, отдельная колонка "метод" не нужна.
    const contactColumn: Record<string, string> = {
      phone: 'contactPhone',
      telegram: 'contactTelegram',
      email: 'contactEmail',
      whatsapp: 'contactWhatsapp',
    };
    const contactFields =
      data.contactMethod && data.contactValue
        ? { [contactColumn[data.contactMethod]]: data.contactValue }
        : {};

    const newProfiles = await this.db.insert(modelProfiles).values({
      userId,
      displayName: data.displayName,
      slug,
      biography: data.biography,
      physicalAttributes: data.physicalAttributes,
      languages: data.languages,
      psychotypeTags: data.psychotypeTags,
      rateHourly: data.rateHourly?.toString(),
      rateOvernight: data.rateOvernight?.toString(),
      managerId: data.managerId,
      isPublished: data.isPublished ?? true,
      availabilityStatus: 'offline',
      verificationStatus: 'pending',
      ...contactFields,
    }).returning();

    return newProfiles[0];
  }

  private generateSlug(name: string): string {
    const translitMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ъ': '', 'ь': '',
    };
    const base = name.toLowerCase().split('').map(c => translitMap[c] || c).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  }

  /**
   * Найти профиль по ID пользователя
   */
  async findByUserId(userId: string): Promise<ModelProfile | null> {
    const found = await this.db.select().from(modelProfiles).where(eq(modelProfiles.userId, userId)).limit(1);
    return found[0] || null;
  }

  /**
   * Найти профиль по slug
   */
  async findBySlug(slug: string): Promise<ModelProfile | null> {
    const found = await this.db.select().from(modelProfiles).where(eq(modelProfiles.slug, slug)).limit(1);
    return found[0] || null;
  }

  /** Публичная карточка: только опубликовано и verified */
  async findBySlugPublic(slug: string): Promise<ModelProfile | null> {
    const found = await this.db
      .select()
      .from(modelProfiles)
      .where(
        and(
          eq(modelProfiles.slug, slug),
          eq(modelProfiles.isPublished, true),
          eq(modelProfiles.verificationStatus, 'verified'),
          sql`NOT EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${modelProfiles.userId} AND ${users.status} IN ('blacklisted', 'suspended'))`,
        ),
      )
      .limit(1);
    return found[0] || null;
  }

  /**
   * Найти профиль по ID
   */
  async findById(id: string): Promise<ModelProfile | null> {
    const found = await this.db.select().from(modelProfiles).where(eq(modelProfiles.id, id)).limit(1);
    return found[0] || null;
  }

  /** Условия WHERE, общие для getCatalog() и countCatalog() — держать в одном месте, чтобы total совпадал со списком. */
  private buildCatalogConditions(filters?: CatalogFilters): any[] {
    const conditions: any[] = [];

    if (filters?.managerId) {
      conditions.push(eq(modelProfiles.managerId, filters.managerId));
    }

    if (filters?.availabilityStatus) {
      conditions.push(eq(modelProfiles.availabilityStatus, filters.availabilityStatus));
    }

    if (filters?.verificationStatus) {
      conditions.push(eq(modelProfiles.verificationStatus, filters.verificationStatus));
    }

    if (filters?.eliteStatus === true) {
      conditions.push(eq(modelProfiles.eliteStatus, true));
    }

    if (filters?.city) {
      conditions.push(sql`${modelProfiles.physicalAttributes}->>'city' = ${filters.city}`);
    }

    if (filters?.country) {
      conditions.push(sql`${modelProfiles.physicalAttributes}->>'country' = ${filters.country}`);
    }

    if (filters?.ageMin) {
      conditions.push(sql`(${modelProfiles.physicalAttributes}->>'age')::int >= ${filters.ageMin}`);
    }

    if (filters?.ageMax) {
      conditions.push(sql`(${modelProfiles.physicalAttributes}->>'age')::int <= ${filters.ageMax}`);
    }

    const publicCatalogOnly = !filters?.managerId && !filters?.includeDrafts;
    if (publicCatalogOnly) {
      conditions.push(eq(modelProfiles.isPublished, true));
      // Гости не должны видеть анкеты до верификации (публикация ≠ verified)
      conditions.push(eq(modelProfiles.verificationStatus, 'verified'));
      // Заблокированная/приостановленная модель не должна светиться в публичном каталоге,
      // хотя её аккаунт и анкета остаются в БД (см. BlacklistService.addToBlacklist).
      conditions.push(
        sql`NOT EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${modelProfiles.userId} AND ${users.status} IN ('blacklisted', 'suspended'))`,
      );
    }

    return conditions;
  }

  /**
   * Получить каталог моделей с фильтрацией
   */
  async getCatalog(filters?: CatalogFilters): Promise<ModelProfile[]> {
    const conditions = this.buildCatalogConditions(filters);

    // Sorting
    const orderFunc = filters?.order === 'asc' ? asc : desc;
    let orderByColumn;
    switch (filters?.orderBy) {
      case 'rating':
        orderByColumn = modelProfiles.ratingReliability;
        break;
      case 'createdAt':
        orderByColumn = modelProfiles.createdAt;
        break;
      case 'displayName':
      default:
        // en_US.utf8 collation в БД сортирует регистрозависимо (сначала все имена с
        // заглавной буквы, потом все со строчной) — lower() даёт нормальный А-Я/A-Z.
        orderByColumn = sql`lower(${modelProfiles.displayName})`;
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    let qb = this.db.select().from(modelProfiles);

    if (conditions.length > 0) {
      qb = qb.where(and(...conditions));
    }

    return await qb
      .orderBy(orderFunc(orderByColumn))
      .limit(limit)
      .offset(offset);
  }

  /** Общее число моделей, подходящих под те же фильтры, что и getCatalog() (без limit/offset) — для пагинации. */
  async countCatalog(filters?: CatalogFilters): Promise<number> {
    const conditions = this.buildCatalogConditions(filters);

    let qb = this.db.select({ value: count() }).from(modelProfiles);
    if (conditions.length > 0) {
      qb = qb.where(and(...conditions));
    }

    const [row] = await qb;
    return Number(row?.value ?? 0);
  }

  /**
   * Обновить профиль модели
   */
  async updateProfile(id: string, updates: Partial<NewModelProfile>): Promise<ModelProfile> {
    const patch: Record<string, unknown> = { ...updates };
    if (Object.prototype.hasOwnProperty.call(patch, 'mainPhotoUrl') && patch.mainPhotoUrl === '') {
      patch.mainPhotoUrl = null;
    }
    const updated = await this.db.update(modelProfiles).set(patch as Partial<NewModelProfile>).where(eq(modelProfiles.id, id)).returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Profile not found');
    }

    return updated[0];
  }

  /**
   * Обновить статус доступности. nextAvailableAt — когда модель сама укажет, во сколько
   * снова свободна (только для status='offline'); если не передано — дефолт +1 час.
   */
  async updateAvailability(
    userId: string,
    status: 'offline' | 'online' | 'in_shift' | 'busy',
    nextAvailableAt?: Date | null,
  ): Promise<ModelProfile> {
    const profile = await this.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updated = await this.db.update(modelProfiles)
      .set({
        availabilityStatus: status,
        nextAvailableAt: status === 'offline' ? (nextAvailableAt ?? new Date(Date.now() + 3600000)) : null,
      })
      .where(eq(modelProfiles.userId, userId))
      .returning();

    return updated[0];
  }

  /**
   * Установить главное фото модели
   */
  async setMainPhoto(modelId: string, photoUrl: string): Promise<ModelProfile> {
    const profile = await this.findById(modelId);

    if (!profile) {
      throw new NotFoundException('Model profile not found');
    }

    const updated = await this.db.update(modelProfiles)
      .set({ mainPhotoUrl: photoUrl })
      .where(eq(modelProfiles.id, modelId))
      .returning();

    return updated[0];
  }

  /**
   * Удалить профиль
   */
  async deleteProfile(id: string): Promise<void> {
    // Брони без эскроу-транзакций (draft/declined/cancelled-до-оплаты) каскадно удалятся вместе
    // с анкетой. Брони, по которым уже шли деньги, — нет: финансовая история должна сохраниться,
    // поэтому наличие хотя бы одной такой брони блокирует удаление анкеты целиком.
    const [{ value: transactedBookings }] = await this.db
      .select({ value: count() })
      .from(bookings)
      .innerJoin(escrowTransactions, eq(escrowTransactions.bookingId, bookings.id))
      .where(eq(bookings.modelId, id));
    if (Number(transactedBookings) > 0) {
      throw new ConflictException(
        'Нельзя удалить анкету — по её броням проходили эскроу-транзакции (финансовая история должна сохраниться). Снимите анкету с публикации вместо удаления.',
      );
    }

    const deleted = await this.db.delete(modelProfiles).where(eq(modelProfiles.id, id)).returning();
    if (!deleted || deleted.length === 0) {
      throw new NotFoundException('Profile not found');
    }
  }

  /**
   * Получить статистику по всем моделям
   */
  async getStats(): Promise<{
    total: number;
    online: number;
    verified: number;
    elite: number;
  }> {
    const [row] = await this.db
      .select({
        total:    count(),
        online:   sql<number>`count(*) filter (where ${modelProfiles.availabilityStatus} = 'online')`,
        verified: sql<number>`count(*) filter (where ${modelProfiles.verificationStatus} = 'verified')`,
        elite:    sql<number>`count(*) filter (where ${modelProfiles.eliteStatus} = true)`,
      })
      .from(modelProfiles);

    return {
      total:    Number(row.total),
      online:   Number(row.online),
      verified: Number(row.verified),
      elite:    Number(row.elite),
    };
  }

  /**
   * Контакты менеджера — только если у пользователя есть funded/confirmed бронирование для этой модели
   */
  async getContactsForUser(
    slug: string,
    userId: string,
  ): Promise<{ contactTelegram: string | null; contactPhone: string | null; contactWhatsapp: string | null; contactEmail: string | null } | null> {
    const profile = await this.findBySlugPublic(slug);
    if (!profile) return null;

    // Ищем бронирование этого клиента для этой модели с нужным статусом.
    // 'completed' сюда намеренно не входит — как только встреча завершена (см. release()
    // в TbankEscrowService/TonEscrowService, который ставит booking → completed), контакты
    // больше не нужны и скрываются, даже если бронь не отменялась/не возвращалась.
    const UNLOCKED_BOOKING_STATUSES = ['escrow_funded', 'confirmed', 'in_progress'];
    const userBookings = await this.db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(and(eq(bookings.clientId, userId), eq(bookings.modelId, profile.id)))
      .limit(20);

    const hasFundedBooking = userBookings.some((b: any) =>
      UNLOCKED_BOOKING_STATUSES.includes(b.status),
    );

    // Если нет подходящего бронирования — проверяем через escrow напрямую
    if (!hasFundedBooking) {
      // Дополнительно ищем через escrow_transactions (для TON: статус funded+).
      // 'released' сюда не входит — это уже завершённая встреча (см. комментарий выше).
      const FUNDED_ESCROW = ['funded', 'hold_period', 'disputed_hold'];
      const escrows = await this.db
        .select({ status: escrowTransactions.status, bookingId: escrowTransactions.bookingId })
        .from(escrowTransactions)
        .innerJoin(bookings, eq(escrowTransactions.bookingId, bookings.id))
        .where(and(eq(bookings.clientId, userId), eq(bookings.modelId, profile.id)))
        .limit(20);

      const hasFundedEscrow = escrows.some((e: any) => FUNDED_ESCROW.includes(e.status));
      if (!hasFundedEscrow) return null;
    }

    return {
      contactTelegram: (profile as any).contactTelegram ?? null,
      contactPhone: (profile as any).contactPhone ?? null,
      contactWhatsapp: (profile as any).contactWhatsapp ?? null,
      contactEmail: (profile as any).contactEmail ?? null,
    };
  }
}
