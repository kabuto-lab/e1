'use client';

import { useState } from 'react';
import { asset } from '@/lib/asset';
import {
  ASSET_DIR,
  CATEGORIES,
  PROGRAMS,
  CATEGORY_PROGRAMS,
  categoryBySlug,
  programImg,
  fmtPrice,
  fmtDur,
} from './programs-data';

const ASSET = asset(ASSET_DIR);

/**
 * Каталог программ тенанта НЕБОСВОД с клиентским фильтром по категориям:
 * 8 квадратов-категорий работают как переключатели — клик оставляет внизу только
 * программы выбранной категории (повторный клик / «Сбросить» — снова все).
 * Без перезагрузки страницы. Карточки программ ведут на /program/<slug>.
 */
export function NebesaProgramsCatalog() {
  const [active, setActive] = useState<string | null>(null);

  const shown = active
    ? PROGRAMS.filter((p) => (CATEGORY_PROGRAMS[active] ?? []).includes(p.slug))
    : PROGRAMS;
  const activeCat = active ? categoryBySlug(active) : undefined;

  return (
    <>
      {/* 8 категорий-фильтров */}
      <div className="ptiles ptiles--short ptiles--row8" style={{ marginTop: 14 }}>
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.slug}
            className={`ptile ptile--filter${active === c.slug ? ' is-active' : ''}`}
            aria-pressed={active === c.slug}
            onClick={() => setActive((a) => (a === c.slug ? null : c.slug))}
          >
            <div className="ptile-pic" style={{ backgroundImage: `url(${ASSET}/${c.img}.webp)` }}>
              <div className="ptile-overlay">
                <p>{c.desc}</p>
              </div>
            </div>
            <div className="ptile-meta">
              <div className="ptile-price">{fmtPrice(c.price)}</div>
              <div className="ptile-name">{c.nm}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Заголовок секции программ + сброс фильтра */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginTop: 30 }}>
        <h2 className="h2" style={{ fontSize: 'clamp(26px, 3.4vw, 40px)' }}>
          {activeCat ? activeCat.nm : 'Наши программы'}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>
          {activeCat
            ? `${shown.length} ${shown.length === 1 ? 'программа' : 'программ'} в категории «${activeCat.nm}». Нажмите на карточку, чтобы открыть программу.`
            : `${shown.length} авторских программ. Нажмите на категорию выше, чтобы отфильтровать, или на карточку — чтобы открыть программу.`}
        </p>
        {active && (
          <button type="button" className="cat-reset" onClick={() => setActive(null)}>
            × Сбросить фильтр
          </button>
        )}
      </div>

      <div className="ptiles ptiles--short ptiles--cap ptiles--anim" key={active ?? 'all'}>
        {shown.map((p, i) => (
          <a
            className="ptile"
            key={p.slug}
            href={asset(`/nebesaspa/program/${p.slug}`)}
            style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
          >
            <div className="ptile-pic" style={{ backgroundImage: `url(${ASSET}/${programImg(p.slug)}.webp)` }}>
              <div className="ptile-cap">
                <div className="ptile-price">
                  {fmtPrice(p.price)}
                  <span className="ptile-dur">· {fmtDur(p.dur)}</span>
                </div>
                <div className="ptile-name">{p.nm}</div>
                <p className="ptile-desc">{p.desc}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
