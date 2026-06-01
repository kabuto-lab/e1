'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEventHandler, ReactNode } from 'react';

export interface RailItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: string | number;
  /** Если true — пункт ведёт «никуда» (заглушка), кликом не реагирует. */
  disabled?: boolean;
  /** Точное совпадение по pathname (для /admin против /admin/anything). */
  exact?: boolean;
  /**
   * Если задан — пункт рендерится как `<button onClick>` вместо `<Link>`.
   * Используется для action-итемов в RailFooter (Выход и т.п.). `href`
   * игнорируется, но всё равно обязателен для типизации (можно передать '#').
   */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /**
   * Если true — pill подсвечивается красным на hover (стиль danger). Для
   * деструктивных действий типа «Выход».
   */
  danger?: boolean;
  /**
   * Явная подсветка «активен» вместо вычисления по pathname. Для toggle-итемов
   * (напр. «Чат» открывает докнутую панель, а не страницу) — подсвечиваем по
   * состоянию открытости, а не по URL.
   */
  active?: boolean;
  /** Цвет бейджа: 'accent' (золото, по умолч.) или 'green' (уведомления чата). */
  badgeTone?: 'accent' | 'green';
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
export function RailItem({ href, icon, label, badge, disabled, exact, onClick, danger, active: activeOverride, badgeTone = 'accent' }: RailItemProps) {
  const pathname = usePathname();
  const active =
    activeOverride !== undefined
      ? activeOverride
      : exact
        ? pathname === href
        : pathname === href || pathname.startsWith(href + '/');

  // Pill: цвет и transition. z-[100] — выше любого topbar dropdown (TenantSwitcher z-50),
  // чтобы при одновременном открытии expand перекрывал всё.
  // `isolate` + explicit hex bg — отрезаем pill от ambient mix-blend-mode'а,
  // чтобы выглядел строго однотонным независимо от того, что под ним.
  // Ширина: collapsed — клампим max-width до 40px (квадрат с иконкой, лейбл
  // скрыт overflow-hidden). Hover — max-width растёт, а `w-max` (width:max-content)
  // даёт ровно столько, сколько нужно тексту → селектор всегда вмещает подпись,
  // не вылезая фиксированными 176px и не обрезая длинные лейблы.
  const pillBase =
    'isolate absolute left-0 top-0 h-10 w-max max-w-[40px] group-hover:max-w-[360px] flex items-center gap-3 pl-[11px] pr-[22px] rounded-md overflow-hidden transition-[max-width,background-color] duration-200 ease-out z-[100]';
  // Селектор золотой: активный пункт залит золотом всегда, остальные —
  // вспыхивают золотом на hover (label виден только на hover → всегда на золоте,
  // поэтому тёмный text-bg). Danger (напр. «Выход») — отдельный красный hover.
  const pillState = active
    ? 'bg-gold'
    : danger
      ? 'bg-transparent group-hover:bg-red/15'
      : 'bg-transparent group-hover:bg-gold';

  const iconColor = active
    ? 'text-bg'
    : danger
      ? 'text-text-dim group-hover:text-red'
      : 'text-text-dim group-hover:text-bg';
  const labelColor = active ? 'text-bg' : danger ? 'text-red' : 'text-bg';

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
          className={`absolute -top-1 -right-1 z-[110] min-w-[16px] h-[16px] px-1 grid place-items-center font-mono text-[10px] font-semibold text-bg rounded-full ${
            badgeTone === 'green' ? 'bg-green' : 'bg-accent-2'
          }`}
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
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={`${pillBase} ${pillState} text-left`}
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
