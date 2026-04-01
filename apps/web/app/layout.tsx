/**
 * Корневой layout всего сайта: метаданные, шрифты дизайн-системы, обёртка AuthProvider.
 * Дочерние страницы (вложенные page.tsx под app/) рендерятся в проп children. На сервере данные здесь не грузятся.
 */
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { PlatformBrandingProvider } from '@/components/PlatformBrandingProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lovnge - Premium Platform',
  description: 'Премиальная платформа сопровождения',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#d4af37',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Unbounded:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <PlatformBrandingProvider>{children}</PlatformBrandingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
