# 📋 Поэтапный план миграции

**Для Qwen Coder:** Используйте этот файл как пошаговое руководство для генерации кода.

---

## 🎯 Этап 1: Фундамент (Недели 1-2)

### 1.1 Инициализация монорепозитория

```bash
# Создать Turborepo проект
npx create-turbo@latest escort-platform
cd escort-platform

# Структура после создания:
# escort-platform/
# ├── apps/
# │   ├── api/          (NestJS бэкенд)
# │   ├── web/          (Next.js фронтенд)
# │   └── admin/        (Next.js админ-панель)
# ├── packages/
# │   ├── db/           (Drizzle схема и миграции)
# │   ├── ui/           (Shared UI компоненты)
# │   ├── config/       (ESLint, TypeScript configs)
# │   └── types/        (Shared типы)
# ├── turbo.json
# ├── package.json
# └── docker-compose.yml
```

**Команды для выполнения:**

```bash
# 1. Создать базовую структуру
mkdir -p apps/api apps/web apps/admin packages/db packages/ui packages/config

# 2. Инициализировать корневой package.json
npm init -y

# 3. Установить Turborepo
npm install -D turbo

# 4. Создать turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    }
  }
}
EOF
```

**Ожидаемый результат:**
- ✅ Монорепозиторий создан
- ✅ Turborepo настроен
- ✅ Структура папок готова

---

### 1.2 Docker Compose база

**Файл:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL 16
  postgres:
    image: postgres:16-alpine
    container_name: escort-postgres
    environment:
      POSTGRES_USER: companion
      POSTGRES_PASSWORD: ${DB_PASSWORD:-companion_dev_password}
      POSTGRES_DB: companion_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./packages/db/init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U companion"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - escort-network

  # Redis 7
  redis:
    image: redis:7-alpine
    container_name: escort-redis
    command: redis-server --requirepass ${REDIS_PASSWORD:-companion_redis_password}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - escort-network

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio:latest
    container_name: escort-minio
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-companion_minio_admin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-companion_minio_password}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    networks:
      - escort-network

  # Mailhog (development email testing)
  mailhog:
    image: mailhog/mailhog:latest
    container_name: escort-mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    networks:
      - escort-network

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  escort-network:
    driver: bridge
```

**Команды:**

```bash
# Запустить все сервисы
docker-compose up -d

# Проверить статус
docker-compose ps

# Посмотреть логи
docker-compose logs -f postgres
```

**Ожидаемый результат:**
- ✅ PostgreSQL работает на порту 5432
- ✅ Redis работает на порту 6379
- ✅ MinIO доступен на http://localhost:9000
- ✅ Mailhog доступен на http://localhost:8025

---

### 1.3 Настройка Drizzle ORM

**Файл:** `packages/db/package.json`

```json
{
  "name": "@escort/db",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/seed.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "drizzle-kit": "^0.28.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

**Файл:** `packages/db/drizzle.config.ts`

```typescript
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Файл:** `packages/db/src/index.ts`

```typescript
// Экспорт всех entity
export * from './schema/users';
export * from './schema/client-profiles';
export * from './schema/model-profiles';
export * from './schema/bookings';
export * from './schema/escrow';
export * from './schema/reviews';
export * from './schema/blacklists';
export * from './schema/media';
export * from './schema/audit';
export * from './schema/sessions';

// Экспорт отношений
export * from './schema/relations';

// Экспорт типов
export type * from './schema/types';
```

**Команды:**

```bash
# В packages/db
npm install

# Сгенерировать миграции
npm run db:generate

# Применить миграции (разработка)
npm run db:push

# Применить миграции (production)
npm run db:migrate
```

**Ожидаемый результат:**
- ✅ Drizzle настроен
- ✅ Миграции генерируются в `packages/db/drizzle/`
- ✅ Schema экспортируется

---

### 1.4 RLS политики (Row-Level Security)

**Файл:** `packages/db/init-scripts/01-enable-rls.sql`

```sql
-- Включить RLS на всех таблицах
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Политики для users
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (
    id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'admin'
  );

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (
    id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- Политики для client_profiles
CREATE POLICY "clients_select_own"
  ON client_profiles FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id', true)::uuid
    OR assigned_manager_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- Политики для model_profiles
CREATE POLICY "models_select_public"
  ON model_profiles FOR SELECT
  USING (
    verification_status = 'verified'
    OR manager_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'admin'
  );

CREATE POLICY "models_update_manager"
  ON model_profiles FOR UPDATE
  USING (
    manager_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- Политики для bookings
CREATE POLICY "bookings_select_participants"
  ON bookings FOR SELECT
  USING (
    client_id = current_setting('app.current_user_id', true)::uuid
    OR model_id = current_setting('app.current_user_id', true)::uuid
    OR manager_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'admin'
  );

CREATE POLICY "bookings_insert_client"
  ON bookings FOR INSERT
  WITH CHECK (
    client_id = current_setting('app.current_user_id', true)::uuid
  );

CREATE POLICY "bookings_update_participants"
  ON bookings FOR UPDATE
  USING (
    client_id = current_setting('app.current_user_id', true)::uuid
    OR model_id = current_setting('app.current_user_id', true)::uuid
    OR manager_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- Политики для escrow_transactions
CREATE POLICY "escrow_select_booking_participants"
  ON escrow_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = escrow_transactions.booking_id
      AND (
        bookings.client_id = current_setting('app.current_user_id', true)::uuid
        OR bookings.model_id = current_setting('app.current_user_id', true)::uuid
        OR current_setting('app.current_user_role', true) = 'admin'
      )
    )
  );

-- Политики для reviews
CREATE POLICY "reviews_select_public"
  ON reviews FOR SELECT
  USING (
    is_public = true
    OR client_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'admin'
  );

CREATE POLICY "reviews_insert_client"
  ON reviews FOR INSERT
  WITH CHECK (
    client_id = current_setting('app.current_user_id', true)::uuid
  );

-- Политики для blacklists (только админ)
CREATE POLICY "blacklists_admin_only"
  ON blacklists FOR ALL
  USING (
    current_setting('app.current_user_role', true) = 'admin'
  );

-- Политики для media_files
CREATE POLICY "media_select_owner_or_public"
  ON media_files FOR SELECT
  USING (
    owner_id = current_setting('app.current_user_id', true)::uuid
    OR model_id IN (
      SELECT id FROM model_profiles
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
    )
    OR current_setting('app.current_user_role', true) = 'admin'
  );

CREATE POLICY "media_insert_owner"
  ON media_files FOR INSERT
  WITH CHECK (
    owner_id = current_setting('app.current_user_id', true)::uuid
  );

-- Политики для audit logs (только админ)
CREATE POLICY "audit_admin_only"
  ON booking_audit_logs FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'admin'
  );

-- Политики для sessions
CREATE POLICY "sessions_select_own"
  ON sessions FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id', true)::uuid
  );

CREATE POLICY "sessions_delete_own"
  ON sessions FOR DELETE
  USING (
    user_id = current_setting('app.current_user_id', true)::uuid
  );
```

**Команды:**

```bash
# Применить RLS политики
docker exec -i escort-postgres psql -U companion -d companion_db < packages/db/init-scripts/01-enable-rls.sql
```

**Ожидаемый результат:**
- ✅ RLS включен на всех таблицах
- ✅ Политики настроены по ролям
- ✅ Изоляция данных работает

---

## 🔐 Этап 2: Авторизация (Недели 2-3)

### 2.1 Clerk интеграция

**Файл:** `apps/api/.env`

```bash
# Clerk
CLERK_SECRET_KEY=sk_test_xxx
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Database
DATABASE_URL=postgresql://companion:password@localhost:5432/companion_db

# Redis
REDIS_URL=redis://:password@localhost:6379

# Vault (для секретов)
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=hvs_xxx

# Encryption
ENCRYPTION_KEY=32_byte_hex_key_here_0000000000
```

**Файл:** `apps/api/src/auth/clerk.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkMiddleware implements NestMiddleware {
  private clerkClient: ClerkClient;

  constructor() {
    this.clerkClient = ClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    try {
      const session = await this.clerkClient.verifySession({
        sessionToken: authHeader.replace('Bearer ', ''),
      });

      // Установить RLS контекст для PostgreSQL
      req.headers['x-user-id'] = session.userId;
      req.headers['x-user-role'] = session.publicMetadata?.role || 'client';

      // Сохранить пользователя в request
      (req as any).user = {
        id: session.userId,
        role: session.publicMetadata?.role,
        email: session.email,
      };
    } catch (error) {
      // Игнорировать ошибки авторизации для публичных endpoint
    }

    next();
  }
}
```

**Ожидаемый результат:**
- ✅ Clerk middleware работает
- ✅ JWT токены валидируются
- ✅ RLS контекст передаётся в БД

---

### 2.2 HashiCorp Vault интеграция

**Файл:** `apps/api/src/vault/vault.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Vault from 'node-vault';

@Injectable()
export class VaultService implements OnModuleInit {
  private client: any;

  async onModuleInit() {
    this.client = Vault({
      endpoint: process.env.VAULT_ADDR,
      token: process.env.VAULT_TOKEN,
    });

    // Инициализировать секреты
    await this.initSecrets();
  }

  private async initSecrets() {
    const secrets = [
      { path: 'secret/data/database', data: { password: process.env.DB_PASSWORD } },
      { path: 'secret/data/redis', data: { password: process.env.REDIS_PASSWORD } },
      { path: 'secret/data/encryption', data: { key: process.env.ENCRYPTION_KEY } },
      { path: 'secret/data/clerk', data: { 
        secret_key: process.env.CLERK_SECRET_KEY,
        publishable_key: process.env.CLERK_PUBLISHABLE_KEY,
      }},
    ];

    for (const secret of secrets) {
      try {
        await this.client.write(secret.path, secret.data);
      } catch (error) {
        // Secret already exists
      }
    }
  }

  async getSecret(path: string): Promise<any> {
    const { data } = await this.client.read(`secret/data/${path}`);
    return data.data;
  }

  async encryptPhone(phone: string): Promise<string> {
    const encryptionKey = await this.getSecret('encryption');
    // Реализация шифрования
    return encryptedToken;
  }
}
```

**Ожидаемый результат:**
- ✅ Vault подключен
- ✅ Секреты хранятся в Vault
- ✅ Шифрование работает

---

## ⚙️ Этап 3: API Core (Недели 3-5)

### 3.1 NestJS модуль Users

**Команда для генерации:**

```bash
cd apps/api
nest g module users
nest g service users
nest g controller users
nest g class users/dto/create-user.dto
nest g class users/dto/update-user.dto
nest g class users/entities/user.entity
```

**Файл:** `apps/api/src/users/users.service.ts`

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectDrizzle } from 'nestjs-drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users, clientProfiles, modelProfiles } from '@escort/db';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectDrizzle() private db: NodePgDatabase,
  ) {}

  async create(dto: CreateUserDto, role: UserRole) {
    // Проверка на дубликат email
    const emailHash = this.hashEmail(dto.email);
    const existing = await this.db.query.users.findFirst({
      where: eq(users.emailHash, emailHash),
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Создание пользователя
    const [user] = await this.db.insert(users).values({
      emailHash,
      passwordHash,
      role,
      status: 'pending_verification',
    }).returning();

    // Создание профиля в зависимости от роли
    if (role === 'client') {
      await this.db.insert(clientProfiles).values({
        userId: user.id,
      });
    } else if (role === 'model') {
      await this.db.insert(modelProfiles).values({
        userId: user.id,
      });
    }

    return user;
  }

  async findById(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        clientProfile: true,
        modelProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private hashEmail(email: string): string {
    return require('crypto')
      .createHash('sha256')
      .update(email.toLowerCase().trim())
      .digest('hex');
  }
}
```

**Ожидаемый результат:**
- ✅ CRUD пользователей работает
- ✅ Профили создаются автоматически
- ✅ Валидация email

---

### 3.2 API Endpoints

**Файл:** `apps/api/src/users/users.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto, 'client');
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateMe(@Request() req, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.id, dto);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  async deleteMe(@Request() req) {
    return this.usersService.softDelete(req.user.id);
  }

  @Get(':id')
  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
```

**Ожидаемый результат:**
- ✅ Endpoints работают
- ✅ Guards проверяют доступ
- ✅ DTO валидируются

---

## 💰 Этап 4: Эскроу и платежи (Недели 5-7)

### 4.1 Escrow State Machine

**Файл:** `apps/api/src/escrow/escrow.service.ts`

```typescript
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from 'nestjs-drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { escrowTransactions, bookings, bookingAuditLogs } from '@escort/db';
import { eq, and } from 'drizzle-orm';

export type EscrowStatus =
  | 'pending_funding'
  | 'funded'
  | 'hold_period'
  | 'released'
  | 'refunded'
  | 'disputed_hold';

export type ReleaseTrigger =
  | 'auto_after_hold'
  | 'manual_confirm'
  | 'dispute_resolution'
  | 'admin_override';

@Injectable()
export class EscrowService {
  private readonly HOLD_PERIOD_HOURS = 24;

  constructor(
    @InjectDrizzle() private db: NodePgDatabase,
  ) {}

  /**
   * Создать эскроу транзакцию
   */
  async create(bookingId: string, amount: number, currency = 'RUB') {
    const [escrow] = await this.db.insert(escrowTransactions).values({
      bookingId,
      amountHeld: amount.toString(),
      currency,
      status: 'pending_funding',
      stateHistory: [],
    }).returning();

    // Обновить статус бронирования
    await this.db.update(bookings)
      .set({ status: 'pending_payment' })
      .where(eq(bookings.id, bookingId));

    return escrow;
  }

  /**
   * Подтвердить получение средств (после оплаты клиентом)
   */
  async confirmFunding(bookingId: string, paymentProviderRef: string) {
    const now = new Date();
    const holdUntil = new Date(now.getTime() + this.HOLD_PERIOD_HOURS * 60 * 60 * 1000);

    const [escrow] = await this.db.update(escrowTransactions)
      .set({
        status: 'hold_period',
        fundedAt: now,
        holdUntil,
        paymentProviderRef,
        stateHistory: this.db
          .select({ stateHistory: escrowTransactions.stateHistory })
          .from(escrowTransactions)
          .where(eq(escrowTransactions.bookingId, bookingId))
          .then((result) => [
            ...(result[0]?.stateHistory || []),
            {
              fromStatus: 'pending_funding',
              toStatus: 'hold_period',
              triggeredBy: 'system',
              timestamp: now.toISOString(),
            },
          ]),
      })
      .where(eq(escrowTransactions.bookingId, bookingId))
      .returning();

    // Обновить статус бронирования
    await this.db.update(bookings)
      .set({ status: 'escrow_funded' })
      .where(eq(bookings.id, bookingId));

    return escrow;
  }

  /**
   * Освободить средства (выплата модели)
   */
  async release(bookingId: string, trigger: ReleaseTrigger, userId: string) {
    const escrow = await this.db.query.escrowTransactions.findFirst({
      where: eq(escrowTransactions.bookingId, bookingId),
    });

    if (!escrow) {
      throw new NotFoundException('Escrow transaction not found');
    }

    // Проверка что холд период истёк
    if (escrow.status === 'hold_period') {
      const now = new Date();
      if (now < escrow.holdUntil!) {
        throw new BadRequestException(
          `Hold period not expired. Release available after ${escrow.holdUntil}`,
        );
      }
    }

    const now = new Date();
    const oldStatus = escrow.status;

    const [updated] = await this.db.update(escrowTransactions)
      .set({
        status: 'released',
        releasedAt: now,
        releaseTrigger: trigger,
        stateHistory: [
          ...(escrow.stateHistory || []),
          {
            fromStatus: oldStatus,
            toStatus: 'released',
            triggeredBy: userId,
            timestamp: now.toISOString(),
            reason: trigger,
          },
        ],
      })
      .where(eq(escrowTransactions.bookingId, bookingId))
      .returning();

    // Обновить статус бронирования
    await this.db.update(bookings)
      .set({ status: 'completed', completedAt: now })
      .where(eq(bookings.id, bookingId));

    // Логирование аудита
    await this.logAudit(bookingId, 'escrow_released', userId, {
      fromStatus: oldStatus,
      toStatus: 'released',
    });

    return updated;
  }

  /**
   * Вернуть средства клиенту
   */
  async refund(bookingId: string, reason: string, userId: string) {
    const escrow = await this.db.query.escrowTransactions.findFirst({
      where: eq(escrowTransactions.bookingId, bookingId),
    });

    if (!escrow) {
      throw new NotFoundException('Escrow transaction not found');
    }

    const now = new Date();
    const oldStatus = escrow.status;

    const [updated] = await this.db.update(escrowTransactions)
      .set({
        status: 'refunded',
        refundedAt: now,
        stateHistory: [
          ...(escrow.stateHistory || []),
          {
            fromStatus: oldStatus,
            toStatus: 'refunded',
            triggeredBy: userId,
            timestamp: now.toISOString(),
            reason,
          },
        ],
      })
      .where(eq(escrowTransactions.bookingId, bookingId))
      .returning();

    // Обновить статус бронирования
    await this.db.update(bookings)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancellationReason: reason,
        cancelledBy: userId,
      })
      .where(eq(bookings.id, bookingId));

    // Логирование аудита
    await this.logAudit(bookingId, 'escrow_refunded', userId, {
      fromStatus: oldStatus,
      toStatus: 'refunded',
      reason,
    });

    return updated;
  }

  private async logAudit(
    bookingId: string,
    action: string,
    actorId: string,
    metadata: any,
  ) {
    await this.db.insert(bookingAuditLogs).values({
      bookingId,
      action,
      actorId,
      metadata,
      ipAddress: '', // Из request
      userAgent: '', // Из request
    });
  }
}
```

**Ожидаемый результат:**
- ✅ State machine работает
- ✅ Переходы состояний валидируются
- ✅ Аудит логируются

---

## ✅ Чеклист готовности

### Этап 1 (Фундамент)
- [ ] Монорепозиторий создан
- [ ] Docker Compose работает
- [ ] PostgreSQL подключен
- [ ] Redis подключен
- [ ] MinIO подключен
- [ ] Drizzle ORM настроен
- [ ] Миграции сгенерированы
- [ ] RLS политики включены

### Этап 2 (Авторизация)
- [ ] Clerk интегрирован
- [ ] JWT валидация работает
- [ ] RLS контекст передаётся
- [ ] Vault хранит секреты
- [ ] Шифрование телефонов

### Этап 3 (API Core)
- [ ] Users CRUD работает
- [ ] Models CRUD работает
- [ ] Bookings CRUD работает
- [ ] Guards проверяют роли
- [ ] DTO валидируются

### Этап 4 (Эскроу)
- [ ] Escrow state machine
- [ ] Холдирование платежей
- [ ] Авто-выплата через 24ч
- [ ] Возврат средств
- [ ] Аудит логи

---

**Для Qwen Coder:** Используйте команды из этого плана для генерации кода по шагам.
