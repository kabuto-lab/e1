/**
 * PM2: явные cwd и путь к собранному API (Nest кладёт main.js в dist/apps/api/src/).
 * Запуск из корня монорепозитория:
 *   pm2 delete escort-api
 *   pm2 start ecosystem.config.cjs --only escort-api
 *   pm2 save
 *
 * escort-web не трогаем — оставь существующий процесс или заведи отдельно.
 */
const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'escort-api',
      cwd: root,
      script: path.join(root, 'apps/api/dist/apps/api/src/main.js'),
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
    },
  ],
};
