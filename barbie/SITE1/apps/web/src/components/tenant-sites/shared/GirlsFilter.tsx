'use client';

import type { PublicGirl } from '@/lib/public-girls-api';
import {
  GIRL_AGE_RANGES,
  GIRL_HEIGHT_RANGES,
  breastOptions,
  girlFilterActive,
  emptyGirlFilter,
  type GirlFilterState,
} from '@/lib/girls-filter';

/**
 * GirlsFilter — общий бар фильтра анкет по параметрам (возраст/рост/грудь/силикон)
 * для ВСЕХ сайтов. Theme-agnostic: активный чип красится `accent`-ом, неактивный
 * берёт цвет текста сайта (currentColor) → корректно и на тёмной (barbiespa),
 * и на светлой (nebesa) теме. Layout — нейтральные утилиты (доступны глобально).
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
  const breasts = breastOptions(girls);
  const set = (patch: Partial<GirlFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="gf-bar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, margin: '0 0 24px' }}>
      <Group label="Возраст">
        {GIRL_AGE_RANGES.map((r, i) => (
          <Chip key={r.label} active={value.ageIdx === i} accent={accent} onClick={() => set({ ageIdx: value.ageIdx === i ? null : i })}>
            {r.label}
          </Chip>
        ))}
      </Group>

      <Group label="Рост">
        {GIRL_HEIGHT_RANGES.map((r, i) => (
          <Chip key={r.label} active={value.heightIdx === i} accent={accent} onClick={() => set({ heightIdx: value.heightIdx === i ? null : i })}>
            {r.label}
          </Chip>
        ))}
      </Group>

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
          className="gf-reset"
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
