'use client';

import type { PublicGirl } from '@/lib/public-girls-api';
import {
  girlBounds,
  breastOptions,
  girlFilterActive,
  emptyGirlFilter,
  type GirlFilterState,
} from '@/lib/girls-filter';
import styles from './GirlsFilter.module.css';

/**
 * GirlsFilter — общий бар фильтра анкет по параметрам для ВСЕХ сайтов.
 * Возраст/рост — дабл-слайдеры (диапазон), грудь/силикон — чипы. Theme-agnostic:
 * акцент — пропсом, текст наследует цвет сайта (currentColor) → корректно и на
 * тёмной (barbiespa), и на светлой (nebesa) теме.
 */
export function GirlsFilter({
  girls,
  value,
  onChange,
  accent = '#ec1c8f',
  count,
}: {
  girls: PublicGirl[];
  value: GirlFilterState;
  onChange: (next: GirlFilterState) => void;
  accent?: string;
  count?: number;
}) {
  const bounds = girlBounds(girls);
  const breasts = breastOptions(girls);
  const set = (patch: Partial<GirlFilterState>) => onChange({ ...value, ...patch });

  const age = value.age ?? bounds.age;
  const height = value.height ?? bounds.height;

  // При установке диапазона: если он совпал с полными границами — считаем «нет фильтра».
  const setRange = (key: 'age' | 'height', lo: number, hi: number) => {
    const b = bounds[key];
    set({ [key]: lo <= b[0] && hi >= b[1] ? null : ([lo, hi] as [number, number]) } as Partial<GirlFilterState>);
  };

  return (
    <div className="gf-bar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, margin: '0 0 24px' }}>
      <RangeGroup
        label="Возраст"
        unit="лет"
        bounds={bounds.age}
        value={age}
        accent={accent}
        onChange={(lo, hi) => setRange('age', lo, hi)}
      />
      <RangeGroup
        label="Рост"
        unit="см"
        bounds={bounds.height}
        value={height}
        accent={accent}
        onChange={(lo, hi) => setRange('height', lo, hi)}
      />

      {breasts.length > 0 && (
        <Group label="Грудь">
          {breasts.map((b) => (
            <Chip key={b} active={value.breast === b} accent={accent} onClick={() => set({ breast: value.breast === b ? null : b })}>
              {b}
            </Chip>
          ))}
        </Group>
      )}

      <Group label="Силикон">
        {(['any', 'yes', 'no'] as const).map((t) => (
          <Chip key={t} active={value.silicon === t} accent={accent} onClick={() => set({ silicon: t })}>
            {t === 'any' ? 'любой' : t === 'yes' ? 'да' : 'нет'}
          </Chip>
        ))}
      </Group>

      {girlFilterActive(value) && (
        <button
          type="button"
          onClick={() => onChange(emptyGirlFilter)}
          style={{ fontSize: 13, opacity: 0.7, textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer', color: 'inherit' }}
        >
          Сбросить
        </button>
      )}

      {typeof count === 'number' && (
        <span style={{ fontSize: 13, opacity: 0.55, marginLeft: 'auto' }}>{count} анкет</span>
      )}
    </div>
  );
}

function RangeGroup({
  label,
  unit,
  bounds,
  value,
  accent,
  onChange,
}: {
  label: string;
  unit: string;
  bounds: [number, number];
  value: [number, number];
  accent: string;
  onChange: (lo: number, hi: number) => void;
}) {
  const [min, max] = bounds;
  const [lo, hi] = value;
  const span = max - min || 1;
  const pct = (v: number) => ((v - min) / span) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.65 }}>
        {label}: <b style={{ opacity: 0.95 }}>{lo}–{hi} {unit}</b>
      </span>
      <div className={styles.range} style={{ ['--gf-accent' as string]: accent }}>
        <div className={styles.track} />
        <div className={styles.fill} style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%`, background: accent }} />
        <input
          type="range"
          className={styles.input}
          min={min}
          max={max}
          step={1}
          value={lo}
          onChange={(e) => onChange(Math.min(Number(e.target.value), hi), hi)}
          aria-label={`${label} от`}
        />
        <input
          type="range"
          className={styles.input}
          min={min}
          max={max}
          step={1}
          value={hi}
          onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo))}
          aria-label={`${label} до`}
        />
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.55 }}>{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.2,
        cursor: 'pointer',
        border: '1px solid',
        transition: 'background .15s, color .15s, border-color .15s',
        ...(active
          ? { background: accent, color: '#fff', borderColor: accent }
          : { background: 'transparent', color: 'inherit', borderColor: 'currentColor', opacity: 0.7 }),
      }}
    >
      {children}
    </button>
  );
}
