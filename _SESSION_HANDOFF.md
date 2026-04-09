# Session handoff — контекст для следующего агента

Документ создан по запросу: сохранить историю и «что к чему», чтобы в новой сессии было понятно состояние дел.

---

## 1. Ошибка логина «База данных или другой сетевой сервис недоступен»

- **Смысл:** Nest API отдаёт **503** и сообщение клиенту, когда срабатывает логика «upstream недоступен» (часто `ECONNREFUSED` / таймаут к PostgreSQL, иногда Redis и т.д.) — см. `GlobalExceptionFilter` в `apps/api/src/main.ts`.
- **Прод vs локальная разработка:** раньше везде показывался текст про Docker Desktop; для production это вводило в заблуждение.

### Правка в репозитории

- **Файл:** `apps/api/src/main.ts`
- **Суть:** для `NODE_ENV === 'development'` — старое сообщение с Docker и `docker-compose.dev.yml`; иначе — нейтральное про проверку PostgreSQL/зависимостей и `DATABASE_URL` у процесса API.
- **Деплой:** после merge нужны `git pull` → сборка → `pm2 restart escort-api` на VPS (если правка ещё не на сервере).

---

## 2. VPS `mejpparetd`, путь приложения `~/e1` (root)

### Симптомы

- Логин на сайте с ошибкой про недоступную БД.
- `.env` в `/root/e1/.env`: `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/companion_db`, Redis/MinIO на localhost, публичные URL на IP `45.9.40.37`, **`NODE_ENV=development`** (на проде лучше позже сменить на `production`).

### Диагностика (порядок)

1. `ss -tlnp | grep 5432` — порт слушает **`docker-proxy`** → Postgres в Docker, порт проброшен на хост. Для API на хосте **`127.0.0.1:5432` корректен**.
2. На хосте не было `psql` — предлагали `docker exec` или установку клиента.
3. `docker exec escort-postgres psql -U postgres -d companion_db -c 'select 1'` — **успех** (БД и пользователь существуют).
4. Проверка **с хоста по TCP** (как у Node):
   `docker run --rm --network host postgres:16-alpine psql "postgresql://postgres:postgres@127.0.0.1:5432/companion_db" -c 'select 1'`
   — **ошибка:** `password authentication failed for user "postgres"`.

### Корневая причина

- Внутри контейнера `psql` по сокету часто **не проверяет тот же пароль**, что TCP с хоста.
- Реальный пароль роли `postgres` для **сетевых** подключений **не совпадал** с паролем в `DATABASE_URL`.

### Исправление на сервере (выполнено пользователем)

```bash
docker exec escort-postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

После этого проверка с хоста через `docker run --network host ...` дала `(1 row)`, затем **`pm2 restart escort-api`**.

### PM2

- При смене переменных окружения иногда нужно **`pm2 restart escort-api --update-env`** (PM2 сам подсказывает).

---

## 3. Задача: мобильное главное меню + бриф для Kimi

### Бриф (английский) для внешнего ИИ

- **Файл:** `prototypes/KIMI_BRIEF_MOBILE_MAIN_MENU.md`  
- Скопировать содержимое в Kimi: бренд Lovnge, токены из `DESIGN.md`, только mobile, safe-area, a11y, `prefers-reduced-motion`, формат ответа (спека + поведение).

### Три HTML-прототипа (стиль сайта: Unbounded, Inter, `#0A0A0A`, `#D4AF37`, grain)

| Файл | Идея |
|------|------|
| `prototypes/mobile-main-menu-01-vault.html` | Fullscreen «vault», blur фона, SVG-кольцо, крупная навигация |
| `prototypes/mobile-main-menu-02-orbit.html` | Нижний хаб «Меню», веер из 5 пунктов, скрим |
| `prototypes/mobile-main-menu-03-chapter.html` | Правая полоса-peek, выезд панели, горизонтальный snap «глав» |

---

## 4. Прочее из более раннего контекста (summary чата)

- Деплой по SSH в `~/e1`, `pm2` процессы **`escort-api`**, **`escort-web`**.
- Git push с машины агента мог не пройти (GCM/TTY) — пользователь пушил сам.
- В `docker-compose.dev.yml` контейнер Postgres: **`escort-postgres`**, образ `postgres:16-alpine`, пользователь/пароль по умолчанию в примере `postgres`/`postgres`, БД `companion_db`.

---

## 5. Открытые пункты (todo из чата, не закрыты здесь)

- Модель привязки: `telegram_user_id` ↔ user/manager ↔ model (роли, белый список).
- Черновик/публикация из бота и обязательность модерации.
- Лимиты фото, главное фото, parity с веб-кабинетом.

---

## 6. Как пользоваться этим файлом

- В новой сессии: «прочитай `_SESSION_HANDOFF.md`» или прикрепи файл — краткий конспект выше.
- **Не хранить в этом файле секреты** (JWT, пароли, ключи). Операционные шаги — да, секреты — только в `.env` на сервере.

---

*Последнее обновление: зафиксировано по запросу пользователя о полном сохранении контекста сессии.*
