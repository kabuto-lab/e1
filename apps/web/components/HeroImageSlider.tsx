'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { sameHostToRelativePath } from '@/lib/hero-images';

function StaticHeroOverlay({
  containerRef,
  overlayRenderer,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  overlayRenderer: (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const r = el.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(r.width * dpr);
    const h = Math.floor(r.height * dpr);
    if (w < 2 || h < 2) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    overlayRenderer(ctx, w, h, dpr);
  }, [containerRef, overlayRenderer]);

  useEffect(() => {
    draw();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    void fontsReady.then(() => draw());
    return () => ro.disconnect();
  }, [draw, containerRef]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[1] h-full w-full" />;
}

export interface HeroImageSliderProps {
  images: string[];
  currentIndex?: number;
  className?: string;
  autoplayInterval?: number;
  overlayRenderer?: (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => void;
  onIndexChange?: (index: number) => void;
}

export function HeroImageSlider({
  images,
  currentIndex = 0,
  className = '',
  autoplayInterval = 10000,
  overlayRenderer,
  onIndexChange,
}: HeroImageSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (images.length === 0) {
      setActiveIdx(0);
      return;
    }
    const clamped = Math.min(Math.max(0, currentIndex), images.length - 1);
    setActiveIdx(clamped);
  }, [currentIndex, images.length, images.join(',')]);

  useEffect(() => {
    if (images.length <= 1 || autoplayInterval <= 0) return;
    const id = window.setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % images.length;
        onIndexChange?.(next);
        return next;
      });
    }, autoplayInterval);
    return () => window.clearInterval(id);
  }, [images.length, autoplayInterval, onIndexChange, images.join(',')]);

  if (images.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-[#0a0a0a] ${className}`}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#0a0a0a] ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      {images.map((src, i) => {
        const href = sameHostToRelativePath(src);
        return (
          <img
            key={`${href}-${i}`}
            src={href}
            alt=""
            className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-500 ${
              i === activeIdx ? 'opacity-100' : 'opacity-0'
            }`}
          />
        );
      })}
      {overlayRenderer ? (
        <StaticHeroOverlay containerRef={containerRef} overlayRenderer={overlayRenderer} />
      ) : null}
    </div>
  );
}
