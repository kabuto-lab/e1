'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { WaterSurface } from '@/components/WaterSurface';
import Logo from '@/components/Logo';

const HERO_IMAGES = [
  '/images_tst/photo-1544005313-94ddf0286df2.jpg',
  '/images_tst/photo-1534528741775-53994a69daeb.jpg',
  '/images_tst/photo-1524504388940-b1c1722653e1.jpg',
  '/images_tst/photo-1531746020798-e6953c6e8e04.jpg',
  '/images_tst/photo-1529626455594-4ff0802cfb7e.jpg',
];

const BAR_COUNT = 32;

export default function ExperimentPage() {
  const audioRef = useRef(0);
  const [micActive, setMicActive] = useState(false);
  const [level, setLevel] = useState(0);
  const [bars, setBars] = useState<number[]>(() => new Array(BAR_COUNT).fill(0));
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, visible: false });
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const freqBuf = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        analyser.getByteFrequencyData(freqBuf);

        const newBars: number[] = [];
        const binsPer = Math.floor(freqBuf.length / BAR_COUNT);
        let totalSum = 0;

        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < binsPer; j++) {
            sum += freqBuf[i * binsPer + j];
          }
          const val = sum / binsPer / 255;
          newBars.push(val);
          totalSum += val;
        }

        const avg = totalSum / BAR_COUNT;
        audioRef.current = avg;
        setLevel(avg);
        setBars(newBars);
      };

      rafRef.current = requestAnimationFrame(tick);
      setMicActive(true);
    } catch {
      setMicActive(false);
    }
  }, []);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    audioRef.current = 0;
    setMicActive(false);
    setLevel(0);
    setBars(new Array(BAR_COUNT).fill(0));
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY, visible: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos((p) => ({ ...p, visible: false }));
  }, []);

  const renderTextOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
      const x = 32 * dpr;
      const yBase = 96 * dpr;
      const isMd = w / dpr >= 768;
      const titleSize = Math.round((isMd ? 48 : 30) * dpr);
      const lineH = Math.round((isMd ? 54 : 34) * dpr);

      ctx.save();
      ctx.font = `800 ${titleSize}px Unbounded, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowOffsetX = dpr;
      ctx.shadowOffsetY = dpr;
      ctx.textBaseline = 'top';
      ctx.fillText('Голос', x, yBase);
      ctx.restore();

      ctx.save();
      ctx.font = `800 ${titleSize}px Unbounded, sans-serif`;
      const metrics = ctx.measureText('→ Волны');
      const grad = ctx.createLinearGradient(x, 0, x + metrics.width, 0);
      grad.addColorStop(0, '#d4af37');
      grad.addColorStop(1, '#f5d76e');
      ctx.fillStyle = grad;
      ctx.textBaseline = 'top';
      ctx.fillText('→ Волны', x, yBase + lineH);
      ctx.restore();

      ctx.save();
      ctx.font = `400 ${Math.round(14 * dpr)}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.textBaseline = 'top';
      const subY = yBase + lineH * 2 + 12 * dpr;
      ctx.fillText('Говори в микрофон и води мышью.', x, subY);
      ctx.fillText('Круг вибрирует воду.', x, subY + 22 * dpr);
      ctx.restore();
    },
    [],
  );

  const ringSize = 60 + level * 120;

  return (
    <div
      className="bg-[#0a0a0a] text-white min-h-screen"
      style={{ cursor: micActive ? 'none' : undefined }}
    >
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl">
          <Logo />
        </Link>
        <Link href="/" className="font-body text-xs text-white/30 hover:text-[#d4af37] transition-colors">
          ← Вернуться
        </Link>
      </header>

      <section
        className="relative w-full h-screen overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <WaterSurface images={HERO_IMAGES} audioLevelRef={audioRef} overlayRenderer={renderTextOverlay} />

        {/* Cursor ring — visible when mic is active */}
        {micActive && mousePos.visible && (
          <div
            className="fixed pointer-events-none z-30"
            style={{
              left: mousePos.x,
              top: mousePos.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Outer glow */}
            <div
              className="absolute rounded-full"
              style={{
                width: ringSize * 1.5,
                height: ringSize * 1.5,
                left: -(ringSize * 1.5) / 2,
                top: -(ringSize * 1.5) / 2,
                background: `radial-gradient(circle, rgba(212,175,55,${level * 0.3}) 0%, transparent 70%)`,
              }}
            />
            {/* Ring */}
            <div
              className="absolute rounded-full border"
              style={{
                width: ringSize,
                height: ringSize,
                left: -ringSize / 2,
                top: -ringSize / 2,
                borderColor: `rgba(212, 175, 55, ${0.15 + level * 0.6})`,
                boxShadow: `0 0 ${8 + level * 30}px rgba(212, 175, 55, ${level * 0.4}), inset 0 0 ${4 + level * 15}px rgba(212, 175, 55, ${level * 0.2})`,
                transition: 'width 0.08s, height 0.08s, left 0.08s, top 0.08s',
              }}
            />
            {/* Center dot */}
            <div
              className="absolute w-2 h-2 rounded-full bg-[#d4af37]"
              style={{
                left: -4,
                top: -4,
                opacity: 0.4 + level * 0.6,
              }}
            />
          </div>
        )}

        {/* VU meter */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <div className="max-w-2xl mx-auto px-6 pb-8">
            <div className="flex items-center justify-center gap-4 mb-4 pointer-events-auto">
              <button
                onClick={micActive ? stopMic : startMic}
                className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  micActive
                    ? 'border-[#d4af37] bg-[#d4af37]/15'
                    : 'border-white/20 bg-black/50 hover:border-white/40'
                }`}
                style={{
                  boxShadow: micActive
                    ? `0 0 ${16 + level * 40}px rgba(212, 175, 55, ${0.15 + level * 0.5})`
                    : 'none',
                }}
              >
                {micActive ? (
                  <svg className="w-6 h-6 text-[#d4af37]" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white/50" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-end justify-center gap-[2px] h-20 bg-black/40 rounded-xl px-3 py-2 backdrop-blur-sm border border-white/[0.06]">
              {bars.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${Math.max(2, val * 64)}px`,
                    backgroundColor: val > 0.8
                      ? '#e05050'
                      : val > 0.5
                        ? '#d4af37'
                        : `rgba(212, 175, 55, ${0.2 + val * 0.6})`,
                    transition: 'height 0.06s',
                  }}
                />
              ))}
            </div>

            {!micActive && (
              <p className="text-center font-body text-[11px] text-white/20 mt-3">
                Включите микрофон и водите мышью — голос вибрирует воду
              </p>
            )}
          </div>
        </div>

      </section>
    </div>
  );
}
