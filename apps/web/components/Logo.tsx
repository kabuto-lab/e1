'use client';

import { useState, useEffect, useRef } from 'react';

const LETTERS = ['L', 'o', 'v', 'n', 'g', 'e'];
const SEQUENCE = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0];
const STEP_MS = 300;
const PAUSE_MS = 600;
const TOTAL_MS = SEQUENCE.length * STEP_MS + PAUSE_MS;

export default function Logo({ className = '' }: { className?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const paused = useRef(false);
  const lastEmittedIdx = useRef<number>(-999);

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    let start: number | null = null;

    const tick = (ts: number) => {
      if (cancelled) return;
      if (start === null) start = ts;
      if (!paused.current) {
        // Целые мс: иначе на границе % TOTAL_MS float «дрожит» и step скачет каждый кадр → бесконечный setState.
        const elapsedMs = Math.floor(ts - start) % TOTAL_MS;
        const step = Math.floor(elapsedMs / STEP_MS);
        const next = step < SEQUENCE.length ? SEQUENCE[step] : -1;
        if (lastEmittedIdx.current !== next) {
          lastEmittedIdx.current = next;
          setActiveIdx((prev) => (prev === next ? prev : next));
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  const handleEnter = (i: number) => {
    paused.current = true;
    setHovered(i);
  };

  const handleLeave = () => {
    paused.current = false;
    setHovered(null);
  };

  return (
    <span className={`font-display font-bold inline-flex ${className}`}>
      {LETTERS.map((letter, i) => {
        const isHovered = hovered === i;
        const isLit = hovered === null && activeIdx === i;

        const color = isHovered || isLit ? '#f5e6a3' : '#d4af37';
        const shadow = isHovered || isLit
          ? '0 0 14px rgba(212,175,55,0.8), 0 0 28px rgba(212,175,55,0.35)'
          : 'none';

        return (
          <span
            key={i}
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={handleLeave}
            style={{
              color,
              textShadow: shadow,
              transition: isLit
                ? 'color 60ms step-end, text-shadow 60ms step-end'
                : 'color 120ms ease-out, text-shadow 120ms ease-out',
              cursor: 'default',
            }}
          >
            {letter}
          </span>
        );
      })}
    </span>
  );
}
