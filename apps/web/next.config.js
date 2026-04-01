/** @type {import('next').NextConfig} */
const isWin = process.platform === 'win32';

const nextConfig = {
  reactStrictMode: true,
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
    : {}),
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
    // beforeFiles: иначе App Router может отдать 404 по /api/* до применения rewrite.
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${upstream}/:path*` },
        ...imageProxies,
      ],
    };
  },
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
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
    ],
    // Allow unoptimized images for development
    unoptimized: process.env.NODE_ENV === 'development',
  },
}

module.exports = nextConfig
