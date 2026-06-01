'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { UsersRound, UserCog } from 'lucide-react';

/**
 * RailModelsItem — компаунд-пункт рейла «Модели + Сотрудники» в одном селекторе
 * (как RailClientsItem). Свёрнут: видна левая иконка UsersRound («Модели»). На
 * hover селектор разворачивается и правее появляется иконка-ссылка «Сотрудники»,
 * а ещё правее — динамическая подсказка с именем кнопки под курсором.
 *
 * Обе кнопки — рабочие ссылки. Подсветка active — если открыт любой из разделов.
 */
export function RailModelsItem() {
  const pathname = usePathname();
  const active =
    pathname === '/admin/employees' ||
    pathname.startsWith('/admin/employees/') ||
    pathname === '/admin/models' ||
    pathname.startsWith('/admin/models/');
  const [hint, setHint] = useState<'Сотрудники' | 'Модели'>('Модели');

  const pillBase =
    'isolate absolute left-0 top-0 h-10 w-max max-w-[40px] group-hover:max-w-[360px] flex items-center pl-[11px] pr-[22px] rounded-md overflow-hidden transition-[max-width,background-color] duration-200 ease-out z-[100]';
  const pillBg = active ? 'bg-gold' : 'bg-transparent group-hover:bg-gold';
  const iconCls =
    'flex-shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:transition-colors transition-colors';

  return (
    <div className="group relative w-10 h-10 flex-shrink-0">
      <div className={`${pillBase} ${pillBg}`}>
        {/* Модели — левая (видна свёрнутой) */}
        <Link
          href="/admin/models"
          aria-label="Модели"
          onMouseEnter={() => setHint('Модели')}
          className={`${iconCls} mr-5 ${active ? 'text-bg' : 'text-text-dim group-hover:text-bg'}`}
        >
          <UsersRound />
        </Link>

        {/* Сотрудники — появляется на hover */}
        <Link
          href="/admin/employees"
          aria-label="Сотрудники"
          onMouseEnter={() => setHint('Сотрудники')}
          className={`${iconCls} mr-3 ${active ? 'text-bg' : 'text-text-dim group-hover:text-bg'}`}
        >
          <UserCog />
        </Link>

        {/* Подсказка с фиксированной шириной (sizer = «Сотрудники») */}
        <span className="relative grid">
          <span
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 whitespace-nowrap text-[13px] font-semibold"
          >
            Сотрудники
          </span>
          <span className="col-start-1 row-start-1 whitespace-nowrap text-[13px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 text-bg">
            {hint}
          </span>
        </span>
      </div>
    </div>
  );
}
