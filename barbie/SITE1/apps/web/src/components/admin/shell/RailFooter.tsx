'use client';

import type { MouseEventHandler } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';

/**
 * RailFooter (compact) — кружок-аватарка снизу rail'а. На hover'е выезжает
 * popout-панель справа с двумя icon-квадратами (Настройки / Выход). Каждая
 * иконка имеет свой hover-tooltip сверху с подписью.
 *
 *  Group-naming:
 *    group/avatar → controls popout panel visibility (slow fade-in, 100ms)
 *    group/item   → controls per-button text tooltip above (instant)
 *
 *  Имя пользователя + роль вынесены в `title=` атрибут аватарки (browser-
 *  native tooltip) — popup сам компактный, не отвлекает контентом.
 */
export function RailFooter({
  initial,
  name,
  role,
  onLogout,
}: {
  initial: string;
  name: string;
  role: string;
  onLogout: MouseEventHandler<HTMLButtonElement>;
}) {
  const router = useRouter();
  return (
    <div className="border-t border-line py-3 flex flex-col items-center gap-2">
      <div className="group/avatar relative">
        {/* Avatar circle */}
        <div
          title={`${name} · ${role}`}
          className="w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-[13px] text-bg cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #7a5824, rgb(var(--gold)))',
            boxShadow: '0 0 0 1px rgb(var(--gold) / 0.28)',
          }}
        >
          {initial}
        </div>

        {/* Popout panel — выезжает справа от аватарки на hover.
            pt-1/pb-1 на wrapper'е чтобы курсор перешёл с аватара на панель
            без gap'а (hover не теряется). */}
        <div
          role="menu"
          className="pointer-events-none absolute left-full bottom-0 pl-3 pr-1 py-1 opacity-0 group-hover/avatar:opacity-100 group-hover/avatar:pointer-events-auto transition-opacity duration-100 z-50"
        >
          <div className="flex items-center gap-1.5 px-2 py-2 rounded-md bg-bg-elev border border-line shadow-lg whitespace-nowrap relative">
            {/* Tail (стрелка-уголок к аватарке) */}
            <span
              aria-hidden="true"
              className="absolute right-full bottom-3 border-y-4 border-r-4 border-y-transparent border-r-line"
            />

            <RailIconButton
              ariaLabel="Настройки"
              label="Настройки"
              onClick={() => router.push('/admin/settings')}
              icon={<Settings size={14} />}
            />
            <RailIconButton
              ariaLabel="Выход"
              label="Выход"
              onClick={onLogout}
              icon={<LogOut size={14} />}
              danger
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RailIconButton({
  icon,
  label,
  ariaLabel,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  danger?: boolean;
}) {
  const base =
    'w-9 h-9 grid place-items-center rounded-md border border-line text-text-mute transition-colors';
  const hoverCls = danger
    ? 'hover:text-red hover:border-red'
    : 'hover:text-text hover:border-text/40';
  return (
    <div className="group/item relative">
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`${base} ${hoverCls}`}
      >
        {icon}
      </button>
      {/* Text-tooltip над иконкой — появляется ТОЛЬКО при hover конкретной кнопки */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap px-2 py-1 rounded bg-bg border border-line text-[11px] font-mono uppercase tracking-wider text-text opacity-0 group-hover/item:opacity-100 transition-opacity duration-100 shadow-md"
      >
        {label}
      </span>
    </div>
  );
}
