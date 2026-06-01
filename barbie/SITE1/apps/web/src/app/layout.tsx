import type { Metadata } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

export const metadata: Metadata = {
  title: 'NAS · Network Administration System',
  description: 'Multi-tenant CRM platform — tenants: spa salon networks, etc.',
};

/**
 * Шрифты:
 *  - RF Rufo Semibold — основной admin-font. Грузится через `next/font/local`
 *    (self-hosted, корректные хешированные URL В ЛЮБОМ окружении, включая
 *    basePath `/nas`; авто-preload; метрики фолбэка против layout-shift).
 *    Экспортируется как CSS-var `--font-rufo`; tailwind `font-admin` ссылается
 *    на неё первой, далее legacy `@font-face 'RF Rufo'` (globals.css) и Inter.
 *  - JetBrains Mono — meta-лейблы, badges, timestamps (next/font/google).
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

/** Inter — максимальная читаемость на мелких размерах (чат). latin + cyrillic. */
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-chat',
  display: 'swap',
});

const rfRufo = localFont({
  src: [
    {
      path: '../../public/fonts/rf-rufo/RFRufo-Semibold.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-rufo',
  display: 'swap',
  fallback: ['Inter', 'system-ui', 'sans-serif'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${jetbrainsMono.variable} ${rfRufo.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased font-admin">{children}</body>
    </html>
  );
}
