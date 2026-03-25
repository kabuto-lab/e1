# 🤖 Qwen Coder Commands

**Быстрые команды для генерации кода AI-кодером**

---

## 📦 1. Генерация Entity

### Создать новую entity

```bash
# Команда
npm run generate:entity -- --name=EntityName

# Пример
npm run generate:entity -- --name=ModelVerification
```

### Что генерирует:
- `src/schema/entity-name.ts` - Drizzle схема
- `src/schema/entity-name.types.ts` - TypeScript типы
- `src/entity-name/entity-name.service.ts` - Service
- `src/entity-name/entity-name.controller.ts` - Controller
- `src/entity-name/dto/` - DTO классы

---

## 🗄️ 2. Генерация миграций Drizzle

### Создать миграцию

```bash
# Команда
npm run db:generate -- --name=migration_name

# Примеры
npm run db:generate -- --name=create_users_table
npm run db:generate -- --name=add_elite_status_to_models
npm run db:generate -- --name=create_escrow_transactions
```

### Применить миграции

```bash
# Разработка (push)
npm run db:push

# Production (migrate)
npm run db:migrate

# Откат миграции
npm run db:migrate:rollback
```

---

## 🏗️ 3. Генерация NestJS модулей

### Создать полный модуль

```bash
# Команда
npm run generate:module -- --name=ModuleName

# Пример
npm run generate:module -- --name=Bookings
```

### Что генерирует:
- `src/bookings/bookings.module.ts`
- `src/bookings/bookings.service.ts`
- `src/bookings/bookings.controller.ts`
- `src/bookings/entities/booking.entity.ts`
- `src/bookings/dto/create-booking.dto.ts`
- `src/bookings/dto/update-booking.dto.ts`

---

### Создать только service

```bash
# Команда
npm run generate:service -- --name=ServiceName

# Пример
npm run generate:service -- --name=Escrow
```

---

### Создать только controller

```bash
# Команда
npm run generate:controller -- --name=ControllerName

# Пример
npm run generate:controller -- --name=Reviews
```

---

## ⚛️ 4. Генерация React компонентов

### Создать компонент

```bash
# Команда
npm run generate:component -- --name=ComponentName

# Примеры
npm run generate:component -- --name=ModelCard
npm run generate:component -- --name=BookingForm
npm run generate:component -- --name=EscrowStatus
```

### Что генерирует:
- `apps/web/components/component-name.tsx`
- `apps/web/components/component-name.types.ts`
- `apps/web/components/component-name.styles.ts` (если нужен)

---

## 📄 5. Генерация Next.js страниц

### Создать страницу

```bash
# Команда
npm run generate:page -- --name=path/to/page

# Примеры
npm run generate:page -- --name=/models/[slug]
npm run generate:page -- --name=/dashboard/bookings
npm run generate:page -- --name=/admin/verifications
```

### Что генерирует:
- `apps/web/app/path/to/page/page.tsx`
- `apps/web/app/path/to/page/loading.tsx`
- `apps/web/app/path/to/page/error.tsx`

---

## 🔐 6. Генерация Auth Guards

### Создать Guard

```bash
# Команда
npm run generate:guard -- --name=GuardName

# Примеры
npm run generate:guard -- --name=Roles
npm run generate:guard -- --name=Owner
npm run generate:guard -- --name=Verified
```

---

## 📝 7. Генерация DTO

### Создать DTO

```bash
# Команда
npm run generate:dto -- --name=DtoName

# Примеры
npm run generate:dto -- --name=CreateBooking
npm run generate:dto -- --name=UpdateModel
npm run generate:dto -- --name=FundEscrow
```

### Что генерирует:
```typescript
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  modelId: string;

  @IsString()
  startTime: string;

  @IsNumber()
  durationHours: number;

  @IsEnum(['incall', 'outcall', 'travel'])
  locationType: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
```

---

## 🔄 8. Генерация Relations

### Создать relation

```bash
# Команда
npm run generate:relation -- --from=Entity1 --to=Entity2 --type=one-to-many

# Примеры
npm run generate:relation -- --from=users --to=bookings --type=one-to-many
npm run generate:relation -- --from=bookings --to=escrow --type=one-to-one
npm run generate:relation -- --from=models --to=reviews --type=one-to-many
```

### Что генерирует:
```typescript
export const bookingsRelations = relations(bookings, ({ one }) => ({
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
  }),
  model: one(modelProfiles, {
    fields: [bookings.modelId],
    references: [modelProfiles.id],
  }),
  escrow: one(escrowTransactions),
}));
```

---

## 🎨 9. Генерация UI компонентов (shadcn/ui)

### Добавить компонент

```bash
# Команда
npx shadcn-ui@latest add component

# Примеры
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
npx shadcn-ui@latest add form
```

---

## 📊 10. Генерация Dashboard виджетов

### Создать виджет

```bash
# Команда
npm run generate:widget -- --name=WidgetName

# Примеры
npm run generate:widget -- --name=BookingStats
npm run generate:widget -- --name=EscrowWidget
npm run generate:widget -- --name=RecentBookings
```

---

## 🧪 11. Генерация тестов

### Создать тест

```bash
# Unit тесты
npm run generate:test -- --name=ServiceName

# E2E тесты
npm run generate:e2e -- --name=EndpointName

# Примеры
npm run generate:test -- --name=UsersService
npm run generate:e2e -- --name=BookingsController
```

### Что генерирует:
```typescript
// apps/api/src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

---

## 📁 12. Генерация файлов конфигурации

### Создать .env

```bash
# Команда
npm run generate:env -- --environment=dev|prod

# Примеры
npm run generate:env -- --environment=dev
npm run generate:env -- --environment=prod
```

### Что генерирует:
```bash
# .env.development
DATABASE_URL=postgresql://companion:password@localhost:5432/companion_db
REDIS_URL=redis://:password@localhost:6379
CLERK_SECRET_KEY=sk_test_xxx
CLERK_PUBLISHABLE_KEY=pk_test_xxx
ENCRYPTION_KEY=32_byte_hex_key_here_0000000000
```

---

## 🚀 13. Генерация Docker файлов

### Создать Dockerfile

```bash
# Команда
npm run generate:docker -- --service=api|web|admin

# Примеры
npm run generate:docker -- --service=api
npm run generate:docker -- --service=web
```

### Что генерирует:
```dockerfile
# apps/api/Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages

RUN npm ci
RUN npm run build --filter=api

FROM node:22-alpine AS runner

WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

---

## 📋 14. Генерация OpenAPI спецификации

### Создать Swagger документацию

```bash
# Команда
npm run generate:swagger

# Что генерирует:
# - /api/docs (Swagger UI)
# - /api/docs-json (JSON спецификация)
```

---

## 🔧 15. Полезные утилиты

### Линтинг

```bash
npm run lint
npm run lint:fix
```

### Форматирование

```bash
npm run format
npm run format:check
```

### Типы проверка

```bash
npm run type-check
npm run type-check:api
npm run type-check:web
```

### Сборка

```bash
npm run build
npm run build:api
npm run build:web
npm run build:all
```

### Dev режим

```bash
npm run dev
npm run dev:api
npm run dev:web
```

---

## 📊 16. Генерация аналитики

### Создать analytics event

```bash
# Команда
npm run generate:event -- --name=EventName

# Примеры
npm run generate:event -- --name=BookingCreated
npm run generate:event -- --name=EscrowFunded
npm run generate:event -- --name=ModelVerified
```

### Что генерирует:
```typescript
// apps/api/src/analytics/events.ts
export const ANALYTICS_EVENTS = {
  BOOKING_CREATED: 'booking.created',
  ESCROW_FUNDED: 'escrow.funded',
  MODEL_VERIFIED: 'model.verified',
} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];
```

---

## 📞 17. Генерация Telegram бота

### Создать бот команду

```bash
# Команда
npm run generate:tg-command -- --name=CommandName

# Примеры
npm run generate:tg-command -- --name=start
npm run generate:tg-command -- --name=book
npm run generate:tg-command -- --name=status
```

---

## 📧 18. Генерация Email шаблонов

### Создать email template

```bash
# Команда
npm run generate:email -- --name=TemplateName

# Примеры
npm run generate:email -- --name=BookingConfirmation
npm run generate:email -- --name=EscrowFunded
npm run generate:email -- --name=PasswordReset
```

### Что генерирует:
```tsx
// apps/api/src/emails/templates/booking-confirmation.tsx
export function BookingConfirmationEmail({ booking, model }: Props) {
  return (
    <Html>
      <Body>
        <h1>Бронирование подтверждено</h1>
        <p>Ваше бронирование с {model.displayName} подтверждено.</p>
        <p>Дата: {booking.startTime}</p>
        <p>Сумма: {booking.totalAmount}</p>
      </Body>
    </Html>
  );
}
```

---

## 🎯 Quick Reference: Все команды

```bash
# Entity
npm run generate:entity -- --name=Name

# Database
npm run db:generate -- --name=migration_name
npm run db:push
npm run db:migrate

# NestJS
npm run generate:module -- --name=Name
npm run generate:service -- --name=Name
npm run generate:controller -- --name=Name
npm run generate:guard -- --name=Name
npm run generate:dto -- --name=Name

# Next.js
npm run generate:component -- --name=Name
npm run generate:page -- --name=path

# Tests
npm run generate:test -- --name=Name
npm run generate:e2e -- --name=Name

# Utils
npm run lint
npm run format
npm run type-check
npm run build
npm run dev
```

---

## 📝 Примеры использования

### Пример 1: Создать новую entity "ModelVerification"

```bash
# 1. Создать entity
npm run generate:entity -- --name=ModelVerification

# 2. Создать миграцию
npm run db:generate -- --name=create_model_verifications

# 3. Применить миграцию
npm run db:push

# 4. Создать тесты
npm run generate:test -- --name=ModelVerificationService
```

---

### Пример 2: Создать booking flow

```bash
# 1. Создать модуль Bookings
npm run generate:module -- --name=Bookings

# 2. Создать модуль Escrow
npm run generate:module -- --name=Escrow

# 3. Создать relation
npm run generate:relation -- --from=bookings --to=escrow --type=one-to-one

# 4. Создать страницу бронирования
npm run generate:page -- --name=/dashboard/bookings/new

# 5. Создать компонент формы
npm run generate:component -- --name=BookingForm
```

---

### Пример 3: Создать admin dashboard

```bash
# 1. Создать admin страницу
npm run generate:page -- --name=/admin/dashboard

# 2. Создать виджеты
npm run generate:widget -- --name=BookingStats
npm run generate:widget -- --name=EscrowWidget
npm run generate:widget -- --name=RecentBookings

# 3. Создать Guard для админа
npm run generate:guard -- --name=Admin
```

---

**Для Qwen Coder:** Используйте эти команды для быстрой генерации кода по шагам из `PLAN.md`.
