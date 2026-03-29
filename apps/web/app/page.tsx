'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { WaterSurface } from '@/components/WaterSurface';
import Logo from '@/components/Logo';
import GlowText from '@/components/GlowText';
import { getHeroImages, getHeroSlogan, DEFAULT_IMAGES, DEFAULT_SLOGAN, type HeroSlogan } from '@/lib/hero-images';
import { generateDemoPhotos } from '@/lib/demo-photos';
import { apiUrl } from '@/lib/api-url';

function useMicLevel() {
  const levelRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const [active, setActive] = useState(false);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        levelRef.current = sum / buf.length / 255;
      };
      rafRef.current = requestAnimationFrame(tick);
      setActive(true);
    } catch { /* permission denied — silent fail */ }
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    levelRef.current = 0;
    setActive(false);
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
  }, []);

  return { levelRef, active, start, stop };
}

const FEATURES = [
  {
    icon: '🔒',
    title: 'Приватность',
    text: 'Полная анонимность и конфиденциальность всех взаимодействий на платформе.',
  },
  {
    icon: '✓',
    title: 'Верификация',
    text: 'Каждая модель проходит тщательную проверку подлинности и качества.',
  },
  {
    icon: '⭐',
    title: 'Элитный сервис',
    text: 'Высочайший уровень обслуживания и индивидуальный подход к каждому клиенту.',
  },
  {
    icon: '📱',
    title: 'Удобная платформа',
    text: 'Современный интерфейс с мгновенной связью и защищённым бронированием.',
  },
];

type CatalogPreviewRow = {
  id: string;
  slug: string;
  name: string;
  age: number;
  city: string;
  tier: string;
  image: string;
};

function tierLabel(elite: boolean, verification: string): string {
  if (elite) return 'Elite';
  if (verification === 'verified') return 'Premium';
  return 'VIP';
}

function buildHeroOverlay(slogan: HeroSlogan) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
    const cssW = w / dpr;
    const isMd = cssW >= 768;
    const padX = (cssW >= 1024 ? 96 : isMd ? 64 : 32) * dpr;
    const btnAreaH = (isMd ? 140 : 100) * dpr;
    const titleSize = Math.round((isMd ? 64 : 36) * dpr);
    const lineH = Math.round((isMd ? 72 : 44) * dpr);
    const subSize = Math.round((isMd ? 18 : 13) * dpr);

    const textBlockH = lineH * 2 + 16 * dpr + subSize + 8 * dpr;
    const baseY = h - btnAreaH - textBlockH - 24 * dpr;

    // Shadow hidden for now
    // const shOx = -220 * dpr;
    // const shOy = 5 * dpr;
    // const shScale = 1.3;
    // const shTitleSize = Math.round(titleSize * shScale);
    // const shLineH = Math.round(lineH * shScale);
    // const shSubSize = Math.round(subSize * shScale);
    // ctx.save();
    // ctx.globalAlpha = 0.45;
    // ctx.filter = `blur(${Math.round(8 * dpr)}px)`;
    // ctx.fillStyle = '#000000';
    // ctx.textBaseline = 'top';
    // ctx.font = `800 ${shTitleSize}px Unbounded, sans-serif`;
    // ctx.fillText(slogan.line1, padX + shOx, baseY + shOy);
    // ctx.fillText(slogan.line2, padX + shOx, baseY + shLineH + shOy);
    // ctx.font = `400 ${shSubSize}px Inter, sans-serif`;
    // ctx.fillText(slogan.subtitle, padX + shOx, baseY + shLineH * 2 + 16 * dpr + shOy);
    // ctx.restore();

    // badge
    ctx.save();
    const badgeText = 'Премиальный сервис';
    ctx.font = `600 ${Math.round(11 * dpr)}px Inter, sans-serif`;
    const badgeW = ctx.measureText(badgeText).width + 20 * dpr;
    const badgeH = 24 * dpr;
    const badgeY = baseY - badgeH - 16 * dpr;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = dpr;
    const bx = padX, by = badgeY, bw = badgeW, bh = badgeH, br = 6 * dpr;
    ctx.beginPath();
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + bw - br, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
    ctx.lineTo(bx + bw, by + bh - br);
    ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
    ctx.lineTo(bx + br, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
    ctx.lineTo(bx, by + br);
    ctx.arcTo(bx, by, bx + br, by, br);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, padX + 10 * dpr, badgeY + badgeH / 2);
    ctx.restore();

    // line 1
    ctx.save();
    ctx.font = `800 ${titleSize}px Unbounded, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowOffsetX = dpr;
    ctx.shadowOffsetY = dpr;
    ctx.textBaseline = 'top';
    ctx.fillText(slogan.line1, padX, baseY);
    ctx.restore();

    // line 2 (gold)
    ctx.save();
    ctx.font = `800 ${titleSize}px Unbounded, sans-serif`;
    const metrics = ctx.measureText(slogan.line2);
    const grad = ctx.createLinearGradient(padX, 0, padX + metrics.width, 0);
    grad.addColorStop(0, '#d4af37');
    grad.addColorStop(1, '#f5d76e');
    ctx.fillStyle = grad;
    ctx.textBaseline = 'top';
    ctx.fillText(slogan.line2, padX, baseY + lineH);
    ctx.restore();

    // subtitle
    ctx.save();
    ctx.font = `400 ${subSize}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textBaseline = 'top';
    ctx.fillText(slogan.subtitle, padX, baseY + lineH * 2 + 16 * dpr);
    ctx.restore();
  };
}

export default function HomePage() {
  const mic = useMicLevel();
  const [heroImages, setHeroImages] = useState<string[]>(DEFAULT_IMAGES);
  const [slogan, setSlogan] = useState<HeroSlogan>(DEFAULT_SLOGAN);
  const [catalogPreview, setCatalogPreview] = useState<CatalogPreviewRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    setHeroImages(getHeroImages());
    setSlogan(getHeroSlogan());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/models?limit=8&orderBy=createdAt&order=desc'));
        if (!res.ok || cancelled) return;
        const data: unknown = await res.json();
        if (!Array.isArray(data) || cancelled) return;
        const rows: CatalogPreviewRow[] = [];
        for (const raw of data.slice(0, 4)) {
          const m = raw as {
            id: string;
            slug?: string;
            displayName?: string;
            mainPhotoUrl?: string | null;
            eliteStatus?: boolean;
            verificationStatus?: string;
            physicalAttributes?: { age?: number; city?: string } | null;
          };
          const image = generateDemoPhotos(m.id, m.mainPhotoUrl ?? null, 12)[0];
          if (!image) continue;
          rows.push({
            id: m.id,
            slug: (m.slug || m.id).trim() || m.id,
            name: (m.displayName || 'Модель').trim(),
            age: m.physicalAttributes?.age ?? 0,
            city: (m.physicalAttributes?.city || '—').trim(),
            tier: tierLabel(!!m.eliteStatus, m.verificationStatus || ''),
            image,
          });
        }
        if (!cancelled) setCatalogPreview(rows);
      } catch {
        if (!cancelled) setCatalogPreview([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const heroOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
      if (slogan) buildHeroOverlay(slogan)(ctx, w, h, dpr);
    },
    [slogan],
  );

  return (
    <div className="bg-[#0a0a0a] text-white">
      <Navbar />

      {/* HERO */}
      <section id="hero" className="relative w-full h-screen overflow-hidden">
        {heroImages.length > 0 && (
          <WaterSurface
            images={heroImages}
            audioLevelRef={mic.levelRef}
            overlayRenderer={heroOverlay}
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-16 lg:p-24">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/models" className="btn-primary">
              Смотреть каталог
            </Link>
            <a
              href="#about"
              onClick={(e) => { e.preventDefault(); document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="btn-secondary"
            >
              Подробнее
            </a>
            {/* Tiny mic toggle */}
            <button
              onClick={mic.active ? mic.stop : mic.start}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                mic.active
                  ? 'border-[#d4af37]/40 bg-[#d4af37]/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
              title={mic.active ? 'Выключить микрофон' : 'Включить микрофон — голос создаёт волны'}
            >
              <svg className={`w-3.5 h-3.5 ${mic.active ? 'text-[#d4af37]/60' : 'text-white/20'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="relative py-24 md:py-32">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="text-center mb-16">
            <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">О платформе</span>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">
              Почему{' '}
              <span className="text-gradient-gold">Lovnge</span>
            </h2>
            <p className="font-body text-white/35 max-w-2xl mx-auto text-base md:text-lg">
              Мы создали платформу, которая устанавливает новый стандарт качества, безопасности и удобства
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="group p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03] transition-all duration-300"
              >
                <div className="text-3xl mb-4">{feat.icon}</div>
                <h3 className="font-display text-base font-bold mb-2 group-hover:text-[#d4af37] transition-colors">
                  {feat.title}
                </h3>
                <p className="font-body text-sm text-white/35 leading-relaxed">
                  {feat.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATALOG PREVIEW */}
      <section id="catalog" className="relative py-24 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">Модели</span>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3">
                Наши модели
              </h2>
            </div>
            <Link
              href="/models"
              className="font-body text-sm text-[#d4af37] font-medium hover:underline underline-offset-4 uppercase tracking-wider"
            >
              Показать все &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {catalogLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/[0.04] bg-white/[0.02] overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[3/4] bg-white/[0.06]" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-2/3 rounded bg-white/[0.08]" />
                      <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
                    </div>
                  </div>
                ))
              : catalogPreview.length === 0
                ? (
                    <p className="col-span-full text-center font-body text-sm text-white/35 py-8">
                      Пока нет опубликованных анкет — откройте{' '}
                      <Link href="/models" className="text-[#d4af37] hover:underline">
                        каталог
                      </Link>
                      .
                    </p>
                  )
                : catalogPreview.map((model) => (
                    <Link
                      key={model.id}
                      href={`/models/${model.slug}`}
                      className="group block rounded-2xl overflow-hidden border border-white/[0.04] bg-white/[0.02] hover:border-[#d4af37]/25 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#d4af37]/10"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <img
                          src={model.image}
                          alt={model.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 right-3 badge badge-gold">{model.tier}</div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-sm font-bold group-hover:text-[#d4af37] transition-colors">
                          {model.name}
                        </h3>
                        <p className="font-body text-xs text-white/35 mt-1">
                          {model.age > 0 ? `${model.age} лет` : '—'} &middot; {model.city}
                        </p>
                      </div>
                    </Link>
                  ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-[800px] mx-auto px-6 md:px-10 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold mb-5">
            Готовы{' '}
            <span className="text-gradient-gold">начать</span>?
          </h2>
          <p className="font-body text-white/35 mb-10 text-base md:text-lg max-w-lg mx-auto">
            Создайте аккаунт за 30 секунд и получите доступ к эксклюзивному каталогу
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/login" className="btn-primary">
              Создать аккаунт
            </Link>
            <Link href="/models" className="btn-secondary">
              Модели
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="border-t border-white/[0.04] py-12">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <Logo className="text-xl" />
              <p className="font-body text-xs text-white/20 mt-1">
                Премиальная платформа сопровождения
              </p>
            </div>
            <nav className="flex items-center gap-6 font-body text-xs text-white/25">
              <Link href="/models" className="hover:text-[#d4af37] transition-colors">Модели</Link>
              <Link href="/login" className="hover:text-[#d4af37] transition-colors">Вход</Link>
              <Link href="/dashboard" className="hover:text-[#d4af37] transition-colors">Панель</Link>
            </nav>
            <p className="font-body text-xs text-white/15">
              &copy; {new Date().getFullYear()} Lovnge
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
