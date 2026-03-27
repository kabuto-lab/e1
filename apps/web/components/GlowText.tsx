'use client';

import { useState, useEffect, useMemo } from 'react';

interface GlowTextProps {
  text: string;
  className?: string;
  cycleMs?: number;
  letterDelay?: number;
}

export default function GlowText({
  text,
  className = '',
  cycleMs = 4000,
  letterDelay = 140,
}: GlowTextProps) {
  const [glowIndex, setGlowIndex] = useState(-2);
  const letters = useMemo(() => text.split(''), [text]);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) % cycleMs;
      setGlowIndex(Math.floor(elapsed / letterDelay) - 1);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cycleMs, letterDelay]);

  return (
    <span className={className} style={{ display: 'inline' }}>
      {letters.map((char, i) => {
        if (char === ' ') return <span key={i}>&nbsp;</span>;

        const dist = Math.abs(glowIndex - i);
        const intensity = dist === 0 ? 1 : dist === 1 ? 0.4 : dist === 2 ? 0.12 : 0;

        const shadow = intensity > 0
          ? `0 0 ${8 + 16 * intensity}px rgba(255,255,255,${0.3 + 0.5 * intensity}), 0 0 ${24 + 20 * intensity}px rgba(255,255,255,${0.1 + 0.2 * intensity})`
          : 'none';

        return (
          <span
            key={i}
            style={{
              textShadow: shadow,
              transition: 'text-shadow 200ms ease',
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
