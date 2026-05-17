import type { ReactNode } from 'react';
import { ScoopCard } from './ScoopCard';

/**
 * KpiTile — ScoopCard с icon-pill в правом верхнем (внутри scoop'а),
 * mono-label, крупным Unbounded value и foot с delta + sub-инфой.
 *
 * Используется в KPI-row на дашборде.
 */
export function KpiTile({
  icon,
  label,
  value,
  unit,
  unitPrefix,
  delta,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  /** Дополняющая единица справа от значения (например "%" или "/день"). */
  unit?: string;
  /** Единица слева от значения (например "₽"). */
  unitPrefix?: string;
  delta?: { dir: 'up' | 'dn'; text: string };
  sub?: string;
}) {
  return (
    <ScoopCard scoop={32} className="p-[22px_22px_18px]">
      {/* gold pill icon в правом верхнем (внутри cutout'а) */}
      <div
        className="absolute top-[5px] right-[5px] w-[22px] h-[22px] rounded-full bg-gold/15 border border-gold/30 grid place-items-center text-gold z-10"
      >
        <span className="[&>svg]:w-[11px] [&>svg]:h-[11px]">{icon}</span>
      </div>

      <div className="font-mono text-[11.5px] font-semibold uppercase tracking-widest text-text-mute mb-2.5">
        {label}
      </div>

      <div className="font-display font-semibold text-[30px] tracking-tight leading-none flex items-baseline gap-1.5">
        {unitPrefix && <span className="text-[14px] text-text-dim font-medium">{unitPrefix}</span>}
        <span>{value}</span>
        {unit && <span className="text-[14px] text-text-dim font-medium">{unit}</span>}
      </div>

      <div className="mt-3.5 pt-3 border-t border-line flex items-center justify-between text-[11.5px]">
        {delta ? (
          <span
            className={`font-mono font-semibold tracking-wider ${
              delta.dir === 'up' ? 'text-green' : 'text-red'
            }`}
          >
            {delta.dir === 'up' ? '▲' : '▼'} {delta.text}
          </span>
        ) : (
          <span />
        )}
        {sub && (
          <span className="font-mono text-[11.5px] text-text-mute tracking-wider">{sub}</span>
        )}
      </div>
    </ScoopCard>
  );
}
