'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface RailItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: string | number;
  /** Если true — пункт ведёт «никуда» (заглушка), кликом не реагирует. */
  disabled?: boolean;
  /** Точное совпадение по pathname (для /admin против /admin/anything). */
  exact?: boolean;
}

/**
 * RailItem — slot 40×40 в rail'е, внутри которого живёт «pill»:
 *   - default: квадрат 40×40 с иконкой по центру (если активный — golden)
 *   - hover: pill расширяется вправо до ~176px, иконка остаётся на месте,
 *     справа появляется label
 *
 * Сам slot занимает в inline-flow ровно 40×40; expand-pill — `position: absolute`,
 * z-30, выезжает за rightward за границу rail'а (aside имеет overflow: visible).
 *
 * Badge (gold dot с числом) фиксирован к slot'у — не уезжает при hover.
 */
export function RailItem({ href, icon, label, badge, disabled, exact }: RailItemProps) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/');

  // Pill: цвет и transition. z-[100] — выше любого topbar dropdown (TenantSwitcher z-50),
  // чтобы при одновременном открытии expand перекрывал всё.
  // `isolate` + explicit hex bg — отрезаем pill от ambient mix-blend-mode'а,
  // чтобы выглядел строго однотонным независимо от того, что под ним.
  const pillBase =
    'isolate absolute left-0 top-0 h-10 flex items-center gap-3 px-[11px] rounded-md overflow-hidden transition-[width,background-color] duration-200 ease-out w-10 group-hover:w-44 z-[100]';
  const pillState = active
    ? 'bg-gold'
    : 'bg-transparent group-hover:bg-[#23262F]';

  const iconColor = active
    ? 'text-bg'
    : 'text-text-dim group-hover:text-text';
  const labelColor = active ? 'text-bg' : 'text-text';

  const body = (
    <>
      <span className={`flex-shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:transition-colors ${iconColor}`}>
        {icon}
      </span>
      <span
        className={`whitespace-nowrap text-[13px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 ${labelColor}`}
      >
        {label}
      </span>
    </>
  );

  return (
    <div className="group relative w-10 h-10 flex-shrink-0">
      {/* Badge — фиксирован к 40×40 slot'у; не двигается при hover. Поверх pill'а. */}
      {badge !== undefined && (
        <span
          className="absolute -top-1 -right-1 z-[110] min-w-[16px] h-[16px] px-1 grid place-items-center font-mono text-[10px] font-semibold text-bg bg-gold rounded-full"
          style={{ boxShadow: '0 0 0 2px rgb(var(--bg-elev))' }}
        >
          {badge}
        </span>
      )}

      {disabled ? (
        <button
          type="button"
          disabled
          aria-label={label}
          className={`${pillBase} ${pillState} cursor-not-allowed`}
        >
          {body}
        </button>
      ) : (
        <Link href={href} aria-label={label} className={`${pillBase} ${pillState}`}>
          {body}
        </Link>
      )}
    </div>
  );
}
