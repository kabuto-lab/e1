import Script from 'next/script';
import type { ReactNode } from 'react';

/**
 * Layout тенанта nebesaspa — оборачивает ВСЕ его страницы (главную NebesaHome +
 * внутренние через NebesaShell). Единая точка подключения счётчика Яндекс.Метрики
 * (id 104254676: webvisor + clickmap + trackLinks). next/script strategy=afterInteractive
 * — грузится после гидратации, рендер не блокирует. Работает и на чистом домене
 * nebesaspa.com (root-tenant сборка), и под salonmassage.ru/nas/nebesaspa.
 */
export default function NebesaspaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Script id="ym-nebesaspa" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=104254676','ym');ym(104254676,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",accurateTrackBounce:true,trackLinks:true});`}
      </Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://mc.yandex.ru/watch/104254676" style={{ position: 'absolute', left: '-9999px' }} alt="" />
        </div>
      </noscript>
    </>
  );
}
