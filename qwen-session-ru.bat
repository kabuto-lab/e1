@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: QWEN SESSION - Интерактивное отслеживание прогресса
:: ============================================================================
:: Этот скрипт открывает Qwen Code и предлагает вам сообщить о вчерашнем
:: прогрессе, затем предоставляет подробное руководство по дорожной карте.
:: ============================================================================

color 0B
title Lovnge Platform - Сессия Qwen

set "PROJECT_DIR=%~dp0"
set "QWEN_CMD=qwen"

echo.
echo ============================================================================
echo                    QWEN CODE - СЕССИЯ РАЗРАБОТКИ
echo ============================================================================
echo.
echo   Открытие Qwen Code с интерактивным вопросником о прогрессе...
echo.

:: Create comprehensive session prompt
set "PROMPT_FILE=%TEMP%\qwen_session_%RANDOM%.md"

(
echo # Lovnge Platform - Сессия Разработки
echo.
echo **Дата:** %DATE% %TIME%
echo.
echo ---
echo.
echo ## 📋 ОТЧЁТ О ПРОГРЕССЕ - Пожалуйста, ответьте на эти вопросы:
echo.
echo ### 1. Что вы сделали вчера?
echo.
echo Будьте конкретны о том, что было реализовано:
echo.
echo - [ ] **Редактор профилей**: Вы завершили UI формы редактирования?
echo   - Можете ли вы редактировать основную информацию (имя, slug, био)?
echo   - Можете ли вы редактировать физические атрибуты (возраст, рост, вес)?
echo   - Можете ли вы редактировать ставки (почасовая, за ночь)?
echo   - Можете ли вы переключать статус VIP/Elite?
echo.
echo - [ ] **Управление изображениями**: 
echo   - Можете ли вы загружать изображения в профиль?
echo   - Можете ли вы удалять изображения?
echo   - Можете ли вы переупорядочивать изображения?
echo   - Можете ли вы устанавливать главное/профильное фото?
echo.
echo - [ ] **Изменения в базе данных**:
echo   - Были ли добавлены новые таблицы/столбцы?
echo   - Работают ли миграции?
echo   - Завершена ли интеграция хранилища MinIO?
echo.
echo - [ ] **Другие функции**:
echo   - Что ещё было реализовано?
echo.
echo ---
echo.
echo ### 2. Текущий статус работы
echo.
echo Пожалуйста, протестируйте и сообщите, что сейчас функционально:
echo.
echo | Функция | Статус | Примечания |
echo |---------|--------|------------|
echo | Вход/Аутентификация | ✅/❌/⚠️ | |
echo | Dashboard | ✅/❌/⚠️ | |
echo | Список моделей | ✅/❌/⚠️ | |
echo | Создание модели | ✅/❌/⚠️ | |
echo | Редактирование модели | ✅/❌/⚠️ | |
echo | Загрузка фото | ✅/❌/⚠️ | |
echo | Просмотр профиля | ✅/❌/⚠️ | |
echo.
echo ---
echo.
echo ### 3. Немедленная следующая задача
echo.
echo На чём вы хотите сфокусироваться СЕГОДНЯ? Выберите из:
echo.
echo **Вариант A: Завершение редактора профилей**
echo - Завершить все поля формы на странице редактирования
echo - Добавить валидацию и обработку ошибок
echo - Реализовать live предпросмотр
echo.
echo **Вариант B: Система видимости изображений**
echo - Добавить переключатель "Показывать в публичном профиле" для каждого изображения
echo - Создать систему альбомов/категорий
echo - Создать UI настроек видимости
echo.
echo **Вариант C: Background Fade Slider**
echo - Реализовать слайдер фоновых изображений
echo - Добавить плавные crossfade переходы
echo - Сделать настраиваемым для каждого профиля
echo.
echo **Вариант D: Интеграция Water Shader**
echo - Перенести shader из water_shader_stacked.html
echo - Применить как overlay на странице профиля
echo - Оптимизировать для производительности
echo.
echo ---
echo.
echo ### 4. Баги или блокеры
echo.
echo Столкнулись ли вы с какими-либо техническими проблемами?
echo.
echo - [ ] Ошибки API (укажите эндпоинт)
echo - [ ] Проблемы подключения к базе данных
echo - [ ] Ошибки загрузки изображений
echo - [ ] Проблемы отображения UI
echo - [ ] Проблемы с производительностью
echo - [ ] Другое (опишите)
echo.
echo ---
echo.
echo ## 🎯 ТЕКУЩАЯ ПОЗИЦИЯ В ДОРОЖНОЙ КАРТЕ
echo.
echo ### Фаза 1: Core CMS [ТЕКУЩАЯ ФАЗА]
echo ```
echo Прогресс: [____/100%%]
echo.
echo ✅ Завершено:
echo - Docker инфраструктура (PostgreSQL, Redis, MinIO, Mailhog)
echo - Схема базы данных (13 таблиц)
echo - JWT аутентификация
echo - Basic model CRUD эндпоинты
echo - Dashboard UI skeleton
echo.
echo ⏳ В процессе:
echo - UI редактора профилей (поля формы, валидация)
echo - Загрузка изображений с MinIO presigned URLs
echo - Страница управления фото
echo.
echo ⏹️ Ожидается:
echo - [ ] Переключатели видимости изображений (показать/скрыть в публичном профиле)
echo - [ ] Организация альбомов/категорий
echo - [ ] Компонент background fade slider
echo - [ ] Интеграция water shader overlay
echo - [ ] Адаптивный дизайн для мобильных
echo - [ ] SEO метаданные для каждого профиля
echo ```
echo.
echo ### Фаза 2: Публичные Страницы Профилей [ДАЛЕЕ]
echo ```
echo ⏹️ Ожидается:
echo - Публичная страница профиля с fade slider + shader
echo - Галерея изображений с lightbox
echo - Контактная форма/форма бронирования
echo - Отображение отзывов и рейтингов
echo - Блокировка VIP контента
echo ```
echo.
echo ### Фаза 3: Продвинутые Функции [ПОЗЖЕ]
echo ```
echo ⏹️ Ожидается:
echo - Интеграция Escrow платежей
echo - State машина системы бронирования
echo - Расчёты отзывов/рейтингов
echo - Автоматизация чёрных списков
echo - Email верификация
echo - Dashboard аналитики
echo ```
echo.
echo ---
echo.
echo ## 🔧 ТЕХНИЧЕСКИЙ КОНТЕКСТ
echo.
echo ### Стек технологий
echo - **Frontend:** Next.js 15, React 19, TypeScript, TailwindCSS, Three.js
echo - **Backend:** NestJS 10, Drizzle ORM, PostgreSQL 16
echo - **Хранилище:** MinIO (S3-compatible)
echo - **Аутентификация:** JWT с refresh токенами
echo.
echo ### Ключевые файлы
echo ```
echo CMS Страницы:
echo   - apps/web/app/dashboard/models/list/page.tsx
echo   - apps/web/app/dashboard/models/[id]/edit/page.tsx
echo   - apps/web/app/dashboard/models/[id]/photos/page.tsx
echo.
echo Backend:
echo   - apps/api/src/models/models.controller.ts
echo   - apps/api/src/models/models.service.ts
echo   - packages/db/src/schema/model_profiles.ts
echo.
echo Справочник Shader:
echo   - water_shader_stacked.html
echo ```
echo.
echo ### API Endpoints
echo ```
echo GET    /models              - Список всех моделей
echo GET    /models/id/:id       - Получить одну модель
echo POST   /models              - Создать модель
echo PUT    /models/id/:id       - Обновить модель
echo DELETE /models/id/:id       - Удалить модель
echo POST   /media/presign      - Получить presigned URL для загрузки
echo ```
echo.
echo ---
echo.
echo ## 🚀 ПЛАН ДЕЙСТВИЙ ДЛЯ ЭТОЙ СЕССИИ
echo.
echo Основываясь на ваших ответах выше, я помогу вам:
echo.
echo 1. **Оценить текущее состояние** - Рассмотреть что работает vs сломано
echo 2. **Запланировать следующие шаги** - Определить наиболее важную задачу
echo 3. **Реализовать функции** - Строить одну функцию за раз
echo 4. **Тестировать и проверить** - Убедиться, что всё работает правильно
echo.
echo ---
echo.
echo **Пожалуйста, начните с ответов на вопросы выше. Я готов помочь!** 🎯
echo.
) > "%PROMPT_FILE%"

cd /d "%PROJECT_DIR%"

:: Open Qwen Code with the prompt file
start "Qwen Code - Сессия Lovnge" cmd /k "%QWEN_CMD% --prompt-file "%PROMPT_FILE%""

timeout /t 2 /nobreak >nul

echo.
echo   [OK] Qwen Code запущен!
echo.
echo   Файл промпта содержит:
echo     - Вопросник о прогрессе
echo     - Текущая позиция в дорожной карте
echo     - Технический контекст
echo     - Шаблон плана действий
echo.
echo   Ответьте на вопросы в Qwen, чтобы получить персонализированную помощь.
echo.

:: Cleanup
del "%PROMPT_FILE%" 2>nul

pause
