# 🎯 Escort Platform

**Премиальная платформа сопровождения**

Современный стек 2026: Next.js 15, NestJS 11, Drizzle ORM, PostgreSQL 16

**Статус:** ✅ В разработке (2026-03-20)

---

## 🚀 Быстрый старт

### 1. Проверить Docker сервисы

```bash
cd C:\Users\a\Documents\_DEV\Tran\ES
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml ps
```

### 2. Запустить API

```bash
cd apps\api
npx ts-node -r tsconfig-paths/register src/main.ts
```

✅ http://localhost:3000 | Swagger: http://localhost:3000/api/docs

### 3. Запустить Web

```bash
cd apps\web
npm run dev
```

✅ http://localhost:3001

### 4. Войти

- URL: http://localhost:3001/login
- Email: `test@test.com`
- Password: `password123`

---

## 📊 Сервисы

| Сервис | URL |
|--------|-----|
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| Web | http://localhost:3001 |
| MinIO | http://localhost:9001 |
| Mailhog | http://localhost:8025 |

---

## ✅ Модули

- [x] Auth + Users (JWT)
- [x] Models (анкеты)
- [x] Clients (профили)
- [x] Bookings (state machine)
- [x] Escrow (платежи)
- [x] Reviews (отзывы)
- [x] Blacklist (ЧС)
- [x] Media (файлы)

---

## 📁 Структура

```
ES/
├── apps/api/src/
│   ├── auth/ users/ models/ clients/
│   ├── bookings/ escrow/ reviews/
│   ├── blacklist/ media/ database/ health/
├── apps/web/app/
│   ├── login/ dashboard/ page.tsx
├── packages/db/src/schema/ (10 таблиц)
├── docker-compose.dev.yml
├── .env
├── PROGRESS_2026-03-20.md  ← Полный отчёт
└── QUICK_START.md          ← Быстрый старт
```

---

## 🗄️ БД (10 таблиц)

users, client_profiles, model_profiles, bookings, escrow_transactions, reviews, blacklists, media_files, booking_audit_logs, sessions

---

## 🔧 Команды

```bash
# Docker логи
docker-compose -f docker-compose.dev.yml logs -f

# Drizzle Studio
cd packages\db && npx drizzle-kit studio

# Перезапуск PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres
```

---

## 🐛 Проблемы

**Порт 5432 занят:**
```bash
sc stop postgresql-x64-18
sc config postgresql-x64-18 start= disabled
```

---

**Версия:** 1.0.0-dev  
**Обновлено:** 2026-03-20
