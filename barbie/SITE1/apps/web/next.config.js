/** @type {import('next').NextConfig} */
const path = require('path');

const isWin = process.platform === 'win32';

const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:3010';

const nextConfig = {
  reactStrictMode: true,
  // SITE1 вложен в монорепо ES → два package-lock.json (ES/ и SITE1/),
  // и Next.js по умолчанию выбирает корнем родительский ES. Явно
  // фиксируем корень file-tracing на SITE1 (два уровня выше apps/web).
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  // На Windows иногда сегает SWC build worker — отключаем.
  ...(isWin ? { experimental: { webpackBuildWorker: false } } : {}),

  // Dev-прокси /api → NestJS на 3010. В prod nginx делает то же самое.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
      {
        source: '/v1/:path*',
        destination: `${API_BASE}/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
