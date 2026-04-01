'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePlatformBranding } from '@/components/PlatformBrandingProvider';

const STEP_MS = 300;
const PAUSE_MS = 600;

function buildSequence(len: number): number[] {
  if (len <= 0) return [-1];
  if (len === 1) return [0];
  const seq: number[] = [];
  for (let i = 0; i < len; i++) seq.push(i);
  for (let i = len - 2; i >= 0; i--) seq.push(i);
  return seq;
}

export default function Logo({ className = '' }: { className?: string }) {
  const { textLogo, textLogoBlink } = usePlatformBranding();
  const letters = useMemo(() => {
    const t = textLogo?.trim() || 'Lovnge';
    return t.length > 0 ? Array.from(t) : Array.from('Lovnge');
  }, [textLogo]);

  const sequence = useMemo(() => buildSequence(letters.length), [letters.length]);
  const totalMs = sequence.length * STEP_MS + PAUSE_MS;

  const [hovered, setHovered] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const paused = useRef(false);
  const lastEmittedIdx = useRef<number>(-999);

  useEffect(() => {
    lastEmittedIdx.current = -999;
    if (!textLogoBlink) {
      setActiveIdx(-1);
      return;
    }

    let frame = 0;
    let cancelled = false;
    let start: number | null = null;

    const tick = (ts: number) => {
      if (cancelled) return;
      if (start === null) start = ts;
      if (!paused.current) {
        const elapsedMs = Math.floor(ts - start) % totalMs;
        const step = Math.floor(elapsedMs / STEP_MS);
        const next = step < sequence.length ? sequence[step] : -1;
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
  }, [textLogo, textLogoBlink, sequence, totalMs]);

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
      {letters.map((letter, i) => {
        const isHovered = hovered === i;
        const isLit = textLogoBlink && hovered === null && activeIdx === i;

        const color = isHovered || isLit ? '#f5e6a3' : '#d4af37';
        const shadow =
          isHovered || isLit
            ? '0 0 14px rgba(212,175,55,0.8), 0 0 28px rgba(212,175,55,0.35)'
            : 'none';

        return (
          <span
            key={`${i}-${letter}`}
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
