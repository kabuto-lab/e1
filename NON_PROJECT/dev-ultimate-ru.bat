@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: LOVNGE PLATFORM - ПОЛНЫЙ РАБОЧИЙ ПРОЦЕСС
:: ============================================================================
:: Этот скрипт:
:: 1. Проверяет статус серверов и запускает если нужно
:: 2. Открывает Qwen Code с ультра-подробным контекстом
:: 3. Спрашивает о вчерашнем прогрессе
:: 4. Показывает подробную дорожную карту и текущую позицию
:: 5. Фокус на: CMS + Редактор профилей + Видимость изображений + Fade Slider + Shader
:: ============================================================================

color 0A
title Lovnge Platform - Полный Рабочий Процесс

set "PROJECT_DIR=%~dp0"
set "API_PORT=3000"
set "WEB_PORT=3001"
set "QWEN_CMD=qwen"

:: ============================================================================
:: ЗАГОЛОВОК
:: ============================================================================
cls
echo.
echo ============================================================================
echo                  LOVNGE PLATFORM - ПОЛНЫЙ РАБОЧИЙ ПРОЦЕСС
echo ============================================================================
echo.
echo   Проект:    Lovnge Escort Platform CMS
echo   Директория: %PROJECT_DIR%
echo   Дата:      %DATE%
echo   Время:     %TIME%
echo.
echo   Цель: Сделать CMS полностью рабочей с редактированием профилей,
echo         управлением видимости изображений, fade slider фоном и
echo         water shader эффектом.
echo.
echo ============================================================================
echo.

:: ============================================================================
:: СЕКЦИЯ 1: ПРОВЕРКА СТАТУСА СЕРВЕРОВ
:: ============================================================================
echo [ШАГ 1/4] ПРОВЕРКА СТАТУСА СЕРВЕРОВ...
echo.

set "API_RUNNING=false"
set "WEB_RUNNING=false"

netstat -nno 2>nul | findstr ":%API_PORT%.*LISTENING" >nul
if not errorlevel 1 set "API_RUNNING=true"

netstat -nno 2>nul | findstr ":%WEB_PORT%.*LISTENING" >nul
if not errorlevel 1 set "WEB_RUNNING=true"

echo   API сервер (Порт %API_PORT%): 
if "%API_RUNNING%"=="true" (
    echo     [✓] РАБОТАЕТ
) else (
    echo     [✗] НЕ РАБОТАЕТ
)

echo   Web сервер (Порт %WEB_PORT%): 
if "%WEB_RUNNING%"=="true" (
    echo     [✓] РАБОТАЕТ
) else (
    echo     [✗] НЕ РАБОТАЕТ
)
echo.

:: ============================================================================
:: СЕКЦИЯ 2: ЗАПУСК СЕРВЕРОВ ЕСЛИ НУЖНО
:: ============================================================================
if "%API_RUNNING%"=="false" (
    echo [ШАГ 2/4] ЗАПУСК СЕРВЕРОВ...
    echo.
    
    :: Check Docker
    docker ps 2>nul | findstr "escort-" >nul
    if errorlevel 1 (
        echo   [!] Docker контейнеры не запущены. Запуск...
        cd /d "%PROJECT_DIR%"
        start "Docker Compose" cmd /k "docker-compose -f docker-compose.dev.yml up -d"
        timeout /t 8 /nobreak >nul
    ) else (
        echo   [✓] Docker контейнеры запущены
    )
    echo.
    
    :: Start API
    echo   Запуск API сервера (Порт %API_PORT%)...
    cd /d "%PROJECT_DIR%"
    start "Lovnge API" cmd /k "cd apps/api && echo API сервер запускается... && npm run dev"
    timeout /t 2 /nobreak >nul
    
    :: Start Web
    echo   Запуск Web сервера (Порт %WEB_PORT%)...
    start "Lovnge Web" cmd /k "cd apps/web && echo Web сервер запускается... && npm run dev"
    timeout /t 2 /nobreak >nul
    
    echo.
    echo   [✓] Серверы запускаются в новых окнах...
    echo   [i] Подождите 15-30 секунд для полного запуска
    echo.
    timeout /t 5 /nobreak >nul
    
    set "SERVERS_STARTED=true"
) else (
    echo [ШАГ 2/4] СЕРВЕРЫ УЖЕ ЗАПУЩЕНЫ
    echo.
    set "SERVERS_STARTED=false"
)

:: ============================================================================
:: СЕКЦИЯ 3: ГЕНЕРАЦИЯ УЛЬТРА-ПОДРОБНОГО ПРОМПТА
:: ============================================================================
echo [ШАГ 3/4] ГЕНЕРАЦИЯ КОНТЕКСТНОГО ПРОМПТА...
echo.

set "PROMPT_FILE=%TEMP%\lovnge_qwen_%RANDOM%.md"

(
echo # 🎯 LOVNGE PLATFORM - СЕССИЯ РАЗРАБОТКИ
echo.
echo **Дата:** %DATE% %TIME%
echo **Фокус:** CMS Редактор Профилей + Видимость Изображений + Fade Slider + Water Shader
echo.
echo ---
echo.
echo ## 📋 ОТЧЁТ О ВЧЕРАШНЕМ ПРОГРЕССЕ
echo.
echo ### Пожалуйста, опишите, что вы сделали вчера:
echo.
echo **Вопросы, которые помогут вспомнить:**
echo.
echo 1. **Редактор профилей**
echo    - Вы сделали UI форму редактирования?
echo    - Какие поля работают? (имя, био, атрибуты, ставки и т.д.)
echo    - Реализована ли валидация формы?
echo    - Работает ли функция сохранения/обновления?
echo.
echo 2. **Управление изображениями**
echo    - Можете ли вы загружать изображения в профиль?
echo    - Изображения успешно сохраняются в MinIO?
echo    - Можете ли вы удалять изображения?
echo    - Можете ли вы переупорядочивать или устанавливать главное фото?
echo.
echo 3. **База данных/API**
echo    - Были ли добавлены новые поля схемы для видимости изображений?
echo    - Обновлены ли API эндпоинты для новых функций?
echo    - Завершена ли миграция базы данных?
echo.
echo 4. **UI компоненты**
echo    - Созданы ли новые React компоненты?
echo    - Работает ли навигация dashboard?
echo    - Адаптировано ли для мобильных?
echo.
echo 5. **Исправленные баги**
echo    - Какие проблемы были решены?
echo.
echo ---
echo.
echo ## 🎯 ТЕКУЩАЯ ПОЗИЦИЯ В ДОРОЖНОЙ КАРТЕ
echo.
echo ### ГЕНЕРАЛЬНЫЙ ПЛАН: CMS → Публичный Профиль с Fade Slider + Shader
echo.
echo ```
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  ФАЗА 1: Core CMS (ТЕКУЩИЙ ФОКУС)                               │
echo │  Прогресс: [████████░░░░] 60%%                                  │
echo ├─────────────────────────────────────────────────────────────────┤
echo │  ✅ СДЕЛАНО:                                                    │
echo │  • Docker инфраструктура (PostgreSQL, Redis, MinIO, Mailhog)   │
echo │  • Схема базы данных (13 таблиц включая model_profiles)        │
echo │  • JWT система аутентификации                                   │
echo │  • Model CRUD API эндпоинты                                     │
echo │  • Dashboard UI layout                                          │
echo │  • Страница списка моделей                                      │
echo │  • Форма создания модели                                        │
echo │  • Страница загрузки фото (базовая)                             │
echo │                                                                 │
echo │  ⏳ В ПРОЦЕССЕ:                                                 │
echo │  • Страница редактирования профиля                              │
echo │  • Загрузка изображений с MinIO интеграцией                     │
echo │                                                                 │
echo │  ⏹️ СЛЕДУЕТ СДЕЛАТЬ - СРОЧНО:                                   │
echo │  • [ ] Переключатели видимости изображений                      │
echo │  • [ ] Система альбомов/категорий для изображений               │
echo │  • [ ] Компонент background fade slider                         │
echo │  • [ ] Интеграция water shader overlay                          │
echo │  • [ ] Режим предпросмотра (видят гости)                        │
echo │  • [ ] Адаптивный дизайн для мобильных                          │
echo └─────────────────────────────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  ФАЗА 2: Публичные Страницы Профилей (ДАЛЕЕ)                    │
echo │  Прогресс: [░░░░░░░░░░] 0%%                                      │
echo ├─────────────────────────────────────────────────────────────────┤
echo │  ⏹️ СЛЕДУЕТ СДЕЛАТЬ:                                            │
echo │  • Публичная страница профиля /models/[slug]                   │
echo │  • Fade slider background с выбранными изображениями            │
echo │  • Water shader overlay (из water_shader_stacked.html)         │
echo │  • Галерея изображений с lightbox                               │
echo │  • Контактная форма / форма бронирования                        │
echo │  • Отзывы и рейтинг надёжности                                  │
echo │  • VIP/Elite блокировка контента                                │
echo └─────────────────────────────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  ФАЗА 3: Система Бронирования (ПОЗЖЕ)                           │
echo │  Прогресс: [░░░░░░░░░░] 0%%                                      │
echo ├─────────────────────────────────────────────────────────────────┤
echo │  ⏹️ СЛЕДУЕТ СДЕЛАТЬ:                                            │
echo │  • Поток запросов на бронирование                              │
echo │  • Интеграция Escrow платежей                                   │
echo │  • Календарь доступности                                        │
echo │  • Workflow подтверждения                                       │
echo └─────────────────────────────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  ФАЗА 4: Продвинутые Функции (БУДУЩЕЕ)                          │
echo ├─────────────────────────────────────────────────────────────────┤
echo │  • CRM интеграция (Telegram/WhatsApp)                          │
echo │  • Dashboard аналитики                                          │
echo │  • Email верификация                                            │
echo │  • Система чёрных списков                                       │
echo │  • Инструменты модерации администратора                         │
echo └─────────────────────────────────────────────────────────────────┘
echo ```
echo.
echo ---
echo.
echo ## 🎨 СПЕЦИФИКАЦИЯ ФУНКЦИЙ: Видимость Изображений + Fade Slider + Shader
echo.
echo ### Что мы строим:
echo.
echo **1. Управление видимостью изображений (CMS)**
echo ```
echo В редакторе профиля каждое изображение должно иметь:
echo - [✓] Чекбокс: "Показывать в публичном профиле"
echo - [✓] Бейдж видимости (Видимый/Скрытый)
echo - [✓] Массовый выбор нескольких изображений
echo - [✓] Фильтр: Только видимые / только скрытые
echo ```
echo.
echo **2. Система альбомов/категорий**
echo ```
echo Изображения могут быть организованы в альбомы:
echo - Portfolio (публичное)
echo - VIP (приватное, требуется вход)
echo - Elite (приватное, требуется верификация)
echo - Verified (одобрено админом)
echo.
echo Каждый альбом имеет:
echo - Название
echo - Настройка видимости (публичное/приватное/с блокировкой)
echo - Изображение обложки
echo - Порядок сортировки
echo ```
echo.
echo **3. Background Fade Slider**
echo ```
echo На публичной странице профиля:
echo - Full-screen background slider
echo - Использует только изображения с пометкой "visible"
echo - Плавные crossfade переходы (по умолчанию: 5 секунд)
echo - Настраивается для каждого профиля в CMS
echo - Адаптивный для мобильных
echo - Оптимизированная производительность (lazy loading)
echo ```
echo.
echo **4. Water Shader Overlay**
echo ```
echo Перенести Three.js shader из water_shader_stacked.html:
echo - Применить как overlay слой поверх fade slider
echo - Эффект ряби/искажения
echo - Fallback для мобильных (отключить shader)
echo - Контроль интенсивности в CMS (0-100%%)
echo - Контроль скорости анимации
echo ```
echo.
echo ---
echo.
echo ## 🔧 ПЛАН ТЕХНИЧЕСКОЙ РЕАЛИЗАЦИИ
echo.
echo ### Шаг 1: Обновления схемы базы данных
echo ```sql
echo -- Добавить в таблицу model_profiles или создать новую:
echo ALTER TABLE model_profiles ADD COLUMN fade_slider_enabled BOOLEAN DEFAULT false;
echo ALTER TABLE model_profiles ADD COLUMN fade_slider_speed INTEGER DEFAULT 5000;
echo ALTER TABLE model_profiles ADD COLUMN shader_intensity INTEGER DEFAULT 50;
echo.
echo -- Создать таблицу image_visibility:
echo CREATE TABLE profile_image_visibility (
echo   id UUID PRIMARY KEY,
echo   profile_id UUID REFERENCES model_profiles(id),
echo   media_id UUID REFERENCES media_files(id),
echo   is_visible BOOLEAN DEFAULT true,
echo   album_category VARCHAR(50) DEFAULT 'portfolio',
echo   sort_order INTEGER DEFAULT 0,
echo   created_at TIMESTAMP DEFAULT NOW()
echo );
echo ```
echo.
echo ### Шаг 2: Backend API эндпоинты
echo ```typescript
echo // apps/api/src/models/models.controller.ts
echo PUT /models/:id/visibility       -- Обновить видимость изображений
echo GET /models/:id/public-images    -- Получить только видимые изображения
echo PUT /models/:id/slider-settings  -- Обновить настройки fade slider
echo.
echo // apps/api/src/media/media.controller.ts
echo POST /media/upload-multiple      -- Массовая загрузка изображений
echo PUT /media/:id/album             -- Переместить изображение в альбом
echo ```
echo.
echo ### Шаг 3: CMS UI компоненты
echo ```tsx
echo // apps/web/app/dashboard/models/[id]/edit/page.tsx
echo - Добавить секцию переключателей видимости
echo - Добавить селектор альбомов/категорий
echo - Добавить предпросмотр fade slider
echo - Добавить слайдер интенсивности shader
echo.
echo // Новый компонент: apps/web/components/ImageVisibilityGrid.tsx
echo - Grid вид всех изображений
echo - Чекбоксы поверх изображений
echo - Drag-drop переупорядочивание
echo - Панель массовых действий
echo ```
echo.
echo ### Шаг 4: Страница публичного профиля
echo ```tsx
echo // apps/web/app/models/[slug]/page.tsx
echo - Создать публичную страницу профиля
echo - Получить только видимые изображения
echo - Реализовать fade slider background
echo - Добавить water shader overlay
echo - Добавить секции контента (био, атрибуты, контакт)
echo ```
echo.
echo ### Шаг 5: Интеграция shader
echo ```typescript
echo // apps/web/components/WaterShaderOverlay.tsx
echo - Перенести Three.js setup из water_shader_stacked.html
echo - Принимать image texture как вход
echo - Применять эффект искажения
echo - Мониторинг производительности
echo - Определение мобильных + fallback
echo ```
echo.
echo ---
echo.
echo ## 📁 КЛЮЧЕВЫЕ ФАЙЛЫ ДЛЯ РАБОТЫ
echo.
echo ### Backend (NestJS)
echo ```
echo apps/api/src/
echo ├── models/
echo │   ├── models.controller.ts      ← Model CRUD + новые эндпоинты видимости
echo │   ├── models.service.ts         ← Бизнес логика
echo │   └── dto/                       ← Типы запросов/ответов
echo ├── media/
echo │   ├── media.controller.ts       ← Загрузка файлов + presigned URLs
echo │   └── media.service.ts          ← MinIO интеграция
echo └── app.module.ts                 ← Импорты модулей
echo ```
echo.
echo ### Frontend (Next.js)
echo ```
echo apps/web/app/
echo ├── dashboard/
echo │   └── models/
echo │       ├── list/page.tsx         ← Список моделей (работает)
echo │       ├── create/page.tsx       ← Форма создания (работает)
echo │       └── [id]/
echo │           ├── edit/page.tsx     ← Форма редактирования (В ПРОЦЕССЕ)
echo │           ├── photos/page.tsx   ← Загрузка фото (работает)
echo │           └── view/page.tsx     ← Режим просмотра
echo └── models/
echo     └── [slug]/
echo         └── page.tsx              ← Публичный профиль (TODO)
echo.
echo apps/web/components/
echo ├── ImageVisibilityGrid.tsx       ← NEW: Контроль видимости
echo ├── FadeSlider.tsx                ← NEW: Background slider
echo └── WaterShaderOverlay.tsx        ← NEW: Shader компонент
echo ```
echo.
echo ### Справочные файлы
echo ```
echo water_shader_stacked.html         ← Справочник по Three.js water ripple эффекту
echo packages/db/src/schema/
echo └── model_profiles.ts             ← Схема базы данных
echo ```
echo.
echo ---
echo.
echo ## 🚀 НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ
echo.
echo ### Цели на сегодня (Выберите 1-2 для фокуса):
echo.
echo **Вариант A: Завершить редактор профилей**
echo - [ ] Завершить все поля формы
echo - [ ] Добавить переключатели видимости изображений
echo - [ ] Реализовать live предпросмотр
echo - [ ] Добавить валидацию и обработку ошибок
echo.
echo **Вариант B: Создать Fade Slider**
echo - [ ] Создать компонент FadeSlider
echo - [ ] Реализовать плавный crossfade
echo - [ ] Добавить опции конфигурации
echo - [ ] Протестировать с несколькими изображениями
echo.
echo **Вариант C: Интегрировать Water Shader**
echo - [ ] Перенести Three.js код в React компонент
echo - [ ] Применить как overlay на fade slider
echo - [ ] Добавить контроль интенсивности/скорости
echo - [ ] Реализовать fallback для мобильных
echo.
echo **Вариант D: Страница публичного профиля**
echo - [ ] Создать маршрут /models/[slug]
echo - [ ] Получить и отобразить видимые изображения
echo - [ ] Добавить fade slider background
echo - [ ] Добавить shader overlay
echo.
echo ---
echo.
echo ## ❓ ВОПРОСЫ ДЛЯ ВАС (Разработчик)
echo.
echo **Пожалуйста, ответьте на это, чтобы получить персонализированную помощь:**
echo.
echo 1. **Что вы завершили вчера?**
echo    - Будьте конкретны о реализованных функциях
echo    - Упомяните любые изменённые файлы
echo    - Отметьте любые исправленные баги
echo.
echo 2. **Что сейчас работает?**
echo    - Можете ли вы редактировать профиль модели прямо сейчас?
echo    - Можете ли вы загружать изображения?
echo    - Изображения правильно сохраняются в MinIO?
echo    - Что сломано или не завершено?
echo.
echo 3. **Что вы хотите построить сегодня?**
echo    - Выберите из Вариантов A-D выше
echo    - Или опишите свою собственную цель
echo.
echo 4. **Есть ли какие-либо блокеры или проблемы?**
echo    - Ошибки API?
echo    - Проблемы с базой данных?
echo    - UI баги?
echo    - Проблемы с производительностью?
echo.
echo ---
echo.
echo ## 📊 БЫСТРАЯ ПРОВЕРКА СТАТУСА
echo.
echo.
echo ### Текущий статус серверов:
echo API сервер (Порт %API_PORT%): %API_RUNNING%
echo Web сервер (Порт %WEB_PORT%): %WEB_RUNNING%
echo.
echo ### Docker контейнеры:
) >> "%PROMPT_FILE%"

:: Add Docker status
docker ps --format "  - {{.Names}}: {{.Status}}" 2>nul >> "%PROMPT_FILE%" || echo "  - Docker не запущен" >> "%PROMPT_FILE%"

(
echo.
echo ---
echo.
echo ## 💬 НАЧНЁМ
echo.
echo Я готов помочь вам создать Lovnge Platform CMS. Пожалуйста:
echo.
echo 1. **Опишите вчерашний прогресс** (что вы построили, что работает)
echo 2. **Скажите сегодняшнюю цель** (на чём хотите сфокусироваться)
echo 3. **Упомяните любые проблемы** (баги, ошибки, блокеры)
echo.
echo Как только я пойму, где мы находимся, я помогу вам:
echo - Рассмотреть текущую реализацию
echo - Запланировать следующие шаги
echo - Реализовать функции шаг за шагом
echo - Протестировать и проверить, что всё работает
echo.
echo **Что вы сделали вчера, и что мы должны построить сегодня?** 🎯
echo.
) >> "%PROMPT_FILE%"

:: Add dynamic status
(
echo.
echo ---
echo.
echo ## 📈 АВТОМАТИЧЕСКИ ОПРЕДЕЛЁННЫЙ СТАТУС ПРОЕКТА
echo.
) >> "%PROMPT_FILE%"

:: Check key files
if exist "%PROJECT_DIR%apps\web\app\dashboard\models\[id]\edit\page.tsx" (
    echo   [✓] Страница редактора профилей существует >> "%PROMPT_FILE%"
) else (
    echo   [✗] Страница редактора профилей отсутствует >> "%PROMPT_FILE%"
)

if exist "%PROJECT_DIR%apps\web\app\dashboard\models\[id]\photos\page.tsx" (
    echo   [✓] Страница загрузки фото существует >> "%PROMPT_FILE%"
) else (
    echo   [✗] Страница загрузки фото отсутствует >> "%PROMPT_FILE%"
)

if exist "%PROJECT_DIR%apps\api\src\models\models.controller.ts" (
    echo   [✓] Models API controller существует >> "%PROMPT_FILE%"
) else (
    echo   [✗] Models API controller отсутствует >> "%PROMPT_FILE%"
)

if exist "%PROJECT_DIR%water_shader_stacked.html" (
    echo   [✓] Справочник water shader доступен >> "%PROMPT_FILE%"
) else (
    echo   [✗] Справочник water shader отсутствует >> "%PROMPT_FILE%"
)

echo. >> "%PROMPT_FILE%"

echo   Файл промпта создан: %PROMPT_FILE%
echo.

:: ============================================================================
:: СЕКЦИЯ 4: ОТКРЫТИЕ QWEN CODE
:: ============================================================================
echo [ШАГ 4/4] ОТКРЫТИЕ QWEN CODE...
echo.

cd /d "%PROJECT_DIR%"

:: Open Qwen with the comprehensive prompt
start "Qwen Code - Lovnge Разработка" cmd /k "%QWEN_CMD% --prompt-file "%PROMPT_FILE%""

timeout /t 2 /nobreak >nul

:: ============================================================================
:: ПОДВАЛ
:: ============================================================================
echo.
echo ============================================================================
echo                      РАБОЧИЙ ПРОЦЕСС ЗАПУЩЕН
echo ============================================================================
echo.
echo   🖥️  СЕРВЕРЫ:
if "%API_RUNNING%"=="true" (
    echo     [✓] API  - Работает на http://localhost:%API_PORT%
) else (
    echo     [→] API  - Запускается... (проверьте окно "Lovnge API")
)

if "%WEB_RUNNING%"=="true" (
    echo     [✓] Web  - Работает на http://localhost:%WEB_PORT%
) else (
    echo     [→] Web  - Запускается... (проверьте окно "Lovnge Web")
)
echo.
echo   🤖 QWEN CODE:
echo     [✓] Запущен с подробным контекстным промптом
echo     [i] Ответьте на вопросы, чтобы получить персонализированную помощь
echo.
echo   🔗 БЫСТРЫЕ ССЫЛКИ:
echo     API Swagger:  http://localhost:%API_PORT%/api/docs
echo     Web App:      http://localhost:%WEB_PORT%
echo     MinIO:        http://localhost:9001
echo     Mailhog:      http://localhost:8025
echo.
echo   📋 СЛЕДУЮЩИЕ ШАГИ:
echo     1. Подождите полного запуска серверов (15-30 секунд)
echo     2. В Qwen ответьте на вопросы о вчерашнем прогрессе
echo     3. Скажите сегодняшнюю цель
echo     4. Следуйте плану реализации вместе с Qwen
echo.
echo ============================================================================
echo.

:: Cleanup
del "%PROMPT_FILE%" 2>nul

echo   Нажмите любую клавишу для закрытия этого окна...
pause >nul
