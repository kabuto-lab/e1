import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'NAS · Network Administration System',
  description: 'Multi-tenant CRM platform — tenants: spa salon networks, etc.',
};

/**
 * Шрифты:
 *  - RF Rufo Semibold — self-hosted (см. globals.css @font-face),
 *    основной admin-font для ВСЕХ текстовых элементов дашборда.
 *    Файлы лежат в public/fonts/rf-rufo/{eot,woff2,woff,ttf} — bulletproof
 *    cross-browser src-цепочка покрывает всё от IE6 до Edge.
 *  - JetBrains Mono — meta-лейблы, badges, timestamps, kbd hints (load
 *    через next/font/google, preload + auto-CSS).
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

/** Preload Semibold weights, чтобы первый paint уже шёл с RF Rufo. */
const RF_RUFO_PRELOAD = ['/fonts/rf-rufo/RFRufo-Semibold.woff2'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={jetbrainsMono.variable}>
      <head>
        {RF_RUFO_PRELOAD.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body className="min-h-screen antialiased font-admin">{children}</body>
    </html>
  );
}
