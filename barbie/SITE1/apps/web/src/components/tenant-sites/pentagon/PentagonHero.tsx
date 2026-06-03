'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * PentagonHero — веерная видео-карусель (порт fanned deck из прототипа
 * pentagon-landing.html на React). Карточки — модели каталога, у которых есть
 * видео; видео играют muted+loop (без звука, как требует профиль).
 *
 * Активная карточка в центре, соседние развёрнуты в перспективе. Автоплей
 * прокрутки, точки-навигация, свайп/драг. Поведение 1:1 со статикой.
 */
export interface HeroItem {
  slug: string;
  name: string;
  video: string;
  poster: string;
}

// Конфиг веера по |смещению от активной| (0 центр, 1 рядом, 2 край)
const POS: Record<number, { x: number; z: number; ry: number; sc: number; op: number; zi: number; bl: number }> = {
  0: { x: 0, z: 0, ry: 0, sc: 1, op: 1, zi: 50, bl: 0 },
  1: { x: 300, z: -220, ry: -26, sc: 0.82, op: 0.9, zi: 40, bl: 0.5 },
  2: { x: 520, z: -420, ry: -34, sc: 0.66, op: 0.55, zi: 30, bl: 1.5 },
};

export function PentagonHero({ items }: { items: HeroItem[] }) {
  const cards = items.slice(0, 7);
  const N = cards.length;
  const [active, setActive] = useState(Math.floor(N / 2));
  const sx = useRef<number | null>(null);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);

  const go = (i: number) => setActive(((i % N) + N) % N);

  // Автоплей прокрутки веера.
  useEffect(() => {
    if (N <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % N), 5000);
    return () => clearInterval(t);
  }, [N]);

  // Играет только центральная карточка; при ротации стартует новый центр,
  // остальные на паузе (экономия ресурсов). autoPlay-атрибут не годится —
  // он срабатывает лишь на mount, поэтому управляем императивно через ref.
  useEffect(() => {
    vids.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => undefined);
      } else {
        v.pause();
      }
    });
  }, [active]);

  if (!N) return null;

  function styleFor(i: number): React.CSSProperties {
    let d = i - active;
    if (d > N / 2) d -= N;
    if (d < -N / 2) d += N;
    const ad = Math.min(Math.abs(d), 2);
    const p = POS[ad];
    const sign = d < 0 ? -1 : 1;
    if (Math.abs(d) > 2) {
      return { opacity: 0, pointerEvents: 'none', transform: `translateX(${sign * p.x}px) translateZ(-600px) scale(.5)` };
    }
    return {
      opacity: p.op,
      zIndex: p.zi,
      filter: `brightness(${ad === 0 ? 1 : 0.7}) blur(${p.bl}px)`,
      transform: `translateX(${sign * p.x}px) translateZ(${p.z}px) rotateY(${sign * p.ry}deg) scale(${p.sc})`,
    };
  }

  return (
    <div className="stage">
      <div
        className="deck"
        onPointerDown={(e) => { sx.current = e.clientX; }}
        onPointerUp={(e) => {
          if (sx.current == null) return;
          const dx = e.clientX - sx.current;
          sx.current = null;
          if (dx < -40) go(active + 1);
          else if (dx > 40) go(active - 1);
        }}
      >
        {cards.map((c, i) => {
          const isActive = i === active;
          return (
            <div key={c.slug} className="vcard" style={styleFor(i)} onClick={() => !isActive && go(i)}>
              <video
                ref={(el) => { vids.current[i] = el; }}
                src={c.video}
                poster={c.poster}
                muted
                loop
                playsInline
                autoPlay={isActive}
                preload={isActive ? 'auto' : 'metadata'}
              />
              <div className="vshade" />
              <div className="label">{c.name}</div>
            </div>
          );
        })}
      </div>
      <div className="dots">
        {cards.map((c, i) => (
          <b key={c.slug} className={i === active ? 'on' : ''} onClick={() => go(i)} role="button" aria-label={c.name} />
        ))}
      </div>
    </div>
  );
}
