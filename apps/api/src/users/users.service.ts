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
   * Проверка пароля
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
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
}
