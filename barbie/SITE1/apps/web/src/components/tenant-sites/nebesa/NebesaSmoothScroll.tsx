'use client';

import { useEffect } from 'react';

/**
 * NebesaSmoothScroll — тот же плавный скролл, что на salonmassage.ru: библиотека Lenis
 * (вендорный билд /vendor/lenis.min.js, экспортит globalThis.Lenis) с идентичными
 * параметрами `{ duration: 1.2, smoothWheel: true }` + rAF-цикл + перехват кликов по
 * якорным ссылкам (#anchor) с прокруткой к цели и оффсетом −74 под фиксированную шапку.
 *
 * Скрипт подгружается один раз; URL учитывает basePath (/nas в prod) — как и остальные
 * ассеты тенанта. Декоративный слой ничего не рендерит.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const LENIS_SRC = `${BASE}/vendor/lenis.min.js`;

interface LenisInstance {
  raf(time: number): void;
  scrollTo(target: Element, opts?: { offset?: number }): void;
  destroy(): void;
}

export function NebesaSmoothScroll() {
  useEffect(() => {
    let lenis: LenisInstance | null = null;
    let raf = 0;
    let onClick: ((e: MouseEvent) => void) | null = null;

    const start = () => {
      const Lenis = (globalThis as unknown as { Lenis?: new (o: object) => LenisInstance }).Lenis;
      if (!Lenis) return;
      // те же параметры, что в salonmassage-site/index.html
      lenis = new Lenis({ duration: 1.2, smoothWheel: true });
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      // якорные ссылки: плавный скролл к цели с оффсетом под шапку (как на salonmassage)
      onClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const a = target?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (!a) return;
        const href = a.getAttribute('href') || '';
        const i = href.indexOf('#');
        if (i < 0) return;
        const q = href.slice(i);
        if (q.length < 2) return;
        let el: Element | null = null;
        try {
          el = document.querySelector(q);
        } catch {
          return;
        }
        if (!el) return;
        e.preventDefault();
        lenis?.scrollTo(el, { offset: -74 });
      };
      document.addEventListener('click', onClick);
    };

    // вендорный Lenis уже загружен? иначе подгружаем скрипт один раз
    if ((globalThis as { Lenis?: unknown }).Lenis) {
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
    };
  }, []);

  return null;
}
