'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';

/**
 * GlassReveal — секция «Откровенный показ девушек за стеклом» как запотевшее
 * стекло витрины: фото медленно сменяются за матовым стеклом, а курсор/палец
 * «протирает» круг чистого стекла (mask-hole следует за указателем). При уходе
 * указателя стекло снова запотевает (анимация @property --r). Бьёт прямо в
 * слоган «Видно будет всё, но только не вас».
 *
 * Показываем ТОЛЬКО чистые фото без водяного знака (allowlist чистых slug'ов —
 * заменены батчем 2026-06-08; пометки watermark в API пока нет).
 */
const CLEAN_SLUGS = new Set([
  'astra', 'avgustina', 'dayzi', 'dora', 'jiji', 'kelli', 'kylie', 'leya',
  'liza', 'malina', 'shakira', 'sharil', 'sheyla', 'treyci', 'vera', 'zlata',
]);

export function GlassReveal({
  girls,
  intervalMs = 4200,
}: {
  girls: PublicGirl[];
  /** Период смены фото за стеклом, мс. */
  intervalMs?: number;
}) {
  // Перемешанный пул чистых обложек (одна на девушку), стабильный на маунт.
  const photos = useMemo(() => {
    const covers = girls
      .filter((g) => CLEAN_SLUGS.has(g.slug))
      .map((g) => g.photos?.[0])
      .filter(Boolean) as string[];
    const arr = [...covers];
    for (let k = arr.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [arr[k], arr[j]] = [arr[j], arr[k]];
    }
    return arr;
  }, [girls]);

  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % photos.length), intervalMs);
    return () => clearInterval(id);
  }, [photos.length, intervalMs]);

  function wipe(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
    el.style.setProperty('--r', '135px');
  }
  function refog() {
    ref.current?.style.setProperty('--r', '0px');
  }

  // Фолбэк: чистых фото нет — сиреневое стекло без раскрытия.
  if (photos.length === 0) {
    return <div className="glass-win" aria-hidden style={{ background: 'linear-gradient(160deg,#3a2436,#1a1020)' }} />;
  }

  return (
    <div
      ref={ref}
      className="glass-win"
      onPointerMove={wipe}
      onPointerDown={wipe}
      onPointerLeave={refog}
      onPointerCancel={refog}
    >
      {photos.map((p, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p}
          className={`glass-photo${idx === i ? ' on' : ''}`}
          referrerPolicy="no-referrer"
          src={photoUrl(p)}
          alt=""
          loading={idx === 0 ? 'eager' : 'lazy'}
          draggable={false}
        />
      ))}
      <div className="glass-fog" aria-hidden />
      <div className="glass-frame" aria-hidden />
      <span className="glass-hint">Проведите по стеклу</span>
    </div>
  );
}
