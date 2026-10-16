/**
 * PM2: ПАРАЛЛЕЛЬНЫЙ предпросмотр ветки на VPS — рядом с основным деплоем (main).
 *
 * Отдельный git worktree + своё PM2-приложение на своём порту, чтобы основной сайт
 * (ecosystem.config.cjs: escort-web :3001, escort-api :3000, nginx 80/443) не трогать.
 * Предпросмотр открывается по IP:порту, домен и сертификат не нужны.
 *
 * Готовит и запускает всё scripts/vps-preview.sh:
 *   bash ~/e1-preview/scripts/vps-preview.sh
 * Ручной вариант обновления после сборки:
 *   pm2 startOrReload ~/e1-preview/ecosystem.preview.config.cjs --only escort-web-preview --update-env
 *
 * Имя файла принципиально: PM2 распознаёт конфиг только по расширениям .config.js, .config.cjs,
 * .config.mjs, .json, .yaml (lib/Common.js, knonwConfigFileExtensions). Файл с другим именем
 * (например ecosystem.preview.cjs) PM2 считает обычным скриптом — запускает его как код,
 * берёт имя приложения из имени файла и игнорирует --only.
 *
 * env берётся из .env рядом с этим файлом (в worktree это симлинк на ~/e1/.env).
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const envPath = path.join(root, '.env');

let envFromFile = {};
try {
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
    envFromFile = require('dotenv').parse(raw);
  }
} catch (e) {
  console.warn('[ecosystem.preview.config.cjs] .env parse:', e.message);
}

const port = process.env.PREVIEW_PORT || envFromFile.PREVIEW_PORT || '3002';
const appName = process.env.PREVIEW_APP || envFromFile.PREVIEW_APP || 'escort-web-preview';

// CLI Next ищем рядом с приложением: npm workspaces поднимают пакет в корень монорепо.
let nextBin = path.join(root, 'node_modules/next/dist/bin/next');
try {
  const nextPkg = require.resolve('next/package.json', { paths: [path.join(root, 'apps/web')] });
  nextBin = path.join(path.dirname(nextPkg), 'dist/bin/next');
} catch (e) {
  console.warn('[ecosystem.preview.config.cjs] не нашёл next, беру путь по умолчанию:', nextBin);
}

module.exports = {
  apps: [
    {
      name: appName,
      cwd: path.join(root, 'apps/web'),
      script: nextBin,
      args: `start -p ${port}`,
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        ...envFromFile,
        NODE_ENV: 'production',
        // Предпросмотр открывается по IP:порту, поэтому браузер должен ходить на /api того же
        // origin, а Next — проксировать его на локальный Nest основного деплоя. Свой API не
        // поднимаем: второй инстанс конфликтовал бы по Telegram-боту и TON-индексатору.
        NEXT_PUBLIC_API_URL: '',
        API_PROXY_UPSTREAM: process.env.API_PROXY_UPSTREAM || 'http://127.0.0.1:3000',
        PREVIEW_PORT: port,
      },
    },
  ],
};
