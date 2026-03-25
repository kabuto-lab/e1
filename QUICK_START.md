# ⚡ Quick Start — Продолжить работу

## 📍 Точка сохранения: 2026-03-20 02:30

---

## 🚀 Быстрый старт завтра

### 1. Проверить сервисы
```bash
cd C:\Users\a\Documents\_DEV\Tran\ES

# Docker (должно быть 4 контейнера)
docker-compose -f docker-compose.dev.yml ps

# Если не запущены:
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Запустить API
```bash
cd apps\api
npx ts-node -r tsconfig-paths/register src/main.ts
```
✅ Проверка: http://localhost:3000/health

### 3. Запустить Web
```bash
cd apps\web
npm run dev
```
✅ Проверка: http://localhost:3001

### 4. Тестовый вход
- **URL:** http://localhost:3001/login
- **Email:** test@test.com
- **Password:** password123

---

## 📁 Что открыто сейчас

| Сервис | URL | Статус |
|--------|-----|--------|
| API | http://localhost:3000 | ✅ |
| Swagger | http://localhost:3000/api/docs | ✅ |
| Web | http://localhost:3001 | ✅ |
| PostgreSQL | localhost:5432 | ✅ Docker |
| Redis | localhost:6379 | ✅ Docker |
| MinIO | http://localhost:9001 | ✅ Docker |
| Mailhog | http://localhost:8025 | ✅ Docker |

---

## 🎯 С чего продолжить

### Вариант A: Фронтенд
1. Страница `/models` — каталог моделей
2. Страница `/models/:id` — профиль модели
3. Форма создания бронирования

### Вариант B: Бэкенд
1. Real JWT Guard (вместо placeholder)
2. Загрузка файлов в MinIO
3. Email уведомления

### Вариант C: Интеграции
1. Clerk Auth (вместо самописного)
2. YooKassa (платежи)
3. Telegram бот

---

## 🔑 Тестовые данные

### Пользователь (создан сегодня)
```json
{
  "email": "test@test.com",
  "password": "password123",
  "role": "client",
  "id": "7612e633-0de9-4889-b6d4-2b6b51da464f"
}
```

### JWT токены (сохраняются в localStorage)
- `accessToken` — 15 минут
- `refreshToken` — 7 дней

---

## 📊 Статистика проекта

| Модуль | Файлов | Строк кода |
|--------|--------|------------|
| API | 24 | ~2500 |
| Web | 4 | ~600 |
| DB Schema | 10 | ~800 |
| **Всего** | **38** | **~3900** |

---

## 🐛 Если что-то не работает

### Порт 5432 занят
```bash
# Остановить Windows PostgreSQL
sc stop postgresql-x64-18
sc config postgresql-x64-18 start= disabled

# Перезапустить Docker
docker-compose -f docker-compose.dev.yml restart postgres
```

### API не запускается
```bash
# Проверить зависимости
cd apps\api
npm install

# Очистить кеш
npx ts-node --clearCache
```

### Web не видит API
```bash
# Проверить CORS в apps/api/src/main.ts
# Должно быть: origin: 'http://localhost:3001'
```

---

**Сохранено:** 2026-03-20 02:30  
**Файл контекста:** `PROGRESS_2026-03-20.md`
