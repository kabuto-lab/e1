/**
 * Корневой layout всего сайта: метаданные, шрифты дизайн-системы, обёртка AuthProvider.
 * Дочерние страницы (вложенные page.tsx под app/) рендерятся в проп children. На сервере данные здесь не грузятся.
 */
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { ChunkLoadRecovery } from '@/components/ChunkLoadRecovery';
import { PlatformBrandingProvider } from '@/components/PlatformBrandingProvider';
import { fontInter, fontUnbounded } from './fonts';
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
    <html
      lang="ru"
      className={`${fontInter.variable} ${fontUnbounded.variable}`}
      data-public-button-style="solid"
    >
      <body>
        <ChunkLoadRecovery />
        <AuthProvider>
          <PlatformBrandingProvider>{children}</PlatformBrandingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
