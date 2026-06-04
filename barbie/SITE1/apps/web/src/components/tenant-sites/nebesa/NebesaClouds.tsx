'use client';

import { useEffect, useRef } from 'react';

/**
 * NebesaClouds — прозрачные облака (PNG→WebP с альфой) по бокам сайта на переднем
 * плане, с параллаксом при скролле. Каждое облако смещается translateY = scrollY*speed
 * (разные speed → разная «глубина»). Слой декоративный: pointer-events:none + aria-hidden.
 * Позиционируется по всей высоте `.nebesa-site` (которой задан position:relative).
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const C = (n: number) => `${BASE}/tenants/nebesaspa/clouds/cloud-${n}.webp`;

interface Cloud {
  src: string;
  side: 'left' | 'right';
  top: string;
  width: number;
  speed: number; // px вертикального сдвига на 1px скролла (знак = направление)
  opacity: number;
}

const CLOUDS: Cloud[] = [
  { src: C(2), side: 'left', top: '8%', width: 380, speed: -0.20, opacity: 0.9 },
  { src: C(4), side: 'right', top: '22%', width: 300, speed: 0.14, opacity: 0.8 },
  { src: C(3), side: 'left', top: '46%', width: 440, speed: 0.24, opacity: 0.85 },
  { src: C(1), side: 'right', top: '60%', width: 320, speed: -0.16, opacity: 0.8 },
  { src: C(2), side: 'right', top: '84%', width: 400, speed: 0.18, opacity: 0.85 },
  { src: C(3), side: 'left', top: '92%', width: 360, speed: -0.22, opacity: 0.8 },
];

export function NebesaClouds() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = window.scrollY;
      // по всему документу — чтобы двигались и боковые, и hero-облака
      const els = document.querySelectorAll<HTMLElement>('[data-speed]');
      els.forEach((el) => {
        const sp = parseFloat(el.dataset.speed || '0');
        el.style.transform = `translate3d(0, ${(y * sp).toFixed(1)}px, 0)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    apply();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="neb-clouds" ref={ref} aria-hidden>
      {CLOUDS.map((c, i) => (
        <img
          key={i}
          src={c.src}
          alt=""
          data-speed={c.speed}
          className={`neb-cloud ${c.side}`}
          style={{ top: c.top, width: c.width, opacity: c.opacity }}
        />
      ))}
    </div>
  );
}
