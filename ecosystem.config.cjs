/**
 * PM2: cwd = корень репо; .env читается при каждом startOrReload этого файла.
 *
 * Из корня репозитория:
 *   npm run pm2:reload-api
 * или:
 *   pm2 startOrReload ecosystem.config.cjs --only escort-api
 *   pm2 save
 *
 * НЕ используйте «pm2 restart escort-api» после смены .env — процесс сохранит старый DATABASE_URL.
 * startOrReload заново выполняет ecosystem.config.cjs и подхватывает свежий .env.
 *
 * После git pull на VPS: npm run vps:after-pull
 * (ensure:database = проверка + при Docker Postgres и 28P01 авто-ALTER USER под .env).
 * Вручную: npm ci, build, npm run ensure:database, pm2:reload-api.
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
      script: path.join(root, 'scripts/start-api-prod.mjs'),
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
