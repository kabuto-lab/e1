'use client';

import type { MouseEventHandler } from 'react';
import { LogOut } from 'lucide-react';

/**
 * RailFooter (compact) — только аватарка + logout-кнопка ниже. Имя и роль
 * скрыты в hover-tooltip'е на аватарке.
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
  return (
    <div className="border-t border-line py-3 flex flex-col items-center gap-2">
      {/* Avatar with tooltip */}
      <div className="group relative">
        <div
          className="w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-[13px] text-bg"
          style={{
            background: 'linear-gradient(135deg, #7a5824, rgb(var(--gold)))',
            boxShadow: '0 0 0 1px rgb(var(--gold) / 0.28)',
          }}
        >
          {initial}
        </div>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full ml-3 bottom-0 whitespace-nowrap px-2.5 py-1.5 rounded-md bg-bg-elev border border-line text-[12px] text-text shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-50"
        >
          <div className="font-semibold">{name}</div>
          <div className="text-[11px] text-text-mute font-mono uppercase tracking-wider mt-0.5">
            {role}
          </div>
          <span
            aria-hidden="true"
            className="absolute right-full bottom-3 border-y-4 border-r-4 border-y-transparent border-r-line"
          />
        </span>
      </div>

      {/* Logout */}
      <div className="group relative">
        <button
          type="button"
          onClick={onLogout}
          aria-label="Выход"
          className="w-9 h-9 grid place-items-center rounded-md border border-line text-text-mute hover:text-red hover:border-red transition-colors"
        >
          <LogOut size={14} />
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1.5 rounded-md bg-bg-elev border border-line text-[12px] text-text shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-50"
        >
          Выход
          <span
            aria-hidden="true"
            className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-r-4 border-y-transparent border-r-line"
          />
        </span>
      </div>
    </div>
  );
}
