'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';

/**
 * GlassReveal — секция «Откровенный показ девушек за стеклом»: матовое
 * запотевшее стекло, сквозь которое тянется длинный «протёртый» ШЛЕЙФ за
 * курсором/пальцем (а не просто круг). Сквозь шлейф видно резкое фото.
 *
 * Техника (canvas-кисть):
 *   - снизу — обычные <img> (резкие, кроссфейд каждые intervalMs);
 *   - сверху — <canvas> с матовым слоем = размытая копия текущего фото + тинт
 *     (оффскрин-«frost»). Кисть стирает слой (destination-out) вдоль пути
 *     курсора → сквозь дыру видно резкий <img>. Каждый кадр слой чуть
 *     подзапотевает обратно (low-alpha re-fog) → стёртый след медленно
 *     затягивается = длинный затухающий хвост.
 *
 * Только чистые фото без водяного знака (allowlist; пометки watermark в API нет).
 */
const CLEAN_SLUGS = new Set([
  'astra', 'avgustina', 'dayzi', 'dora', 'jiji', 'kelli', 'kylie', 'leya',
  'liza', 'malina', 'shakira', 'sharil', 'sheyla', 'treyci', 'vera', 'zlata',
]);

// настройка шлейфа
const REFOG = 0.034; // доля подзапотевания за кадр — меньше = длиннее хвост
const BRUSH = 64; // радиус кисти, px
const TINT = 'rgba(22,13,26,.34)';

export function GlassReveal({
  girls,
  intervalMs = 4200,
}: {
  girls: PublicGirl[];
  intervalMs?: number;
}) {
  const photos = useMemo(() => {
    const covers = girls
      .filter((g) => CLEAN_SLUGS.has(g.slug))
      .map((g) => g.photos?.[0])
      .filter(Boolean) as string[];
    const arr = [...covers];
    for (let k = arr.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [arr[k], arr[j]] = [arr[j], arr[k]];
    }
    return arr;
  }, [girls]);

  const [i, setI] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const photosRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const frost = useRef<HTMLCanvasElement | null>(null);
  const ptr = useRef({ x: 0, y: 0, px: 0, py: 0, active: false });
  const raf = useRef(0);
  const stopAt = useRef(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % photos.length), intervalMs);
    return () => clearInterval(id);
  }, [photos.length, intervalMs]);

  // ── canvas: frost-слой, кисть, re-fog ──
  useEffect(() => {
    const cv = canvasRef.current;
    const wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    function size() {
      const r = wrap!.getBoundingClientRect();
      cv!.width = Math.max(1, Math.round(r.width));
      cv!.height = Math.max(1, Math.round(r.height));
    }

    // оффскрин: размытая копия текущего фото (cover, object-position center 22%) + тинт
    function buildFrost() {
      const img = imgRefs.current[i];
      const W = cv!.width;
      const H = cv!.height;
      let off = frost.current;
      if (!off) {
        off = document.createElement('canvas');
        frost.current = off;
      }
      off.width = W;
      off.height = H;
      const c = off.getContext('2d');
      if (!c) return;
      c.clearRect(0, 0, W, H);
      if (img && img.complete && img.naturalWidth > 0) {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        // *1.12 — тот же базовый scale, что у .glass-photos (параллакс), чтобы
        // размытый frost совпадал с резким фото на границах шлейфа.
        const scale = Math.max(W / iw, H / ih) * 1.12;
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (W - dw) * 0.5;
        const dy = (H - dh) * 0.22;
        c.filter = 'blur(18px) brightness(.8) saturate(.85)';
        c.drawImage(img, dx, dy, dw, dh);
        c.filter = 'none';
      } else {
        c.fillStyle = '#241526';
        c.fillRect(0, 0, W, H);
      }
      c.fillStyle = TINT;
      c.fillRect(0, 0, W, H);
    }

    function paintFull() {
      if (!frost.current) buildFrost();
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = 1;
      ctx!.clearRect(0, 0, cv!.width, cv!.height);
      if (frost.current) ctx!.drawImage(frost.current, 0, 0);
    }

    function frame() {
      const W = cv!.width;
      const H = cv!.height;
      const p = ptr.current;
      // подзапотевание (хвост затягивается)
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = REFOG;
      if (frost.current) ctx!.drawImage(frost.current, 0, 0, W, H);
      ctx!.globalAlpha = 1;
      // стираем вдоль отрезка prev→cur (кисть с мягким краем)
      if (p.active) {
        const dist = Math.hypot(p.x - p.px, p.y - p.py);
        const steps = Math.max(1, Math.ceil(dist / 7));
        ctx!.globalCompositeOperation = 'destination-out';
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = p.px + (p.x - p.px) * t;
          const y = p.py + (p.y - p.py) * t;
          const g = ctx!.createRadialGradient(x, y, 0, x, y, BRUSH);
          g.addColorStop(0, 'rgba(0,0,0,.92)');
          g.addColorStop(0.55, 'rgba(0,0,0,.5)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(x, y, BRUSH, 0, Math.PI * 2);
          ctx!.fill();
        }
        p.px = p.x;
        p.py = p.y;
        ctx!.globalCompositeOperation = 'source-over';
      }
      // остановка цикла, когда курсор давно ушёл (хвост уже затянулся)
      if (!p.active && performance.now() > stopAt.current) {
        paintFull();
        raf.current = 0;
        return;
      }
      raf.current = requestAnimationFrame(frame);
    }

    function ensure() {
      if (!raf.current) raf.current = requestAnimationFrame(frame);
    }

    size();
    buildFrost();
    paintFull();

    // экспонируем хелперы наружу через DOM-узел
    const api = wrap as unknown as {
      _ensure?: () => void;
      _rebuild?: () => void;
      _resize?: () => void;
    };
    api._ensure = ensure;
    api._rebuild = () => {
      buildFrost();
      if (!raf.current) paintFull();
    };
    api._resize = () => {
      size();
      buildFrost();
      if (!raf.current) paintFull();
    };

    const onResize = () => api._resize?.();
    globalThis.addEventListener('resize', onResize);
    return () => {
      globalThis.removeEventListener('resize', onResize);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // фото сменилось → перестроить frost
  useEffect(() => {
    (wrapRef.current as unknown as { _rebuild?: () => void })?._rebuild?.();
  }, [i]);

  function wipe(e: React.PointerEvent) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const p = ptr.current;
    if (!p.active) {
      p.px = x;
      p.py = y;
    }
    p.x = x;
    p.y = y;
    p.active = true;
    stopAt.current = performance.now() + 4000;
    // обратный параллакс: фото уезжает в сторону, ПРОТИВОПОЛОЖНУЮ курсору
    const ph = photosRef.current;
    if (ph) {
      const nx = (x / r.width - 0.5) * 2; // -1..1
      const ny = (y / r.height - 0.5) * 2;
      ph.style.transform = `scale(1.12) translate(${(-nx * 26).toFixed(1)}px, ${(-ny * 18).toFixed(1)}px)`;
    }
    (wrap as unknown as { _ensure?: () => void })._ensure?.();
  }
  function leave() {
    ptr.current.active = false;
    // даём хвосту дотлеть, затем цикл сам остановится
    stopAt.current = performance.now() + 1400;
    // фото плавно возвращается в центр
    if (photosRef.current) photosRef.current.style.transform = 'scale(1.12) translate(0px, 0px)';
  }

  if (photos.length === 0) {
    return <div className="glass-win" aria-hidden style={{ background: 'linear-gradient(160deg,#3a2436,#1a1020)' }} />;
  }

  return (
    <div
      ref={wrapRef}
      className="glass-win"
      onPointerMove={wipe}
      onPointerDown={wipe}
      onPointerLeave={leave}
      onPointerCancel={leave}
    >
      {/* слой фото — двигается обратным параллаксом (см. wipe) */}
      <div ref={photosRef} className="glass-photos">
        {photos.map((p, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p}
            ref={(el) => {
              imgRefs.current[idx] = el;
            }}
            className={`glass-photo${idx === i ? ' on' : ''}`}
            referrerPolicy="no-referrer"
            src={photoUrl(p)}
            alt=""
            loading={idx === 0 ? 'eager' : 'lazy'}
            draggable={false}
            onLoad={() => {
              if (idx === i) (wrapRef.current as unknown as { _rebuild?: () => void })?._rebuild?.();
            }}
          />
        ))}
      </div>
      <canvas ref={canvasRef} className="glass-canvas" aria-hidden />
      <div className="glass-frame" aria-hidden />
      <span className="glass-hint">Проведите по стеклу</span>
    </div>
  );
}
