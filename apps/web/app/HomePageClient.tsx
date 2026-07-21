'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';

import Logo from '@/components/Logo';
import GlowText from '@/components/GlowText';
import {
  getHeroImages,
  getHeroSlogan,
  DEFAULT_IMAGES,
  DEFAULT_SLOGAN,
  type HeroSlogan,
} from '@/lib/hero-images';
import { publicMediaUrl } from '@/lib/public-media-url';
import { apiUrl } from '@/lib/api-url';
import { Footer } from '@/components/Footer';
import type { LucideIcon } from 'lucide-react';
import { Lock, BadgeCheck, Crown, Smartphone } from 'lucide-react';

const HeroImageSlider = dynamic(
  () => import('@/components/HeroImageSlider').then((m) => ({ default: m.HeroImageSlider })),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#0a0a0a]" /> },
);

const FEATURES: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: Lock,
    title: 'Приватность',
    text: 'Полная анонимность и конфиденциальность всех взаимодействий на платформе.',
  },
  {
    Icon: BadgeCheck,
    title: 'Верификация',
    text: 'Каждая модель проходит тщательную проверку подлинности и качества.',
  },
  {
    Icon: Crown,
    title: 'Элитный сервис',
    text: 'Высочайший уровень обслуживания и индивидуальный подход к каждому клиенту.',
  },
  {
    Icon: Smartphone,
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
  if (elite) return 'Элит';
  if (verification === 'verified') return 'Премиум';
  return 'VIP';
}

function buildPreviewRows(data: unknown[]): CatalogPreviewRow[] {
  const rows: CatalogPreviewRow[] = [];
  for (const raw of data) {
    if (rows.length >= 4) break;
    const m = raw as {
      id: string;
      slug?: string;
      displayName?: string;
      mainPhotoUrl?: string | null;
      eliteStatus?: boolean;
      verificationStatus?: string;
      physicalAttributes?: { age?: number; city?: string } | null;
    };
    const image = publicMediaUrl(m.mainPhotoUrl);
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
  return rows;
}

export function HomePageClient({ initialCatalog }: { initialCatalog?: unknown[] }) {
  const [heroImages, setHeroImages] = useState<string[]>(DEFAULT_IMAGES);
  const [slogan, setSlogan] = useState<HeroSlogan>(DEFAULT_SLOGAN);
  const [catalogPreview, setCatalogPreview] = useState<CatalogPreviewRow[]>(
    () => (initialCatalog ? buildPreviewRows(initialCatalog) : []),
  );
  const [catalogLoading, setCatalogLoading] = useState(!initialCatalog);

  useEffect(() => {
    setHeroImages(getHeroImages());
    setSlogan(getHeroSlogan());
  }, []);

  // Skip client fetch when server-provided catalog data is available.
  const hasServerCatalog = useRef(!!initialCatalog);
  useEffect(() => {
    if (hasServerCatalog.current) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/models?limit=8&orderBy=createdAt&order=desc'));
        if (!res.ok || cancelled) return;
        const data: unknown = await res.json();
        if (!Array.isArray(data) || cancelled) return;
        if (!cancelled) setCatalogPreview(buildPreviewRows(data));
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

  return (
    <div className="bg-[#0a0a0a] text-white">
      <Navbar />

      {/* HERO */}
      <section
        id="hero"
        className="relative isolate h-screen w-full overflow-hidden scroll-mt-[var(--site-header-height)]"
      >
        {heroImages.length > 0 && (
          <div className="absolute inset-0 z-0 min-h-0">
            <HeroImageSlider images={heroImages} className="h-full min-h-0" />
          </div>
        )}

        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-10 md:px-16 md:pb-16 lg:px-24 lg:pb-20">
          {/* Badge */}
          <div className="mb-4 md:mb-5">
            <span className="inline-block font-body text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]/75 border border-[#d4af37]/35 rounded px-3 py-1">
              Премиальный сервис
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display font-extrabold leading-[1.05] mb-3 md:mb-5">
            <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] text-white drop-shadow-md">
              {slogan.line1}
            </span>
            <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] text-gradient-gold">
              {slogan.line2}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="font-body text-[13px] md:text-base text-white/40 mb-7 md:mb-9 max-w-[16rem] sm:max-w-sm md:max-w-xl leading-relaxed">
            {slogan.subtitle}
          </p>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/models" className="btn-primary btn-hero-frosted">
              <span className="site-header-cta-enter__label !text-[13px]">Смотреть каталог</span>
            </Link>
            <a
              href="#about"
              onClick={(e) => { e.preventDefault(); document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="btn-secondary btn-hero-frosted-secondary"
            >
              Подробнее
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="relative py-[35px] md:py-[70px]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="text-center mb-16">
            <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">О платформе</span>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">
              Почему{' '}
              <Logo className="text-3xl md:text-5xl" />
            </h2>
            <p className="font-body text-white/35 max-w-2xl mx-auto text-base md:text-lg">
              Мы создали платформу, которая устанавливает новый стандарт качества, безопасности и удобства
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ Icon, ...feat }) => (
              <div
                key={feat.title}
                className="group p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03] transition-all duration-300"
              >
                <div className="mb-4 text-[#d4af37]" aria-hidden>
                  <Icon
                    className="h-10 w-10 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.2]"
                    strokeWidth={1.35}
                  />
                </div>
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
      <section id="catalog" className="relative py-[35px] md:py-[70px] border-t border-white/[0.04]">
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
                      <div className="relative aspect-[3/4] overflow-hidden" style={{ backgroundImage: "url('https://placehold.co/300x400/0f0f0f/d4af37')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        <Image
                          src={model.image}
                          alt={model.name}
                          fill
                          unoptimized={model.image.startsWith('/pic-proxy/') || model.image.startsWith('/img-proxy/')}
                          onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 right-3 badge badge-gold">{model.tier}</div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-sm font-bold group-hover:text-[#d4af37] transition-colors">
                          {model.name}
                        </h3>
                        <p className="font-body text-xs text-white/35 mt-1">
                          {model.age > 0 ? `Возраст: ${model.age}` : '—'} &middot; {model.city}
                        </p>
                      </div>
                    </Link>
                  ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-[35px] md:py-[70px] border-t border-white/[0.04]">
        <div className="max-w-[800px] mx-auto px-6 md:px-10 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold mb-5">
            Готовы{' '}
            <span className="text-gradient-gold">начать</span>?
          </h2>
          <p className="font-body text-white/35 mb-10 text-base md:text-lg max-w-lg mx-auto">
            Создайте аккаунт за 30 секунд и получите доступ к эксклюзивному каталогу
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/login" className="site-header-cta-enter !px-8 !py-3.5">
              <span className="site-header-cta-enter__label">Создать аккаунт</span>
            </Link>
            <Link href="/models" className="btn-secondary btn-hero-frosted-secondary">
              Модели
            </Link>
          </div>
        </div>
      </section>

      <div id="contact">
        <Footer />
      </div>
    </div>
  );
}
