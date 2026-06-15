'use client';

import { useEffect, useRef, useState } from 'react';
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
  type NebCategory,
  type NebProgram,
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
      {/* ДЕСКТОП/ПЛАНШЕТ: 8 квадратов-фильтров + сетка программ (скрыто на телефоне) */}
      <div className="progs-desk">
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
      </div>

      {/* ТЕЛЕФОН: по секции на категорию — заголовок + горизонтально скроллируемая лента программ */}
      <div className="progs-mob">
        {CATEGORIES.map((c) => {
          const items = PROGRAMS.filter((p) => (CATEGORY_PROGRAMS[c.slug] ?? []).includes(p.slug));
          if (!items.length) return null;
          return <NebesaMobLane key={c.slug} cat={c} items={items} />;
        })}
      </div>
    </>
  );
}

/**
 * Мобильная лента одной категории: заголовок + горизонтальный скролл карточек
 * с круглыми стрелками ‹ ›. Стрелки гаснут у краёв (is-off) и подсказывают,
 * что ленту можно листать. data-lenis-prevent — иначе Lenis съедает жест.
 */
function NebesaMobLane({ cat, items }: { cat: NebCategory; items: NebProgram[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<{ left: boolean; right: boolean }>({ left: false, right: true });

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    // Лента стартует со scrollLeft ≈ 16 из-за padding+scroll-snap, поэтому порог 24,
    // иначе левая стрелка считалась бы «уже отскролленной» в самом начале.
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdge({ left: el.scrollLeft > 24, right: el.scrollLeft < max - 24 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (!el) return;
    const card = el.querySelector('.progs-mob-card') as HTMLElement | null;
    const step = card ? card.getBoundingClientRect().width + 12 : 220;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="progs-mob-cat">
      <div className="progs-mob-head">
        <button
          type="button"
          className={`progs-mob-arrow l${edge.left ? '' : ' is-off'}`}
          onClick={() => scroll(-1)}
          aria-label="Назад"
        >
          ‹
        </button>
        <h2 className="progs-mob-ttl">{cat.nm}</h2>
        <button
          type="button"
          className={`progs-mob-arrow r${edge.right ? '' : ' is-off'}`}
          onClick={() => scroll(1)}
          aria-label="Вперёд"
        >
          ›
        </button>
      </div>
      <div className="progs-mob-row" data-lenis-prevent ref={rowRef}>
        {items.map((p) => (
            <a className="progs-mob-card" key={p.slug} href={asset(`/nebesaspa/program/${p.slug}`)}>
              <div
                className="progs-mob-pic"
                style={{ backgroundImage: `url(${ASSET}/${programImg(p.slug)}.webp)` }}
              >
                <div className="progs-mob-cap">
                  <div className="progs-mob-price">
                    {fmtPrice(p.price)}
                    <span className="progs-mob-dur"> · {fmtDur(p.dur)}</span>
                  </div>
                  <div className="progs-mob-name">{p.nm}</div>
                </div>
              </div>
            </a>
          ))}
      </div>
    </section>
  );
}
