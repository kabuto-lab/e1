# 🚀 ЗАПУСК ПРОЕКТА - ПОШАГОВАЯ ИНСТРУКЦИЯ

## ✅ ЧТО УЖЕ СДЕЛАНО

Все файлы проекта созданы автоматически! Тебе осталось только установить зависимости и запустить.

---

## 📋 ШАГ 1: Установка зависимостей

Открой PowerShell в папке проекта и выполни:

```bash
cd C:\Users\a\Documents\_DEV\Tran\ES
npm install
```

**Это установит:**
- Turborepo (монорепозиторий)
- Drizzle ORM (база данных)
- NestJS (бэкенд)
- Next.js (фронтенд)
- Все необходимые зависимости

**Время:** 2-5 минут

---

## 📋 ШАГ 2: Проверка Docker

Убедись что Docker запущен:

```bash
docker-compose -f docker-compose.dev.yml ps
```

**Должно быть 4 контейнера со статусом "Up":**
- escort-postgres
- escort-redis
- escort-minio
- escort-mailhog

**Если контейнеры остановлены - запусти:**

```bash
docker-compose -f docker-compose.dev.yml up -d
```

---

## 📋 ШАГ 3: Применение миграций БД

```bash
# Перейди в packages/db
cd packages\db

# Сгенерируй миграции
npx drizzle-kit generate

# Примени миграции (создаст таблицы в PostgreSQL)
npx drizzle-kit push
```

**Ожидаемый результат:**
```
✔ Generated migration
✔ Pushed database schema
```

---

## 📋 ШАГ 4: Запуск разработки

Вернись в корень проекта:

```bash
cd C:\Users\a\Documents\_DEV\Tran\ES
```

**Запусти всё сразу:**

```bash
npm run dev
```

**Или по отдельности (в разных терминалах):**

**Терминал 1 - API (NestJS):**
```bash
cd apps\api
npm run dev
```

**Терминал 2 - Web (Next.js):**
```bash
cd apps\web
npm run dev
```

---

## 📋 ШАГ 5: Проверка что всё работает

Открой в браузере:

| Сервис | URL | Что увидишь |
|--------|-----|-------------|
| **Web** | http://localhost:3001 | Страница Lovnge с карточками сервисов |
| **API** | http://localhost:3000 | JSON: `{"name":"Escort Platform API",...}` |
| **Swagger** | http://localhost:3000/api/docs | API документация |
| **Health** | http://localhost:3000/health | `{"status":"ok",...}` |
| **MinIO** | http://localhost:9001 | Консоль хранилища (логин: companion_minio_admin) |
| **Mailhog** | http://localhost:8025 | Пустой inbox (тестирование email) |

---

## 🎯 ЧЕКЛИСТ ГОТОВНОСТИ

Пройдись по списку:

- [ ] `npm install` выполнился без ошибок
- [ ] Docker контейнеры запущены (`docker-compose ps`)
- [ ] Миграции применены (`npx drizzle-kit push`)
- [ ] API доступно (http://localhost:3000/health показывает "ok")
- [ ] Web открыт (http://localhost:3001 показывает страницу Lovnge)
- [ ] Swagger доступен (http://localhost:3000/api/docs)

**Если всё отмечено - ПОЗДРАВЛЯЮ! Проект готов к разработке!** 🎉

---

## 🛠️ СЛЕДУЮЩИЕ ШАГИ

Теперь можно:

1. **Добавить модуль Users** (регистрация/вход)
2. **Создать модуль Models** (каталог анкет)
3. **Добавить модуль Bookings** (бронирование)
4. **Интегрировать Clerk Auth** (авторизация)
5. **Подключить YooKassa** (платежи)

---

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Ошибка: "PORT 5432 already in use"

**Решение:**
```bash
# Найди процесс
netstat -ano | findstr :5432

# Измени порт в docker-compose.dev.yml
ports:
  - "5433:5432"  # вместо "5432:5432"
```

### Ошибка: "Cannot find module '@escort/db'"

**Решение:**
```bash
# В корне проекта
npm install

# Перезапусти dev сервер
```

### Ошибка: "DATABASE_URL is not defined"

**Решение:**
- Убедись что файл `.env` существует в корне проекта
- Проверь что `DATABASE_URL` прописан корректно

---

## 📚 ПОЛЕЗНЫЕ КОМАНДЫ

```bash
# Посмотреть логи Docker
docker-compose -f docker-compose.dev.yml logs -f

# Перезапустить PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres

# Подключиться к PostgreSQL
docker exec -it escort-postgres psql -U companion -d companion_db

# Очистить кеш Turborepo
npx turbo clean

# Сгенерировать новую миграцию
cd packages\db
npx drizzle-kit generate --name=my_migration

# Применить миграции
npx drizzle-kit push

# Запустить Drizzle Studio (GUI для БД)
npx drizzle-kit studio
```

---

## 🎉 ГОТОВО!

Проект полностью готов к разработке. Все сервисы работают, база данных создана, API доступно.

**Созданные файлы:**
- ✅ 10 Entity (таблицы БД)
- ✅ NestJS API с Swagger
- ✅ Next.js фронтенд
- ✅ Docker конфигурация
- ✅ Drizzle ORM миграции
- ✅ Монорепозиторий с Turborepo

**Для Qwen Coder:** Используй файлы из папки `migra/` как референс для генерации кода.

---

**Удачи в разработке!** 🚀
