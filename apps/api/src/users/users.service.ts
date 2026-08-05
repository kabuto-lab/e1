/**
 * Users Service - бизнес-логика работы с пользователями
 */

import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, count, sql, inArray, or, ilike } from 'drizzle-orm';
import { users, modelProfiles, bookings, escrowTransactions, type User, type NewUser } from '@escort/db';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  /**
   * Создать нового пользователя (веб-регистрация: login+password обязательны).
   * Каждому новому пользователю выдаётся recoveryCode (для сверки при обращении в поддержку).
   */
  async createUser(params: {
    login: string;
    password: string;
    role?: 'client' | 'model' | 'admin' | 'manager' | 'moderator';
    fullName?: string;
    phone?: string;
    email?: string;
    /**
     * Сохранить пароль ещё и plaintext-полем (initial_password). Только для аккаунтов,
     * которые создаёт менеджер/админ ЗА другого человека (модель не задавала пароль сама
     * и иначе не сможет его посмотреть — password_hash необратим). НЕ включать для
     * self-service регистрации, где пароль знает только сам пользователь.
     */
    storeInitialPasswordPlaintext?: boolean;
  }): Promise<User> {
    const { password, role = 'client', fullName, email } = params;
    const login = params.login.trim();

    const existingLogin = await this.findByLogin(login);
    if (existingLogin) {
      throw new ConflictException('User with this login already exists');
    }

    let normalizedPhone: string | null = null;
    let phoneHash: string | null = null;
    if (params.phone) {
      normalizedPhone = params.phone.trim().replace(/\s/g, '');
      const existingPhone = await this.findByPhone(normalizedPhone);
      if (existingPhone) {
        throw new ConflictException('User with this phone already exists');
      }
      phoneHash = createHash('sha256').update(normalizedPhone).digest('hex');
    }

    if (email) {
      const existingEmail = await this.findByEmail(email);
      if (existingEmail) throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const emailHash = email
      ? createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
      : null;
    const recoveryCode = await this.generateUniqueRecoveryCode();
    // Менеджер ждёт одобрения admin'ом (см. ManagersService.approve/reject) —
    // до этого не должен считаться активным/верифицированным.
    const status = role === 'manager' ? 'pending_verification' : 'active';

    const newUsers = await this.db.insert(users).values({
      login,
      recoveryCode,
      ...(normalizedPhone ? { phone: normalizedPhone, phoneHash } : {}),
      ...(emailHash ? { emailHash, email: email!.toLowerCase().trim() } : {}),
      passwordHash,
      role,
      status,
      ...(fullName ? { fullName } : {}),
      ...(params.storeInitialPasswordPlaintext ? { initialPassword: password } : {}),
    }).returning();

    return newUsers[0];
  }

  /**
   * Найти пользователя по email
   */
  async findByEmail(email: string): Promise<User | null> {
    const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
    const foundUsers = await this.db.select().from(users).where(eq(users.emailHash, emailHash)).limit(1);
    const user = foundUsers[0] || null;

    // Backfill plain email for users that predate the email column
    if (user && !user.email) {
      await this.db
        .update(users)
        .set({ email: email.toLowerCase().trim() })
        .where(eq(users.id, user.id));
      user.email = email.toLowerCase().trim();
    }

    return user;
  }

  /**
   * Найти пользователя по login (сравнение регистронезависимое, см. users_login_unique_nonnull).
   */
  async findByLogin(login: string): Promise<User | null> {
    const found = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.login}) = lower(${login.trim()})`)
      .limit(1);
    return found[0] || null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const normalized = phone.trim().replace(/\s/g, '');
    const phoneHash = createHash('sha256').update(normalized).digest('hex');
    const found = await this.db.select().from(users).where(eq(users.phoneHash, phoneHash)).limit(1);
    return found[0] || null;
  }

  /**
   * Найти пользователя по ID
   */
  async findById(id: string): Promise<User | null> {
    const foundUsers = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return foundUsers[0] || null;
  }

  async updateFullName(id: string, fullName: string | null): Promise<void> {
    await this.db.update(users).set({ fullName }).where(eq(users.id, id));
  }

  /** Пустое/null — сбросить телефон; иначе normalize+hash+проверка на конфликт с ДРУГИМ юзером. */
  async updatePhone(id: string, phone: string | null): Promise<void> {
    if (!phone) {
      await this.db.update(users).set({ phone: null, phoneHash: null }).where(eq(users.id, id));
      return;
    }
    const normalized = phone.trim().replace(/\s/g, '');
    const existing = await this.findByPhone(normalized);
    if (existing && existing.id !== id) {
      throw new ConflictException('User with this phone already exists');
    }
    const phoneHash = createHash('sha256').update(normalized).digest('hex');
    await this.db.update(users).set({ phone: normalized, phoneHash }).where(eq(users.id, id));
  }

  /** Пустое/null — сбросить email; иначе normalize+hash+проверка на конфликт с ДРУГИМ юзером. */
  async updateEmail(id: string, email: string | null): Promise<void> {
    if (!email) {
      await this.db.update(users).set({ email: null, emailHash: null }).where(eq(users.id, id));
      return;
    }
    const normalized = email.toLowerCase().trim();
    const existing = await this.findByEmail(normalized);
    if (existing && existing.id !== id) {
      throw new ConflictException('User with this email already exists');
    }
    const emailHash = createHash('sha256').update(normalized).digest('hex');
    await this.db.update(users).set({ email: normalized, emailHash }).where(eq(users.id, id));
  }

  /**
   * Проверка пароля.
   * У TG-only клиентов password_hash = NULL (identity через telegram_id) — такой user
   * не может логиниться по email+password, всегда false.
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * Обновить lastLogin
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
  }

  /**
   * Получить всех пользователей (для админа)
   */
  async findAll(limit = 50, offset = 0, role?: User['role']): Promise<User[]> {
    const query = this.db.select().from(users).limit(limit).offset(offset);
    return role ? query.where(eq(users.role, role)) : query;
  }

  /**
   * telegramId получателя для бот-уведомлений — null, если Telegram не привязан ИЛИ аккаунт
   * заблокирован/приостановлен (см. BlacklistService). Единая точка, чтобы заблокированный
   * менеджер/модель/клиент не продолжали получать сообщения в личный Telegram в обход бана.
   */
  async getNotifiableTelegramId(userId: string): Promise<bigint | null> {
    const user = await this.findById(userId);
    if (!user?.telegramId) return null;
    if (user.status === 'blacklisted' || user.status === 'suspended') return null;
    return user.telegramId;
  }

  /**
   * Узкая выборка для UI блокировки (доступна moderator, в отличие от полного findAll/UsersController.findAll,
   * который отдаёт recoveryCode/initialPassword — admin only). Только client/model/manager, минимум полей.
   */
  async searchBlockable(query?: string, limit = 20): Promise<Array<Pick<User, 'id' | 'login' | 'email' | 'role' | 'status'>>> {
    const conditions: any[] = [inArray(users.role, ['client', 'model', 'manager'])];
    if (query?.trim()) {
      const q = `%${query.trim()}%`;
      conditions.push(or(ilike(users.login, q), ilike(users.email, q)));
    }
    return this.db
      .select({ id: users.id, login: users.login, email: users.email, role: users.role, status: users.status })
      .from(users)
      .where(and(...conditions))
      .limit(limit);
  }

  /**
   * Все менеджеры — для группировки моделей по менеджеру на странице «Пользователи → Доли»
   * (доступна admin/moderator, минимум полей, как searchBlockable).
   */
  async listManagers(): Promise<Array<Pick<User, 'id' | 'login' | 'email'>>> {
    return this.db
      .select({ id: users.id, login: users.login, email: users.email })
      .from(users)
      .where(eq(users.role, 'manager'))
      .limit(500);
  }

  /**
   * Обновить статус пользователя
   */
  async updateStatus(id: string, status: User['status']): Promise<User> {
    const updated = await this.db.update(users).set({ status }).where(eq(users.id, id)).returning();
    
    if (!updated || updated.length === 0) {
      throw new NotFoundException('User not found');
    }
    
    return updated[0];
  }

  /**
   * Привязать Clerk ID к пользователю
   */
  async linkClerkId(id: string, clerkId: string): Promise<User> {
    const updated = await this.db.update(users).set({ clerkId }).where(eq(users.id, id)).returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('User not found');
    }

    return updated[0];
  }

  /**
   * Найти пользователя по Telegram ID.
   * BIGINT → bigint в JS, но API наружу принимает number|string (id TG < 2^53, безопасно).
   */
  async findByTelegramId(telegramId: bigint | number | string): Promise<User | null> {
    const tgId = typeof telegramId === 'bigint' ? telegramId : BigInt(telegramId);
    const found = await this.db
      .select()
      .from(users)
      .where(eq(users.telegramId, tgId))
      .limit(1);
    return found[0] || null;
  }

  /**
   * Привязать Telegram identity к существующему пользователю (web-first flow).
   * Защищает от race: если telegramId уже занят другим user — ConflictException.
   * Идемпотентно: повторная линковка того же tgId к тому же user — no-op (обновит username/lang).
   */
  async linkTelegramIdentity(
    userId: string,
    payload: {
      telegramId: bigint | number | string;
      telegramUsername?: string | null;
      telegramLanguageCode?: string | null;
    },
  ): Promise<User> {
    const tgId = typeof payload.telegramId === 'bigint' ? payload.telegramId : BigInt(payload.telegramId);

    // Проверяем, что tgId не привязан к ДРУГОМУ user.
    const occupant = await this.findByTelegramId(tgId);
    if (occupant && occupant.id !== userId) {
      throw new ConflictException('Telegram account already linked to another user');
    }

    const updated = await this.db
      .update(users)
      .set({
        telegramId: tgId,
        telegramUsername: payload.telegramUsername ?? null,
        telegramLanguageCode: normalizeLanguageCode(payload.telegramLanguageCode),
        telegramLinkedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('User not found');
    }

    return updated[0];
  }

  /**
   * Отвязать Telegram identity от пользователя.
   * Блокирует unlink для TG-only (passwordHash === null) — иначе user потеряет доступ.
   * Обнуляет telegram_id / telegram_username / telegram_linked_at; language_code не трогаем
   * (это предпочтение, не идентичность).
   */
  async unlinkTelegramIdentity(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Cannot unlink Telegram from a TG-only account (no email/password credentials to fall back to)',
      );
    }

    const updated = await this.db
      .update(users)
      .set({
        telegramId: null,
        telegramUsername: null,
        telegramLinkedAt: null,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('User not found');
    }

    return updated[0];
  }

  /**
   * Создать TG-only пользователя (без email/password). role по умолчанию 'client'.
   * Используется при первом логине через бота, если tgId не найден.
   * CHECK users_staff_credentials_check гарантирует: staff создать так нельзя.
   */
  async createTelegramOnlyUser(payload: {
    telegramId: bigint | number | string;
    telegramUsername?: string | null;
    telegramLanguageCode?: string | null;
    role?: 'client' | 'model';
  }): Promise<User> {
    const tgId = typeof payload.telegramId === 'bigint' ? payload.telegramId : BigInt(payload.telegramId);

    const existing = await this.findByTelegramId(tgId);
    if (existing) {
      throw new ConflictException('User with this Telegram ID already exists');
    }

    const now = new Date();
    const created = await this.db
      .insert(users)
      .values({
        role: payload.role ?? 'client',
        status: 'active',
        telegramId: tgId,
        telegramUsername: payload.telegramUsername ?? null,
        telegramLanguageCode: normalizeLanguageCode(payload.telegramLanguageCode),
        telegramLinkedAt: now,
      } as NewUser)
      .returning();

    return created[0];
  }

  /**
   * Сменить роль (Admin only). Только между client/moderator/admin — у model/manager есть
   * привязанный профиль (model_profiles/manager_profiles: контакты, верификация, одобрение),
   * простая смена role оставила бы его в противоречивом состоянии.
   */
  async updateRole(id: string, role: 'client' | 'moderator' | 'admin'): Promise<User> {
    const SAFE_ROLES = ['client', 'moderator', 'admin'];
    if (!SAFE_ROLES.includes(role)) {
      throw new BadRequestException('Недопустимая роль');
    }
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    if (!SAFE_ROLES.includes(user.role)) {
      throw new BadRequestException('Смена роли для model/manager не поддерживается — у них есть привязанный профиль');
    }
    // staff (moderator/admin) обязаны иметь пароль (CHECK users_staff_credentials_check) —
    // TG-only клиент (без password_hash) не может стать staff без предварительной установки пароля.
    if ((role === 'moderator' || role === 'admin') && !user.passwordHash) {
      throw new BadRequestException('У пользователя нет пароля для входа (TG-only аккаунт) — сначала нужен логин/пароль');
    }

    const updated = await this.db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return updated[0];
  }

  /**
   * Удалить пользователя (Admin only). Разрешено только для role='moderator'|'manager'|'model' —
   * удаление client/admin через этот метод не поддерживается, роль проверяется в UsersController.
   * FK-каскад (model_profiles.userId / manager_profiles.userId → onDelete: 'cascade')
   * сам подчистит связанный профиль и то, что каскадится от него (брони, отзывы, медиа).
   * Для role='model' — тот же гейт, что и в ModelsService.deleteProfile: если по анкете уже
   * проходили эскроу-транзакции, каскад через users обошёл бы эту проверку, поэтому дублируем
   * её здесь, чтобы удаление аккаунта модели не сносило финансовую историю.
   */
  async deleteUser(id: string): Promise<void> {
    const [target] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === 'model') {
      const [profile] = await this.db.select({ id: modelProfiles.id }).from(modelProfiles).where(eq(modelProfiles.userId, id)).limit(1);
      if (profile) {
        const [{ value: transactedBookings }] = await this.db
          .select({ value: count() })
          .from(bookings)
          .innerJoin(escrowTransactions, eq(escrowTransactions.bookingId, bookings.id))
          .where(eq(bookings.modelId, profile.id));
        if (Number(transactedBookings) > 0) {
          throw new ConflictException(
            'Нельзя удалить аккаунт — по анкете модели проходили эскроу-транзакции (финансовая история должна сохраниться). Снимите анкету с публикации вместо удаления.',
          );
        }
      }
    }

    const deleted = await this.db.delete(users).where(eq(users.id, id)).returning();
    if (!deleted || deleted.length === 0) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Код восстановления вида XXXX-XXXX без неоднозначных символов (0/O/1/I/L),
   * чтобы пользователь мог продиктовать его поддержке без путаницы.
   */
  private async generateUniqueRecoveryCode(): Promise<string> {
    const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    for (let attempt = 0; attempt < 10; attempt++) {
      const raw = Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
      const existing = await this.db.select().from(users).where(eq(users.recoveryCode, code)).limit(1);
      if (!existing[0]) return code;
    }
    throw new Error('Failed to generate a unique recovery code after 10 attempts');
  }
}

/**
 * 'ru'/'en' после нормализации; всё остальное → 'ru' (дефолт платформы).
 * TG шлёт ISO-639-1 ('en', 'ru', 'en-US'…). Обрезаем до первых 2 символов.
 */
function normalizeLanguageCode(code: string | null | undefined): string {
  if (!code) return 'ru';
  const short = code.trim().toLowerCase().slice(0, 2);
  return short === 'en' ? 'en' : 'ru';
}
