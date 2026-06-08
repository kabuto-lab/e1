'use client';

import { useEffect } from 'react';

/**
 * ShinyCtaFx — заставляет золотой blob (`.shiny-cta .blind`) следовать за курсором.
 *
 * CSS (`salonmassage.css`) позиционирует blob через переменные `--mx/--my`
 * (`translate: calc(var(--mx,50%) - 50%) …`), но сам их не обновляет — без JS
 * blob стоит в центре. Один делегированный `pointermove` на документе ставит
 * `--mx/--my` в пикселях относительно наведённой `.shiny-cta` (центр blob'а
 * 84px → `calc(--mx - 50%)` центрирует его ровно под курсором).
 */
export function ShinyCtaFx() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('.shiny-cta') as
        | HTMLElement
        | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);

  return null;
}
