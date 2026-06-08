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
  const fogFast = useRef<HTMLDivElement>(null);
  const fogSlow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % photos.length), intervalMs);
    return () => clearInterval(id);
  }, [photos.length, intervalMs]);

  // ── Протирание стекла с инерцией: цель тянет два «чистых» круга — быстрый и
  // медленный (хвост-шлейф) — через rAF-лерп. При уходе курсора круги не
  // схлопываются сразу: hold-задержка, затем нелинейное затухание (шлейф). ──
  const target = useRef({ x: 0, y: 0, active: false, leaveAt: 0 });
  const fast = useRef({ x: 0, y: 0, r: 0 });
  const slow = useRef({ x: 0, y: 0, r: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const R_FAST = 118;
    const R_SLOW = 152;
    const HOLD_MS = 170; // запаздывание перед началом затухания

    function paint(el: HTMLDivElement | null, s: { x: number; y: number; r: number }) {
      if (!el) return;
      el.style.setProperty('--mx', `${s.x}px`);
      el.style.setProperty('--my', `${s.y}px`);
      el.style.setProperty('--r', `${s.r}px`);
    }

    function frame() {
      const t = target.current;
      const closing = !t.active;
      const held = closing && performance.now() < t.leaveAt + HOLD_MS;
      const tgtFast = closing ? 0 : R_FAST;
      const tgtSlow = closing ? 0 : R_SLOW;
      // position всегда тянется к курсору (медленный слой отстаёт → шлейф)
      fast.current.x += (t.x - fast.current.x) * 0.32;
      fast.current.y += (t.y - fast.current.y) * 0.32;
      slow.current.x += (t.x - slow.current.x) * 0.12;
      slow.current.y += (t.y - slow.current.y) * 0.12;
      // radius: открытие быстрое; закрытие — после hold, медленно и нелинейно
      const kFast = closing ? (held ? 0 : 0.1) : 0.34;
      const kSlow = closing ? (held ? 0 : 0.055) : 0.24;
      fast.current.r += (tgtFast - fast.current.r) * kFast;
      slow.current.r += (tgtSlow - slow.current.r) * kSlow;

      paint(fogFast.current, fast.current);
      paint(fogSlow.current, slow.current);

      // остановка, когда всё затухло и курсор ушёл (экономим кадры)
      if (closing && fast.current.r < 0.5 && slow.current.r < 0.5) {
        fast.current.r = 0;
        slow.current.r = 0;
        paint(fogFast.current, fast.current);
        paint(fogSlow.current, slow.current);
        raf.current = 0;
        return;
      }
      raf.current = requestAnimationFrame(frame);
    }

    function ensure() {
      if (!raf.current) raf.current = requestAnimationFrame(frame);
    }
    // экспонируем старт через ref-замыкание
    (ref.current as unknown as { _ensure?: () => void })._ensure = ensure;
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, []);

  function wipe(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    target.current.x = e.clientX - rect.left;
    target.current.y = e.clientY - rect.top;
    if (!target.current.active) {
      // первое касание — стартуем круги из точки курсора (без прыжка с центра)
      target.current.active = true;
      if (fast.current.r === 0) {
        fast.current.x = slow.current.x = target.current.x;
        fast.current.y = slow.current.y = target.current.y;
      }
    }
    (el as unknown as { _ensure?: () => void })._ensure?.();
  }
  function refog() {
    target.current.active = false;
    target.current.leaveAt = performance.now();
    (ref.current as unknown as { _ensure?: () => void })._ensure?.();
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
      {/* медленный слой — отстаёт, даёт шлейф; быстрый — основной круг */}
      <div ref={fogSlow} className="glass-fog glass-fog-slow" aria-hidden />
      <div ref={fogFast} className="glass-fog glass-fog-fast" aria-hidden />
      <div className="glass-frame" aria-hidden />
      <span className="glass-hint">Проведите по стеклу</span>
    </div>
  );
}
