/**
 * Users Service - бизнес-логика работы с пользователями
 */

import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users, type User, type NewUser } from '@escort/db';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  /**
   * Создать нового пользователя
   */
  async createUser(email: string, password: string, role: 'client' | 'model' | 'admin' | 'manager' = 'client'): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

    const newUsers = await this.db.insert(users).values({
      emailHash,
      passwordHash,
      role,
      status: 'pending_verification',
    }).returning();

    return newUsers[0];
  }

  /**
   * Найти пользователя по email
   */
  async findByEmail(email: string): Promise<User | null> {
    const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
    
    const foundUsers = await this.db.select().from(users).where(eq(users.emailHash, emailHash)).limit(1);
    return foundUsers[0] || null;
  }

  /**
   * Найти пользователя по ID
   */
  async findById(id: string): Promise<User | null> {
    const foundUsers = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return foundUsers[0] || null;
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
  async findAll(limit = 50, offset = 0): Promise<User[]> {
    return this.db.select().from(users).limit(limit).offset(offset);
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
