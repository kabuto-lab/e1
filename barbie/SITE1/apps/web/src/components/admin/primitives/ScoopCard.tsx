import type { CSSProperties, ReactNode } from 'react';

/**
 * ScoopCard — карточка с inverse-radius cut'ом в правом верхнем углу.
 *
 * Реализуется тремя слоями (повторяет технику из dashboard-2077.html):
 *  1. Сама карточка — border + rounded-lg + padding.
 *  2. ::before (через inline-div) — квадрат фона `bg-bg` со скруглённым
 *     левым-нижним углом (`borderBottomLeftRadius: scoop`), который
 *     «вычитает» угол визуально.
 *  3. ::after — обводка вдоль кривой (1px line), задаётся через
 *     radial-gradient mask.
 *
 * Дефолтный scoop — 32px (как в `.kpi` мокапа). Перебивается prop'ом.
 */
export function ScoopCard({
  children,
  scoop = 32,
  className,
  style,
}: {
  children: ReactNode;
  scoop?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const scoopStr = `${scoop}px`;
  const cutStyle: CSSProperties = {
    position: 'absolute',
    top: -1,
    right: -1,
    width: scoopStr,
    height: scoopStr,
    background: 'rgb(var(--bg))',
    borderBottomLeftRadius: scoopStr,
    pointerEvents: 'none',
  };
  const strokeStyle: CSSProperties = {
    position: 'absolute',
    top: -1,
    right: -1,
    width: scoopStr,
    height: scoopStr,
    borderBottomLeftRadius: scoopStr,
    borderBottom: '1px solid rgb(var(--line))',
    borderLeft: '1px solid rgb(var(--line))',
    pointerEvents: 'none',
    WebkitMask: `radial-gradient(circle ${scoopStr} at 0 100%, #000 0 calc(${scoopStr} - 1px), transparent calc(${scoopStr} - 1px))`,
    mask: `radial-gradient(circle ${scoopStr} at 0 100%, #000 0 calc(${scoopStr} - 1px), transparent calc(${scoopStr} - 1px))`,
  };

  return (
    <div
      className={`relative bg-surface border border-line rounded-lg overflow-hidden ${className ?? ''}`}
      style={style}
    >
      <span aria-hidden="true" style={cutStyle} />
      <span aria-hidden="true" style={strokeStyle} />
      {children}
    </div>
  );
}
