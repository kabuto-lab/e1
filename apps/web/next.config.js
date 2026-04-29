/** @type {import('next').NextConfig} */
const path = require('path');
const isWin = process.platform === 'win32';
// Set NEXT_STANDALONE=1 in Docker build to enable minimal standalone output
const isDocker = process.env.NEXT_STANDALONE === '1';

const nextConfig = {
  reactStrictMode: true,
  // Workaround for Next.js monorepo devtools/runtime manifest instability on Windows.
  // Disables dev indicator/devtools launcher that triggers segment-explorer module lookups.
  devIndicators: false,
  /** Чтобы <img crossOrigin> / WebGL могли читать ответы прокси картинок в Chromium. */
  async headers() {
    return [
      {
        source: '/pic-proxy/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
      {
        source: '/img-proxy/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
  // Windows: native build workers (SWC / webpack child) sometimes crash with 0xC0000005 (3221225477).
  ...(isWin
    ? {
        experimental: {
          cpus: 1,
          webpackBuildWorker: false,
          parallelServerCompiles: false,
          parallelServerBuildTraces: false,
        },
      }
    : isDocker
    ? {
        // Trace deps from monorepo root so standalone output includes hoisted node_modules
        experimental: { outputFileTracingRoot: path.join(__dirname, '../../') },
      }
    : {}),
  // Docker: produce minimal self-contained .next/standalone bundle
  ...(isDocker ? { output: 'standalone' } : {}),
  async rewrites() {
    /** Same-origin прокси для внешних картинок (WebGL + crossOrigin, старые URL в localStorage). */
    const picProxy = { source: '/pic-proxy/:path*', destination: 'https://picsum.photos/:path*' };
    const unsplashProxy = { source: '/img-proxy/:path*', destination: 'https://images.unsplash.com/:path*' };
    const imageProxies = [picProxy, unsplashProxy];

    // Браузер ходит на API напрямую — прокси не нужен (нужен CORS на Nest).
    if (process.env.NEXT_PUBLIC_API_URL?.trim()) {
      return imageProxies;
    }
    // На Vercel проксировать на 127.0.0.1 бессмысленно — задаётся NEXT_PUBLIC_API_URL.
    if (process.env.VERCEL === '1') {
      return imageProxies;
    }
    const upstream = (process.env.API_PROXY_UPSTREAM || 'http://127.0.0.1:3000').replace(/\/$/, '');
    // afterFiles: сначала срабатывают явные Route Handlers (app/api/.../route.ts), остальное /api/* — на Nest.
    // beforeFiles для /api/* перехватывал бы всё до файловой системы и ломал app/api/contact/message.
    return {
      beforeFiles: imageProxies,
      afterFiles: [{ source: '/api/:path*', destination: `${upstream}/:path*` }],
    };
  },
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  // Windows: filesystem webpack cache often races (ENOENT rename, missing chunks → 500). Memory cache is slower but stable.
  ...(isWin && process.env.NODE_ENV === 'development'
    ? {
        webpack: (config) => {
          config.cache = { type: 'memory' };
          return config;
        },
      }
    : {}),
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '45.9.40.37',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'minio.examplesite.xyz',
        pathname: '/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
}

module.exports = nextConfig
