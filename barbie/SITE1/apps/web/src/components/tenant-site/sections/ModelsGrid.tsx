'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';

/**
 * ModelsGrid — клиентский грид моделей с фильтрами и лайтбоксом.
 * Данные приходят server-side из секции Models (public girls API).
 *
 * Фильтры (client-side, как на статике salonmassage): возраст / рост / грудь /
 * силикон. Клик по карточке → лайтбокс с галереей фото модели.
 * Стилизация — через brand CSS-vars (var(--acc-color) / var(--head-font)…).
 */

const AGE_RANGES: Array<{ label: string; min: number; max: number }> = [
  { label: '18–22', min: 18, max: 22 },
  { label: '23–27', min: 23, max: 27 },
  { label: '28–34', min: 28, max: 34 },
  { label: '35+', min: 35, max: 200 },
];

const HEIGHT_RANGES: Array<{ label: string; min: number; max: number }> = [
  { label: 'до 165', min: 0, max: 164 },
  { label: '165–172', min: 165, max: 172 },
  { label: '173+', min: 173, max: 300 },
];

const BREAST_OPTIONS = [1, 2, 3, 4, 5];

type Tri = 'any' | 'yes' | 'no';

export function ModelsGrid({ girls }: { girls: PublicGirl[] }) {
  const [ageIdx, setAgeIdx] = useState<number | null>(null);
  const [heightIdx, setHeightIdx] = useState<number | null>(null);
  const [breast, setBreast] = useState<number | null>(null);
  const [silicon, setSilicon] = useState<Tri>('any');

  // Lightbox: { girlIndex, photoIndex } | null
  const [lb, setLb] = useState<{ g: number; p: number } | null>(null);

  const filtered = useMemo(() => {
    return girls.filter((g) => {
      if (ageIdx != null) {
        const r = AGE_RANGES[ageIdx];
        if (g.age == null || g.age < r.min || g.age > r.max) return false;
      }
      if (heightIdx != null) {
        const r = HEIGHT_RANGES[heightIdx];
        if (g.height == null || g.height < r.min || g.height > r.max) return false;
      }
      if (breast != null) {
        if (g.breast == null || Math.floor(g.breast) !== breast) return false;
      }
      if (silicon !== 'any') {
        if (silicon === 'yes' && !g.silicon) return false;
        if (silicon === 'no' && g.silicon) return false;
      }
      return true;
    });
  }, [girls, ageIdx, heightIdx, breast, silicon]);

  const reset = () => {
    setAgeIdx(null);
    setHeightIdx(null);
    setBreast(null);
    setSilicon('any');
  };

  const hasFilter = ageIdx != null || heightIdx != null || breast != null || silicon !== 'any';

  // Lightbox navigation
  const curGirl = lb != null ? filtered[lb.g] : null;
  const closeLb = useCallback(() => setLb(null), []);
  const stepPhoto = useCallback(
    (dir: number) => {
      setLb((prev) => {
        if (!prev) return prev;
        const g = filtered[prev.g];
        if (!g) return null;
        const n = g.photos.length;
        return { g: prev.g, p: (prev.p + dir + n) % n };
      });
    },
    [filtered],
  );

  useEffect(() => {
    if (lb == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight') stepPhoto(1);
      else if (e.key === 'ArrowLeft') stepPhoto(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lb, closeLb, stepPhoto]);

  return (
    <div>
      {/* filters */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-10 text-sm">
        <FilterGroup label="Возраст">
          {AGE_RANGES.map((r, i) => (
            <Chip key={r.label} active={ageIdx === i} onClick={() => setAgeIdx(ageIdx === i ? null : i)}>
              {r.label}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="Рост">
          {HEIGHT_RANGES.map((r, i) => (
            <Chip key={r.label} active={heightIdx === i} onClick={() => setHeightIdx(heightIdx === i ? null : i)}>
              {r.label}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="Грудь">
          {BREAST_OPTIONS.map((b) => (
            <Chip key={b} active={breast === b} onClick={() => setBreast(breast === b ? null : b)}>
              {b}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="Силикон">
          {(['any', 'yes', 'no'] as Tri[]).map((v) => (
            <Chip key={v} active={silicon === v} onClick={() => setSilicon(v)}>
              {v === 'any' ? 'любой' : v === 'yes' ? 'да' : 'нет'}
            </Chip>
          ))}
        </FilterGroup>
        {hasFilter && (
          <button
            onClick={reset}
            className="text-xs uppercase tracking-[0.2em] underline underline-offset-4 opacity-60 hover:opacity-100"
          >
            Сбросить
          </button>
        )}
        <span className="ml-auto text-xs uppercase tracking-[0.3em] opacity-50">
          {filtered.length} из {girls.length}
        </span>
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <p className="opacity-60 py-12 text-center">Никто не подходит под фильтры — смягчите критерии.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((g, i) => (
            <button
              key={g.slug}
              onClick={() => g.photos.length > 0 && setLb({ g: i, p: 0 })}
              className="group text-left"
            >
              <div
                className="relative aspect-[3/4] overflow-hidden mb-3"
                style={{ background: 'color-mix(in srgb, var(--body-color) 8%, transparent)' }}
              >
                {g.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl(g.photos[0])}
                    alt={g.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
                {g.photos.length > 1 && (
                  <span className="absolute bottom-2 right-2 text-[10px] tracking-widest px-2 py-0.5 bg-black/50 text-white rounded-full">
                    {g.photos.length} фото
                  </span>
                )}
              </div>
              <h3 className="text-lg md:text-xl mb-1" style={{ fontFamily: 'var(--head-font)' }}>
                {g.name}
              </h3>
              <div className="text-xs opacity-60 flex flex-wrap gap-x-3" style={{ color: 'var(--acc-color)' }}>
                {g.age != null && <span>{g.age} лет</span>}
                {g.height != null && <span>{g.height} см</span>}
                {g.weight != null && <span>{g.weight} кг</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* lightbox */}
      {curGirl && lb && (
        <div
          className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-4"
          onClick={closeLb}
        >
          <button
            className="absolute top-4 right-5 text-white/70 hover:text-white text-3xl leading-none"
            onClick={closeLb}
            aria-label="Закрыть"
          >
            ×
          </button>
          {curGirl.photos.length > 1 && (
            <>
              <button
                className="absolute left-3 md:left-8 text-white/70 hover:text-white text-5xl leading-none"
                onClick={(e) => {
                  e.stopPropagation();
                  stepPhoto(-1);
                }}
                aria-label="Назад"
              >
                ‹
              </button>
              <button
                className="absolute right-3 md:right-8 text-white/70 hover:text-white text-5xl leading-none"
                onClick={(e) => {
                  e.stopPropagation();
                  stepPhoto(1);
                }}
                aria-label="Вперёд"
              >
                ›
              </button>
            </>
          )}
          <figure className="max-w-[92vw] max-h-[88vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(curGirl.photos[lb.p])}
              alt={`${curGirl.name} — фото ${lb.p + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
            />
            <figcaption className="mt-3 text-white/80 text-sm tracking-wide">
              {curGirl.name} · {lb.p + 1}/{curGirl.photos.length}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.2em] opacity-40">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-xs rounded-full border transition-colors"
      style={{
        borderColor: active ? 'var(--acc-color)' : 'color-mix(in srgb, var(--body-color) 25%, transparent)',
        color: active ? 'var(--acc-color)' : 'inherit',
        background: active ? 'color-mix(in srgb, var(--acc-color) 12%, transparent)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}
