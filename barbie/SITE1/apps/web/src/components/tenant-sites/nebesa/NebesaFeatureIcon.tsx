'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * NebesaFeatureIcon — Lottie-иконка преимущества, которая «играет» при наведении мыши.
 * Плеер lottie-web подгружается из вендорного билда /vendor/lottie_light.min.js (он
 * выставляет globalThis.lottie). Реестр-CDN в этом окружении режут большие ответы, поэтому
 * файл плеера кладётся вручную (см. инструкцию в чате). Пока плеера нет — graceful fallback
 * на статичную SVG-иконку (`fallback`), страница не ломается.
 *
 * Анимация: autoplay выключен — иконка стоит на первом кадре; mouseenter → проигрыш вперёд,
 * mouseleave → реверс к началу (как у «wired hover» набора).
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const LOTTIE_SRC = `${BASE}/vendor/lottie_light.min.js`;

interface LottieAnim {
  setDirection(d: 1 | -1): void;
  goToAndPlay(value: number, isFrame?: boolean): void;
  play(): void;
  destroy(): void;
}
interface LottieGlobal {
  loadAnimation(params: {
    container: Element;
    renderer: 'svg';
    loop: boolean;
    autoplay: boolean;
    path: string;
  }): LottieAnim;
}

// один общий промис загрузки вендорного плеера на всю страницу
let lottiePromise: Promise<LottieGlobal | null> | null = null;
function loadLottie(): Promise<LottieGlobal | null> {
  if (lottiePromise) return lottiePromise;
  lottiePromise = new Promise((resolve) => {
    const existing = (globalThis as { lottie?: LottieGlobal }).lottie;
    if (existing) return resolve(existing);
    const done = () => resolve((globalThis as { lottie?: LottieGlobal }).lottie ?? null);
    let s = document.querySelector<HTMLScriptElement>(`script[src="${LOTTIE_SRC}"]`);
    if (!s) {
      s = document.createElement('script');
      s.src = LOTTIE_SRC;
      s.async = true;
      document.body.appendChild(s);
    }
    s.addEventListener('load', done);
    s.addEventListener('error', () => resolve(null)); // плеера нет → fallback
  });
  return lottiePromise;
}

interface Props {
  name: string; // имя json в /tenants/nebesaspa/lottie/<name>.json
  fallback: string; // путь к статичной svg на случай отсутствия плеера
  size?: number;
}

export function NebesaFeatureIcon({ name, fallback, size = 56 }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<LottieAnim | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLottie().then((lottie) => {
      if (cancelled || !lottie || !boxRef.current) return;
      animRef.current = lottie.loadAnimation({
        container: boxRef.current,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: `${BASE}/tenants/nebesaspa/lottie/${name}.json`,
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [name]);

  const play = () => {
    const a = animRef.current;
    if (!a) return;
    a.setDirection(1);
    a.goToAndPlay(0, true);
  };
  const reverse = () => {
    const a = animRef.current;
    if (!a) return;
    a.setDirection(-1);
    a.play();
  };

  return (
    <div
      className="feature-icon"
      style={{ width: size, height: size }}
      onMouseEnter={play}
      onMouseLeave={reverse}
    >
      {/* контейнер для svg-рендера Lottie */}
      <div ref={boxRef} style={{ width: '100%', height: '100%' }} />
      {/* пока Lottie не готов — статичная иконка (не ломаем вёрстку) */}
      {!ready && <img className="feature-icon-fallback" src={fallback} alt="" aria-hidden loading="lazy" />}
    </div>
  );
}
