import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NAS · Network Administration System',
  description: 'Multi-tenant CRM platform — tenants: spa salon networks, etc.',
};

/**
 * Preload weights, которые сразу появляются на экране (Regular + Bold для заголовков).
 * Medium/SemiBold подтянутся лениво через CSS-декларации в globals.css.
 * Файлы должны лежать в apps/web/public/fonts/rf-rufo/ (см. README).
 */
const RF_RUFO_PRELOAD = [
  '/fonts/rf-rufo/RFRufo-Regular.woff2',
  '/fonts/rf-rufo/RFRufo-Bold.woff2',
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
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
