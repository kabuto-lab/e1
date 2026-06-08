'use client';

import { useEffect } from 'react';

/**
 * SmoothScroll — единый плавный скролл (Lenis) для ВСЕХ публичных тенантов,
 * тот же, что на salonmassage.ru: вендорный билд /vendor/lenis.min.js
 * (экспортит globalThis.Lenis), параметры { duration: 1.2, smoothWheel: true } +
 * rAF-цикл + перехват кликов по якорям (#anchor) с оффсетом под фиксированную шапку.
 *
 * Монтируется один раз в app/(tenants)/layout.tsx → покрывает все страницы всех
 * тенантов (НЕ /admin). Глобальный guard (__nasLenis) защищает от двойного
 * инстанса, если компонент случайно смонтируется где-то ещё. Ничего не рендерит.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const LENIS_SRC = `${BASE}/vendor/lenis.min.js`;

interface LenisInstance {
  raf(time: number): void;
  scrollTo(target: Element, opts?: { offset?: number }): void;
  destroy(): void;
}

export function SmoothScroll({ offset = 80 }: { offset?: number }) {
  useEffect(() => {
    const g = globalThis as unknown as {
      Lenis?: new (o: object) => LenisInstance;
      __nasLenis?: boolean;
    };
    if (g.__nasLenis) return; // уже активен другой инстанс
    let lenis: LenisInstance | null = null;
    let raf = 0;
    let onClick: ((e: MouseEvent) => void) | null = null;

    const start = () => {
      if (g.__nasLenis || !g.Lenis) return;
      g.__nasLenis = true;
      lenis = new g.Lenis({ duration: 1.2, smoothWheel: true });
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      onClick = (e: MouseEvent) => {
        const el = e.target as HTMLElement | null;
        const a = el?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (!a) return;
        const href = a.getAttribute('href') || '';
        const i = href.indexOf('#');
        if (i < 0) return;
        const q = href.slice(i);
        if (q.length < 2) return;
        let tgt: Element | null = null;
        try {
          tgt = document.querySelector(q);
        } catch {
          return;
        }
        if (!tgt) return;
        e.preventDefault();
        lenis?.scrollTo(tgt, { offset: -offset });
      };
      document.addEventListener('click', onClick);
    };

    if (g.Lenis) {
      start();
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${LENIS_SRC}"]`);
      if (!script) {
        script = document.createElement('script');
        script.src = LENIS_SRC;
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', start);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (onClick) document.removeEventListener('click', onClick);
      lenis?.destroy();
      g.__nasLenis = false;
    };
  }, [offset]);

  return null;
}
