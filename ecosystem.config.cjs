/**
 * PM2: явные cwd и путь к собранному API (Nest кладёт main.js в dist/apps/api/src/).
 * Запуск из корня монорепозитория:
 *   pm2 delete escort-api
 *   pm2 start ecosystem.config.cjs --only escort-api
 *   pm2 save
 *
 * ВАЖНО после правки .env (в т.ч. DATABASE_URL):
 *   «pm2 restart» без перезапуска из ecosystem может оставить старые переменные в процессе.
 *   Надёжно: pm2 delete escort-api && pm2 start ecosystem.config.cjs --only escort-api
 *
 * escort-web не трогаем — оставь существующий процесс или заведи отдельно.
 */
const fs = require('fs');
const path = require('path');
const root = __dirname;

let envFromFile = {};
const envPath = path.join(root, '.env');
try {
  if (fs.existsSync(envPath)) {
    envFromFile = require('dotenv').parse(fs.readFileSync(envPath, 'utf8'));
  }
} catch (e) {
  console.warn('[ecosystem.config.cjs] .env parse:', e.message);
}

module.exports = {
  apps: [
    {
      name: 'escort-api',
      cwd: root,
      script: path.join(root, 'apps/api/dist/apps/api/src/main.js'),
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        ...envFromFile,
        NODE_ENV: envFromFile.NODE_ENV || process.env.NODE_ENV || 'production',
      },
    },
  ],
};
