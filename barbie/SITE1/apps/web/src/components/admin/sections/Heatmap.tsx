'use client';

import { Card } from '@/components/admin/primitives/Card';

/**
 * Heatmap — 7 дней × 24 часа, demo-mock с детерминированной плотностью.
 * Phase 2: реальные данные из агрегата appointments по часам.
 *
 * Density 0..5 → разные оттенки gold (см. globals.css / mockup).
 */
const DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

function buildRow(seed: number): number[] {
  const cells: number[] = [];
  for (let h = 0; h < 24; h++) {
    // workday vibe: 0..7 low, 8..11 ramp-up, 12..20 peak, 21..23 fade
    const base =
      h < 7 ? 0 :
      h < 10 ? 1 + Math.floor((h - 7) / 1.5) :
      h < 18 ? 3 + (h % 2) :
      h < 21 ? 2 :
      1;
    // weekend bonus
    const weekend = seed >= 5 ? 1 : 0;
    // pseudo-random jitter
    const j = ((seed * 31 + h * 17) % 5) > 3 ? -1 : 0;
    const v = Math.min(5, Math.max(0, base + weekend + j));
    cells.push(v);
  }
  return cells;
}

const HEAT_DATA = DAYS.map((d, i) => ({ day: d, cells: buildRow(i) }));

function cellStyle(v: number): React.CSSProperties {
  if (v === 0) return { background: 'rgb(var(--surface-2))' };
  if (v === 1) return { background: 'rgb(var(--gold) / 0.10)' };
  if (v === 2) return { background: 'rgb(var(--gold) / 0.22)' };
  if (v === 3) return { background: 'rgb(var(--gold) / 0.42)' };
  if (v === 4)
    return {
      background: 'rgb(var(--gold) / 0.65)',
      boxShadow: '0 0 6px rgb(var(--gold) / 0.4)',
    };
  return {
    background: 'rgb(var(--gold))',
    boxShadow: '0 0 10px rgb(var(--gold) / 0.45)',
  };
}

export function Heatmap() {
  return (
    <Card
      title="Тепловая карта загрузки"
      sub="7Д × 24Ч · DEMO MOCK"
      actions={
        <span className="font-mono text-[11.5px] text-text-mute tracking-wider">
          ●○○ low · ●●● peak
        </span>
      }
    >
      <div className="flex flex-col gap-[3px] font-mono">
        {HEAT_DATA.map((row) => (
          <div
            key={row.day}
            className="grid items-center gap-[3px]"
            style={{ gridTemplateColumns: '32px repeat(24, 1fr)' }}
          >
            <span className="text-[11.5px] text-text-mute tracking-wider text-right pr-1">
              {row.day}
            </span>
            {row.cells.map((v, h) => (
              <div
                key={h}
                title={`${row.day} ${String(h).padStart(2, '0')}:00 · density ${v}`}
                className="h-[14px] rounded-sm transition-transform hover:scale-150 relative z-0 hover:z-10"
                style={cellStyle(v)}
              />
            ))}
          </div>
        ))}
      </div>
      <div
        className="grid gap-[3px] text-[11.5px] text-text-mute mt-1"
        style={{ gridTemplateColumns: '32px repeat(24, 1fr)' }}
      >
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center">
            {h % 4 === 0 ? h : ''}
          </span>
        ))}
      </div>
    </Card>
  );
}
