'use client';

import { useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { applyGirlFilter, emptyGirlFilter, type GirlFilterState } from '@/lib/girls-filter';
import { GirlsFilter } from '../shared/GirlsFilter';
import { NebesaGirlCard } from './NebesaGirlCard';

/**
 * NebesaGirlsGrid — клиентская сетка анкет NEBOSVOD с фильтром по параметрам
 * (возраст/рост/грудь/силикон, синий акцент). Серверная NebesaGirls передаёт
 * ростер и локализованный текст пустого состояния.
 */
export function NebesaGirlsGrid({ girls, emptyLabel }: { girls: PublicGirl[]; emptyLabel: string }) {
  const [filter, setFilter] = useState<GirlFilterState>(emptyGirlFilter);
  const shown = applyGirlFilter(girls, filter);

  if (!girls.length) {
    return <p style={{ color: 'var(--muted)', marginTop: 24 }}>{emptyLabel}</p>;
  }

  return (
    <>
      <GirlsFilter girls={girls} value={filter} onChange={setFilter} accent="#2ba3e5" count={shown.length} />
      {shown.length ? (
        <div className="girls-grid">
          {shown.map((g) => (
            <NebesaGirlCard key={g.slug} girl={g} />
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--muted)', marginTop: 24 }}>По заданным параметрам ничего не найдено.</p>
      )}
    </>
  );
}
