# 🎯 Escort Platform Migration

**Миграция с WordPress на современный стек 2026**

> **Для Qwen Coder:** Используйте этот файл как основную точку входа для генерации кода.

---

## 📁 Структура папки `migra/`

```
migra/
├── README.md           # Основная документация (обзор, стек, API)
├── PLAN.md             # Поэтапный план миграции с командами
├── schema.ts           # Полная Drizzle ORM схема всех entity
├── entity.ts           # Entity index с типами и relations
├── COMMANDS.md         # Справочник команд для генерации
└── INDEX.md            # Этот файл (навигация)
```

---

## 🚀 Быстрый старт

### 1. Ознакомиться с документацией

```bash
# Прочитать обзор проекта
cat README.md

# Изучить поэтапный план
cat PLAN.md

# Посмотреть команды генерации
cat COMMANDS.md
```

---

### 2. Инициализировать проект

```bash
# Создать монорепозиторий
npx create-turbo@latest escort-platform
cd escort-platform

# Установить зависимости
npm install

# Запустить Docker сервисы
docker-compose up -d
```

---

### 3. Настроить базу данных

```bash
# Перейти в packages/db
cd packages/db

# Сгенерировать миграции
npm run db:generate

# Применить миграции (разработка)
npm run db:push

# Применить миграции (production)
npm run db:migrate
```

---

### 4. Создать первый модуль

```bash
# Вернуться в корень
cd ../..

# Создать модуль Users
npm run generate:module -- --name=Users

# Создать модуль Models
npm run generate:module -- --name=Models

# Создать модуль Bookings
npm run generate:module -- --name=Bookings
```

---

## 📦 Entity Reference

### Core Entities

| Entity | Описание | Файл |
|--------|----------|------|
| `users` | Базовая таблица пользователей | `schema.ts:104` |
| `clientProfiles` | Профили клиентов | `schema.ts:148` |
| `modelProfiles` | Профили моделей | `schema.ts:210` |
| `bookings` | Бронирования | `schema.ts:285` |
| `escrowTransactions` | Эскроу транзакции | `schema.ts:348` |

### Supporting Entities

| Entity | Описание | Файл |
|--------|----------|------|
| `reviews` | Отзывы | `schema.ts:410` |
| `blacklists` | Чёрные списки | `schema.ts:462` |
| `mediaFiles` | Файлы (фото/видео) | `schema.ts:518` |
| `bookingAuditLogs` | Аудит лог | `schema.ts:574` |
| `sessions` | Сессии | `schema.ts:618` |

---

## 🔌 API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/2fa/enable
POST   /api/auth/2fa/verify
```

### Users
```
GET    /api/users/me
PATCH  /api/users/me
DELETE /api/users/me
GET    /api/users/:id (admin)
```

### Models
```
GET    /api/models (catalog)
GET    /api/models/:slug
POST   /api/models (manager)
PATCH  /api/models/:id
DELETE /api/models/:id
POST   /api/models/:id/verify (admin)
```

### Bookings
```
GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/:id
PATCH  /api/bookings/:id/status
POST   /api/bookings/:id/cancel
POST   /api/bookings/:id/confirm
```

### Escrow
```
POST   /api/escrow/:bookingId/fund
POST   /api/escrow/:bookingId/release
POST   /api/escrow/:bookingId/refund
GET    /api/escrow/:bookingId/status
```

---

## 📋 Поэтапный план

### Этап 1: Фундамент (Недели 1-2)
- [ ] Инициализация монорепозитория
- [ ] Docker Compose настройка
- [ ] Drizzle ORM настройка
- [ ] RLS политики

### Этап 2: Авторизация (Недели 2-3)
- [ ] Clerk интеграция
- [ ] Vault интеграция
- [ ] JWT стратегия

### Этап 3: API Core (Недели 3-5)
- [ ] Users модуль
- [ ] Models модуль
- [ ] Bookings модуль
- [ ] Guards и DTO

### Этап 4: Эскроу (Недели 5-7)
- [ ] Escrow state machine
- [ ] YooKassa интеграция
- [ ] Cryptomus интеграция
- [ ] Webhook handlers

### Этап 5: Интеграции (Недели 7-8)
- [ ] Telegram Bot API
- [ ] MinIO файловое хранилище
- [ ] Email уведомления
- [ ] SMS уведомления

### Этап 6: Фронтенд (Недели 8-10)
- [ ] Next.js приложение
- [ ] Каталог моделей
- [ ] Личные кабинеты
- [ ] Админ-панель

### Этап 7: Тестирование (Недели 10-11)
- [ ] Unit тесты
- [ ] E2E тесты
- [ ] Нагрузочное тестирование
- [ ] Security аудит

### Этап 8: Запуск (Неделя 12)
- [ ] Production деплой
- [ ] SSL настройка
- [ ] Бэкапы
- [ ] Мониторинг

---

## 🔒 Security Checklist

- [ ] RLS включен на всех таблицах
- [ ] UUID для всех первичных ключей
- [ ] Email хеширован (SHA-256)
- [ ] Phone токенизирован (Vault)
- [ ] Пароли хешированы (Argon2/bcrypt)
- [ ] JWT access/refresh токены
- [ ] 2FA для админов
- [ ] Rate limiting
- [ ] CORS настройка
- [ ] Helmet.js заголовки
- [ ] Аудит логирование
- [ ] Шифрование sensitive данных

---

## 🧪 Testing Checklist

- [ ] Unit тесты >80% coverage
- [ ] E2E тесты критичных путей
- [ ] Нагрузочное тестирование
- [ ] Security penetration testing
- [ ] Cross-browser тестирование
- [ ] Mobile responsive тестирование

---

## 📊 Business Rules

### Booking State Machine
```
draft → pending_payment → escrow_funded → confirmed → in_progress → completed
                                            ↓
                                       cancelled / disputed / refunded
```

### Escrow State Machine
```
pending_funding → funded → hold_period → released
                                      ↓
                                   refunded / disputed_hold
```

### Verification Flow
```
pending → video_required → document_required → verified
                                            ↓
                                         rejected
```

### Commission
- Platform fee: 20% (на старте 3%)
- Model payout: 80%
- Hold period: 24 часа

---

## 🛠️ Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript 5.6+
- TailwindCSS + shadcn/ui
- Zustand (state)
- React Query (server state)

### Backend
- NestJS 11
- Node.js 22 LTS
- Drizzle ORM
- PostgreSQL 16
- Redis 7
- Clerk Auth
- HashiCorp Vault

### Payments
- YooKassa (холдирование)
- Cryptomus (крипто)

### Infrastructure
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- Traefik (reverse proxy)
- MinIO (S3 storage)
- Let's Encrypt (SSL)

---

## 📞 Команды для Qwen Coder

### Генерация кода по шагам

```bash
# Шаг 1: Создать entity
npm run generate:entity -- --name=ModelProfile

# Шаг 2: Создать миграцию
npm run db:generate -- --name=create_model_profiles

# Шаг 3: Создать модуль
npm run generate:module -- --name=Models

# Шаг 4: Создать сервис
npm run generate:service -- --name=Models

# Шаг 5: Создать контроллер
npm run generate:controller -- --name=Models

# Шаг 6: Создать компонент
npm run generate:component -- --name=ModelCard

# Шаг 7: Создать страницу
npm run generate:page -- --name=/models/[slug]
```

---

## 📚 Документы

| Документ | Описание |
|----------|----------|
| [`README.md`](./README.md) | Основная документация, обзор, API |
| [`PLAN.md`](./PLAN.md) | Поэтапный план миграции с командами |
| [`schema.ts`](./schema.ts) | Полная Drizzle ORM схема |
| [`entity.ts`](./entity.ts) | Entity index с типами |
| [`COMMANDS.md`](./COMMANDS.md) | Справочник команд генерации |

---

## ✅ Готовность к запуску

### Функциональность
- [ ] Регистрация/вход работают
- [ ] Каталог с фильтрами
- [ ] Карточка модели полная
- [ ] Бронирование создаётся
- [ ] Эскроу холдирует
- [ ] Выплаты работают
- [ ] Отзывы создаются
- [ ] ЧС работает

### Безопасность
- [ ] RLS включен
- [ ] Шифрование телефонов
- [ ] Аудит логирование
- [ ] 2FA для админов
- [ ] Rate limiting
- [ ] HTTPS везде

### Производительность
- [ ] Кэш Redis
- [ ] CDN для файлов
- [ ] Индексы БД
- [ ] Нагрузочное тестирование

### Документация
- [ ] README.md
- [ ] API документация (Swagger)
- [ ] Инструкции для команды
- [ ] Runbook для продакшена

---

**Версия:** 1.0  
**Последнее обновление:** 2026-01-01  
**Статус:** MVP в разработке

---

**Для Qwen Coder:** Начните с изучения `README.md`, затем следуйте `PLAN.md` по шагам, используя команды из `COMMANDS.md`.
