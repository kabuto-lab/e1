/**
 * Корневой layout всего сайта: метаданные, шрифты дизайн-системы, обёртка AuthProvider.
 * Дочерние страницы (вложенные page.tsx под app/) рендерятся в проп children. На сервере данные здесь не грузятся.
 */
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import { AuthProvider } from '@/components/AuthProvider';
import { ChunkLoadRecovery } from '@/components/ChunkLoadRecovery';
import { PlatformBrandingProvider } from '@/components/PlatformBrandingProvider';
import { MassageModeProvider } from '@/components/MassageModeProvider';
import { serverFetchMassageMode } from '@/lib/api-server';
import { YANDEX_METRIKA_ID } from '@/lib/metrika';
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
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script id="yandex-metrika" strategy="afterInteractive">
              {`(function(m,e,t,r,i,k,a){
                  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                  m[i].l=1*new Date();
                  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
              })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}', 'ym');

              ym(${YANDEX_METRIKA_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`}
            </Script>
            <noscript>
              <div>
                <img src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
              </div>
            </noscript>
          </>
        )}
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
