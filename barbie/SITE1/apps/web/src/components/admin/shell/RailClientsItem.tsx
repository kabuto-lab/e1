'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Users, Calendar, CreditCard } from 'lucide-react';

/**
 * RailClientsItem — компаунд-пункт рейла «Записи + Клиенты + Биллинг» в одном
 * селекторе.
 *
 * Свёрнут: 40×40 иконка Calendar («Записи») — она видна в боковом меню в покое.
 * На hover селектор разворачивается (авто-ширина под текст) и правее появляются
 * иконки-кнопки «Клиенты» (рабочая ссылка) и «Биллинг» (заглушка), а ещё правее —
 * динамическая подсказка с именем кнопки под курсором.
 *
 * Записи/Биллинг — НЕ через `disabled`-атрибут (браузер глотает mouseenter у
 * disabled, подсказка не сменилась бы): aria-disabled + no-op onClick. Страниц
 * записей (/admin/appointments) и биллинга (/admin/billing) пока нет — заглушки.
 *
 * Ширина подсказки зафиксирована по самому длинному слову («Клиенты») через
 * невидимый sizer — чтобы ширина селектора НЕ прыгала при переключении hover
 * между кнопками. Геометрия pill'а (w-max + анимируемый max-width) — как в RailItem.
 */
export function RailClientsItem() {
  const pathname = usePathname();
  const active = pathname === '/admin/clients' || pathname.startsWith('/admin/clients/');
  const [hint, setHint] = useState<'Клиенты' | 'Записи' | 'Биллинг'>('Записи');

  const pillBase =
    'isolate absolute left-0 top-0 h-10 w-max max-w-[40px] group-hover:max-w-[360px] flex items-center pl-[11px] pr-[22px] rounded-md overflow-hidden transition-[max-width,background-color] duration-200 ease-out z-[100]';
  const pillBg = active ? 'bg-gold' : 'bg-transparent group-hover:bg-gold';
  const iconCls =
    'flex-shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:transition-colors transition-colors';

  return (
    <div className="group relative w-10 h-10 flex-shrink-0">
      <div className={`${pillBase} ${pillBg}`}>
        {/* Записи — видна свёрнутой (заглушка). mr-6 отодвигает «Клиенты» правее. */}
        <button
          type="button"
          aria-disabled="true"
          aria-label="Записи (скоро)"
          title="Записи — скоро"
          onMouseEnter={() => setHint('Записи')}
          onClick={(e) => e.preventDefault()}
          className={`${iconCls} mr-5 cursor-not-allowed ${active ? 'text-bg opacity-60' : 'text-text-mute group-hover:text-bg group-hover:opacity-70'}`}
        >
          <Calendar />
        </button>

        {/* Клиенты — рабочая ссылка, появляется на hover */}
        <Link
          href="/admin/clients"
          aria-label="Клиенты"
          onMouseEnter={() => setHint('Клиенты')}
          className={`${iconCls} mr-5 ${active ? 'text-bg' : 'text-text-dim group-hover:text-bg'}`}
        >
          <Users />
        </Link>

        {/* Биллинг — заглушка (страницы пока нет), появляется на hover */}
        <button
          type="button"
          aria-disabled="true"
          aria-label="Биллинг (скоро)"
          title="Биллинг — скоро"
          onMouseEnter={() => setHint('Биллинг')}
          onClick={(e) => e.preventDefault()}
          className={`${iconCls} mr-3 cursor-not-allowed ${active ? 'text-bg opacity-60' : 'text-text-mute group-hover:text-bg group-hover:opacity-70'}`}
        >
          <CreditCard />
        </button>

        {/* Подсказка с фиксированной шириной (sizer = «Клиенты»), чтобы ширина
            селектора не менялась при переключении hint между кнопками. */}
        <span className="relative grid">
          <span
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 whitespace-nowrap text-[13px] font-semibold"
          >
            Клиенты
          </span>
          <span
            className="col-start-1 row-start-1 whitespace-nowrap text-[13px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 text-bg"
          >
            {hint}
          </span>
        </span>
      </div>
    </div>
  );
}
