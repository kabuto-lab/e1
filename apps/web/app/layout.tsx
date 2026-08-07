/**
 * Корневой layout всего сайта: метаданные, шрифты дизайн-системы, обёртка AuthProvider.
 * Дочерние страницы (вложенные page.tsx под app/) рендерятся в проп children. На сервере данные здесь не грузятся.
 */
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { ChunkLoadRecovery } from '@/components/ChunkLoadRecovery';
import { PlatformBrandingProvider } from '@/components/PlatformBrandingProvider';
import { MassageModeProvider } from '@/components/MassageModeProvider';
import { serverFetchMassageMode } from '@/lib/api-server';
import { fontInter, fontUnbounded, fontPlayfair, fontSpaceGrotesk } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'My Muse - Premium Platform',
  description: 'Премиальная платформа сопровождения',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#d4af37',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  // Серверный fetch флага массажного режима — устраняет вспышку эскорт-контента перед
  // переключением на клиенте (см. MassageModeProvider).
  const massageMode = await serverFetchMassageMode();

  return (
    <html
      lang="ru"
      className={`${fontInter.variable} ${fontUnbounded.variable} ${fontPlayfair.variable} ${fontSpaceGrotesk.variable}`}
      data-public-button-style="solid"
    >
      <body>
        <ChunkLoadRecovery />
        <AuthProvider>
          <PlatformBrandingProvider>
            <MassageModeProvider initial={massageMode}>{children}</MassageModeProvider>
          </PlatformBrandingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
