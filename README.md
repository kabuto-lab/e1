# MyMuse

Код сайта https://mymuseclub.com. Основная ветка: **main**.

Начало работы: [локальный запуск и база](docs/handover/README.md).
Порядок разработки: [ветки, проверки и публикация](docs/WORKFLOW.md).

## Актуальная основа

В main собраны исходники текущего рабочего сайта, исправления безопасности,
оплаты, каталога и Метрики. Они больше не требуют отдельного наложения
production-security-overlay.patch.

Загрузка фото сохраняет исходный формат и ключ объекта, как на рабочем сайте.
Автоматическое преобразование новых загрузок в AVIF не включено. Утилита AVIF
оставлена отдельно, её совместимость с Sharp проверяется тестами.

Работающий production пока остаётся прежней смешанной сборкой. Обновление
исходников в GitHub само по себе не обновляет сайт.
Состояние сервера зафиксировано в [production-source.json](docs/handover/production-source.json).

## Начало работы

Нужны Node.js 22, npm 10.9.0 и Docker Compose.

```sh
git clone https://github.com/kabuto-lab/e1.git MyMuse
cd MyMuse
git switch -c feature/my-task
node docs/handover/generate-env.mjs .
docker compose --env-file .env -f docs/handover/compose.dev.yml up -d
npm ci
```

Далее восстанови полученный dump по инструкции в docs/handover/README.md.
Боевые ключи, база и файлы фотографий в Git не входят.

## Изменения

Каждая задача делается в отдельной ветке от свежего main. После push открой
pull request в main. CI проверяет зависимости, тесты и полную сборку проекта.
Ошибку исправляют в той же ветке, затем делают новый push.

Публикация выполняется отдельно из проверенного коммита. Прямые исправления
в папке рабочего релиза и старые команды PM2 не используются.

## Где лежит код

- apps/api: NestJS API.
- apps/web: Next.js сайт и кабинеты.
- apps/bot: отдельный Telegram-контур, не запускать с боевым токеном поверх embedded-бота API.
- packages/db: Drizzle, схема и миграции PostgreSQL.

Старый README сохранён в docs/archive/README-before-20261123.md.
Старые указания про PM2, ~/e1 и vps:after-pull не описывают текущий production.
