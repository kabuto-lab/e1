'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { generateDemoPhotos } from '@/lib/demo-photos';
import { RippleSurface } from '@/components/RippleSurface';
import { apiUrl } from '@/lib/api-url';

interface ModelProfile {
  id: string;
  displayName: string;
  slug: string;
  biography?: string;
  verificationStatus: string;
  eliteStatus: boolean;
  isPublished: boolean;
  availabilityStatus?: string;
  physicalAttributes?: {
    age?: number;
    height?: number;
    weight?: number;
    bustSize?: number;
    bustType?: string;
    bodyType?: string;
    temperament?: string;
    sexuality?: string;
    hairColor?: string;
    eyeColor?: string;
    city?: string;
  };
  rateHourly?: number;
  rateOvernight?: number;
  mainPhotoUrl?: string;
  photos?: Array<{
    id: string;
    url: string;
    isVisible?: boolean;
    albumCategory?: string;
    sortOrder?: number;
  }>;
}

interface ApiReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | null;
}

type ModelReviewsApi =
  | { accessMode: 'list'; reviews: ApiReview[] }
  | { accessMode: 'summary'; averageRating: string; totalReviews: number };

function bearerHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem('accessToken');
  const token = raw?.replace(/^"|"$/g, '') ?? '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const BODY_TYPE_RU: Record<string, string> = {
  slim: 'Стройная', curvy: 'Пышная', bbw: 'Плюс', pear: 'Груша', fit: 'Спортивная',
};
const BUST_TYPE_RU: Record<string, string> = { natural: 'Натуральная', silicone: 'Силикон' };
const TEMPERAMENT_RU: Record<string, string> = { gentle: 'Нежный', active: 'Активный', adaptable: 'Гибкий' };

function buildAllPhotos(profile: ModelProfile): { thumb: string; full: string }[] {
  if (profile.photos && profile.photos.length > 0) {
    return profile.photos.map((p) => ({ thumb: p.url, full: p.url }));
  }
  const thumbs = generateDemoPhotos(profile.id, profile.mainPhotoUrl, 12, 400, 600);
  return thumbs.map((thumb) => {
    const full = /\/pic-proxy\/seed\/[^/]+\/\d+\/\d+$/.test(thumb)
      ? thumb.replace(/\/\d+\/\d+$/, '/2000/3000')
      : thumb;
    return { thumb, full };
  });
}

export default function ModelProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [reviewPayload, setReviewPayload] = useState<ModelReviewsApi | null>(null);
  const [reviewLoadState, setReviewLoadState] = useState<'guest' | 'denied' | 'ok'>('guest');
  const [desktopSidebarTab, setDesktopSidebarTab] = useState<'gallery' | 'reviews'>('gallery');
  const [staffReviewer, setStaffReviewer] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [slug]);

  const loadProfile = async () => {
    try {
      const response = await fetch(apiUrl(`/models/${slug}`));
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Модель не найдена' : 'Ошибка загрузки');
      }
      const data = await response.json();
      if (!data) throw new Error('Модель не найдена');

      try {
        const mediaRes = await fetch(apiUrl(`/profiles/models/${data.id}/media`));
        if (mediaRes.ok) {
          const mediaFiles = await mediaRes.json();
          const visiblePhotos = mediaFiles
            .filter((m: any) => m.cdnUrl && m.isPublicVisible !== false)
            .map((m: any) => ({
              id: m.id,
              url: m.cdnUrl,
              isVisible: m.isPublicVisible,
              albumCategory: m.albumCategory,
              sortOrder: m.sortOrder,
            }));
          if (visiblePhotos.length > 0) {
            data.photos = visiblePhotos;
          }
        }
      } catch {
        // media fetch is non-critical, fall back to demo photos
      }

      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const reloadReviews = useCallback(async () => {
    if (!profile?.id) return;
    const auth = bearerHeaders();
    if (!auth.Authorization) {
      setReviewPayload(null);
      setReviewLoadState('guest');
      return;
    }
    try {
      const r = await fetch(apiUrl(`/reviews/model/${profile.id}?limit=50`), { headers: { ...auth } });
      if (r.status === 401 || r.status === 403) {
        setReviewPayload(null);
        setReviewLoadState('denied');
        return;
      }
      if (!r.ok) {
        setReviewPayload(null);
        setReviewLoadState('denied');
        return;
      }
      const data = (await r.json()) as ModelReviewsApi;
      if (data?.accessMode === 'list' || data?.accessMode === 'summary') {
        setReviewPayload(data);
        setReviewLoadState('ok');
      } else {
        setReviewPayload(null);
        setReviewLoadState('denied');
      }
    } catch {
      setReviewPayload(null);
      setReviewLoadState('denied');
    }
  }, [profile?.id]);

  useEffect(() => {
    reloadReviews();
  }, [reloadReviews]);

  const showReviewsUi = reviewLoadState === 'ok' && reviewPayload !== null;

  const reviewsCountLabel = useMemo(() => {
    if (!reviewPayload) return 0;
    if (reviewPayload.accessMode === 'summary') return reviewPayload.totalReviews;
    return reviewPayload.reviews.length;
  }, [reviewPayload]);

  const listReviews = reviewPayload?.accessMode === 'list' ? reviewPayload.reviews : [];

  useEffect(() => {
    if (!showReviewsUi) setDesktopSidebarTab('gallery');
  }, [showReviewsUi]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('accessToken');
      if (!raw) {
        setStaffReviewer(false);
        return;
      }
      const token = raw.replace(/^"|"$/g, '');
      const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string };
      setStaffReviewer(payload.role === 'admin' || payload.role === 'manager');
    } catch {
      setStaffReviewer(false);
    }
  }, []);

  const scrollToReviewsMobile = useCallback(() => {
    document.getElementById('model-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="font-display text-lg text-white/60">{error || 'Модель не найдена'}</div>
        <Link href="/models" className="btn-secondary">
          Вернуться к моделям
        </Link>
      </div>
    );
  }

  const allPhotos = buildAllPhotos(profile);
  const pa = profile.physicalAttributes;

  const attrs = [
    pa?.age && { label: 'Возраст', value: `${pa.age}` },
    pa?.height && { label: 'Рост', value: `${pa.height} см` },
    pa?.weight && { label: 'Вес', value: `${pa.weight} кг` },
    pa?.bustSize && { label: 'Грудь', value: `${pa.bustSize}` },
    pa?.bustType && { label: 'Тип', value: BUST_TYPE_RU[pa.bustType] || pa.bustType },
    pa?.bodyType && { label: 'Тело', value: BODY_TYPE_RU[pa.bodyType] || pa.bodyType },
    pa?.temperament && { label: 'Темп.', value: TEMPERAMENT_RU[pa.temperament] || pa.temperament },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#0a0a0a] lg:h-screen lg:overflow-hidden">
      {/* Header — hidden on mobile */}
      <header className="flex-shrink-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04] z-50 hidden lg:block">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl">
              <Logo />
            </Link>
            <span className="text-white/30 font-light">/</span>
            <Link href="/models" className="font-display text-xl font-bold text-white/50 hover:text-white transition-colors">
              Модель
            </Link>
            <span className="text-white/30 font-light">:</span>
            <span className="font-display text-xl font-bold text-white">
              {profile.displayName}
            </span>
            {profile.eliteStatus && <span className="badge badge-gold ml-2">Elite</span>}
            {profile.verificationStatus === 'verified' && <span className="badge badge-success ml-1">✓</span>}
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="font-body text-[13px] text-white/40 hover:text-[#d4af37] transition-colors uppercase tracking-[0.1em]">
              Главная
            </Link>
            <Link href="/models" className="font-body text-[13px] text-white/40 hover:text-[#d4af37] transition-colors uppercase tracking-[0.1em]">
              Модели
            </Link>
          </nav>
        </div>
      </header>

      {/* ===== DESKTOP ===== */}
      <div className="flex-1 hidden lg:flex min-h-0">
        {/* LEFT — 75% photo viewer with ripple + pan */}
        <PanRippleViewer
          photos={allPhotos}
          activePhoto={activePhoto}
          setActivePhoto={setActivePhoto}
          profile={profile}
          attrs={attrs}
          onReviewsClick={() => setDesktopSidebarTab('reviews')}
          reviewsCount={reviewsCountLabel}
          showReviewsButton={showReviewsUi}
        />

        {/* RIGHT — rounded panel (фото | отзывы) */}
        <div className="flex w-1/4 flex-col bg-black p-3" style={{ isolation: 'isolate' }}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border-[3px] border-[#d4af37]/40 bg-[#161616]">
            <div className="flex-shrink-0 px-4 pb-2 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-[#d4af37]/40 ring-offset-1 ring-offset-[#111]">
                  <img src={allPhotos[0]?.thumb} alt={profile.displayName} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-sm font-bold text-white">{profile.displayName}</div>
                  <div className="font-body text-[11px] text-white/35">{allPhotos.length} фото</div>
                </div>
              </div>
              {showReviewsUi ? (
                <div className="mt-3 flex gap-0 border-b border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setDesktopSidebarTab('gallery')}
                    className={`min-h-[40px] flex-1 border-b-2 py-2 font-body text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                      desktopSidebarTab === 'gallery'
                        ? 'border-[#d4af37] text-white'
                        : 'border-transparent text-white/40 hover:text-white/70'
                    }`}
                  >
                    Фото
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesktopSidebarTab('reviews')}
                    className={`min-h-[40px] flex-1 border-b-2 py-2 font-body text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                      desktopSidebarTab === 'reviews'
                        ? 'border-[#d4af37] text-white'
                        : 'border-transparent text-white/40 hover:text-white/70'
                    }`}
                  >
                    Отзывы ({reviewsCountLabel})
                  </button>
                </div>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {showReviewsUi && desktopSidebarTab === 'reviews' ? (
                <div className="px-3 pb-4 pt-1">
                  {reviewPayload?.accessMode === 'summary' ? (
                    <div>
                      <ReviewsSummaryOnly
                        averageRating={reviewPayload.averageRating}
                        totalReviews={reviewPayload.totalReviews}
                      />
                      {staffReviewer ? (
                        <StaffReviewComposer modelId={profile.id} onCreated={reloadReviews} variant="sidebar" />
                      ) : null}
                    </div>
                  ) : (
                    <PublicReviewsSection
                      reviews={listReviews}
                      showTitle={false}
                      staffComposer={
                        staffReviewer ? (
                          <StaffReviewComposer modelId={profile.id} onCreated={reloadReviews} variant="sidebar" />
                        ) : null
                      }
                    />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-px bg-white/[0.04]">
                  {allPhotos.map((photo, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActivePhoto(i)}
                      className={`relative aspect-square overflow-hidden transition-all duration-200 ${
                        activePhoto === i ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo.thumb}
                        alt={`${profile.displayName} ${i + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {activePhoto === i ? (
                        <div className="pointer-events-none absolute inset-0 border-2 border-[#d4af37]" />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="flex-1 flex flex-col lg:hidden min-h-0">
        {/* Mobile header */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between bg-[#0a0a0a]/90 backdrop-blur-lg z-30">
          <Link href="/models" className="text-white/50 text-sm font-body">← Модели</Link>
          <span className="font-display text-base font-bold text-white">{profile.displayName}</span>
          <span className="font-body text-xs text-white/30">{activePhoto + 1}/{allPhotos.length}</span>
        </div>

        {/* Main photo */}
        <div className="flex-1 relative bg-black overflow-hidden min-h-0">
          <RippleSurface
            images={allPhotos.map((p) => p.full)}
            currentIndex={activePhoto}
            onIndexChange={setActivePhoto}
            config={{
              interaction: 'click',
              brushSize: 0.05,
              brushForce: 8,
              refraction: 0.4,
              specularIntensity: 2,
              specularPower: 50,
              autoplayInterval: 0,
            }}
            paused={false}
          />

          {/* Bottom info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 z-10">
            <h2 className="font-display text-xl font-bold text-white">{profile.displayName}</h2>
            {attrs.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-body text-xs text-white/50 mt-1">
                {attrs.slice(0, 3).map(({ label, value }) => (
                  <span key={label}>{label}: <span className="text-white/80">{value}</span></span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className="flex-shrink-0 bg-[#0a0a0a] border-t border-white/[0.06]">
          <div className="flex overflow-x-auto gap-1 p-2 scrollbar-hide">
            {allPhotos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden transition-all duration-200 ${
                  activePhoto === i ? 'ring-2 ring-[#d4af37] opacity-100' : 'opacity-50'
                }`}
              >
                <img
                  src={photo.thumb}
                  alt={`${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Contact bar */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-white/[0.06] bg-[#0a0a0a] px-4 py-3">
          {showReviewsUi ? (
            <button type="button" onClick={scrollToReviewsMobile} className="btn-secondary shrink-0 !px-4 !py-2.5 !text-sm">
              Отзывы ({reviewsCountLabel})
            </button>
          ) : (
            <span className="w-px shrink-0" aria-hidden />
          )}
          <div className="flex items-center gap-4">
            <div className="flex gap-4">
              {profile.rateHourly && (
                <div>
                  <div className="font-body text-[10px] uppercase text-white/30">Час</div>
                  <div className="font-display text-base font-bold text-[#d4af37]">{profile.rateHourly} ₽</div>
                </div>
              )}
              {profile.rateOvernight && (
                <div>
                  <div className="font-body text-[10px] uppercase text-white/30">Ночь</div>
                  <div className="font-display text-base font-bold text-[#d4af37]">{profile.rateOvernight} ₽</div>
                </div>
              )}
            </div>
            <button type="button" className="btn-primary shrink-0 !px-6 !py-2.5 !text-sm">
              Связаться
            </button>
          </div>
        </div>

        {showReviewsUi ? (
          <div
            id="model-reviews"
            className="flex-shrink-0 border-t border-white/[0.06] bg-[#0c0c0c] px-4 py-5 lg:hidden"
          >
            {reviewPayload?.accessMode === 'summary' ? (
              <section aria-label="Отзывы">
                <h3 className="font-display mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
                  Отзывы
                </h3>
                <ReviewsSummaryOnly
                  averageRating={reviewPayload.averageRating}
                  totalReviews={reviewPayload.totalReviews}
                />
                {staffReviewer ? (
                  <StaffReviewComposer modelId={profile.id} onCreated={reloadReviews} variant="mobile" />
                ) : null}
              </section>
            ) : (
              <PublicReviewsSection
                reviews={listReviews}
                className=""
                staffComposer={
                  staffReviewer ? (
                    <StaffReviewComposer modelId={profile.id} onCreated={reloadReviews} variant="mobile" />
                  ) : null
                }
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop viewer: pan on hover + ripple on click                    */
/* ------------------------------------------------------------------ */

const PAN_LERP = 0.04;
const PAN_SCALE = 1.15;

function PanRippleViewer({
  photos, activePhoto, setActivePhoto, profile, attrs, onReviewsClick, reviewsCount, showReviewsButton,
}: {
  photos: { thumb: string; full: string }[];
  activePhoto: number;
  setActivePhoto: (i: number | ((p: number) => number)) => void;
  profile: ModelProfile;
  attrs: { label: string; value: string }[];
  onReviewsClick: () => void;
  reviewsCount: number;
  showReviewsButton: boolean;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      const c = currentRef.current;
      const t = targetRef.current;
      c.x += (t.x - c.x) * PAN_LERP;
      c.y += (t.y - c.y) * PAN_LERP;
      if (innerRef.current) {
        innerRef.current.style.transform =
          `scale(${PAN_SCALE}) translate(${c.x}px, ${c.y}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    targetRef.current = {
      x: -nx * (PAN_SCALE - 1) * rect.width,
      y: -ny * (PAN_SCALE - 1) * rect.height,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    targetRef.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    targetRef.current = { x: 0, y: 0 };
    currentRef.current = { x: 0, y: 0 };
  }, [activePhoto]);

  const total = photos.length;

  return (
    <div
      ref={outerRef}
      className="w-3/4 relative bg-black overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={innerRef} className="absolute inset-0 will-change-transform" style={{ transform: `scale(${PAN_SCALE})` }}>
        <RippleSurface
          images={photos.map((p) => p.full)}
          currentIndex={activePhoto}
          onIndexChange={setActivePhoto as (i: number) => void}
          config={{
            interaction: 'click',
            brushSize: 0.03,
            brushForce: 6,
            refraction: 0.4,
            specularIntensity: 2,
            specularPower: 50,
            autoplayInterval: 0,
          }}
          paused={false}
        />
      </div>

      {/* Navigation arrows */}
      <button
        onClick={() => setActivePhoto((prev: number) => (prev - 1 + total) % total)}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white/60 hover:text-white transition-all z-20"
      >
        ‹
      </button>
      <button
        onClick={() => setActivePhoto((prev: number) => (prev + 1) % total)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white/60 hover:text-white transition-all z-20"
      >
        ›
      </button>

      <div className="absolute top-4 right-4 font-body text-xs text-white/40 bg-black/50 px-3 py-1 rounded-full z-20">
        {activePhoto + 1} / {total}
      </div>

      {/* Bottom overlay — model info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-16 z-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-white mb-1">
              {profile.displayName}
            </h1>
            {attrs.length > 0 && (
              <div className="flex gap-4 font-body text-sm text-white/50">
                {attrs.slice(0, 4).map(({ label, value }) => (
                  <span key={label}>{label}: <span className="text-white/80">{value}</span></span>
                ))}
              </div>
            )}
            {profile.biography && (
              <p className="font-body text-sm text-white/30 mt-2 max-w-lg line-clamp-2">
                {profile.biography}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {profile.rateHourly && (
              <div className="text-right">
                <div className="font-body text-[10px] text-white/30 uppercase">Час</div>
                <div className="font-display text-lg font-bold text-[#d4af37]">{profile.rateHourly} ₽</div>
              </div>
            )}
            {profile.rateOvernight && (
              <div className="text-right">
                <div className="font-body text-[10px] text-white/30 uppercase">Ночь</div>
                <div className="font-display text-lg font-bold text-[#d4af37]">{profile.rateOvernight} ₽</div>
              </div>
            )}
            {showReviewsButton ? (
              <button type="button" onClick={onReviewsClick} className="btn-secondary !px-5 !py-3 !text-sm">
                Отзывы ({reviewsCount})
              </button>
            ) : null}
            <button type="button" className={`btn-primary !px-6 !py-3 !text-sm ${showReviewsButton ? 'ml-1' : ''}`}>
              Связаться
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewsSummaryOnly({ averageRating, totalReviews }: { averageRating: string; totalReviews: number }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/35 px-3 py-3">
      <p className="font-body text-[13px] text-white/80">
        Средняя оценка{' '}
        <span className="font-display font-bold text-[#d4af37]">{averageRating}</span>
        <span className="text-white/40"> / 5</span>
      </p>
      <p className="mt-1 font-body text-[11px] text-white/40">
        Всего отзывов: <span className="tabular-nums text-white/60">{totalReviews}</span>
      </p>
      <p className="mt-2 font-body text-[10px] leading-snug text-white/30">
        Полный список отзывов доступен на тарифах Standard и Premium.
      </p>
    </div>
  );
}

function PublicReviewsSection({
  id,
  reviews,
  className,
  showTitle = true,
  staffComposer,
}: {
  id?: string;
  reviews: ApiReview[];
  className?: string;
  showTitle?: boolean;
  staffComposer?: ReactNode;
}) {
  return (
    <section id={id} className={className} aria-label="Отзывы">
      {showTitle ? (
        <h3 className="font-display mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Отзывы</h3>
      ) : null}
      {reviews.length === 0 ? (
        <p className="font-body text-xs text-white/35">Пока нет отзывов.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-white/[0.06] bg-black/40 px-2.5 py-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] tracking-tight" aria-hidden>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < Math.min(5, Math.max(0, r.rating)) ? 'text-[#d4af37]' : 'text-white/12'}>
                      ★
                    </span>
                  ))}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {r.moderationStatus && r.moderationStatus !== 'approved' ? (
                    <span className="rounded px-1 py-px font-body text-[8px] font-semibold uppercase text-amber-300/90">
                      {r.moderationStatus === 'pending' ? 'модер.' : r.moderationStatus}
                    </span>
                  ) : null}
                  <time className="font-body text-[10px] tabular-nums text-white/30" dateTime={r.createdAt}>
                    {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </time>
                </span>
              </div>
              {r.comment?.trim() ? (
                <p className="font-body text-[12px] leading-snug text-white/70 line-clamp-4">{r.comment.trim()}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {staffComposer}
    </section>
  );
}

function StaffReviewComposer({
  modelId,
  onCreated,
  variant,
}: {
  modelId: string;
  onCreated: () => void;
  variant: 'sidebar' | 'mobile';
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const raw = localStorage.getItem('accessToken');
      const token = raw?.replace(/^"|"$/g, '') ?? '';
      const res = await fetch('/api/reviews/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ modelId, rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.message === 'string' ? j.message : 'Не удалось отправить отзыв');
      }
      setComment('');
      setRating(5);
      setFeedback('Отправлено на модерацию');
      onCreated();
    } catch (e: unknown) {
      setFeedback(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const box =
    variant === 'sidebar'
      ? 'mt-3 border-t border-white/[0.08] pt-3'
      : 'mt-4 border-t border-white/[0.08] pt-4';

  return (
    <div className={box}>
      <p className="mb-2 font-body text-[10px] font-medium uppercase tracking-wide text-[#d4af37]/80">Добавить отзыв</p>
      <p className="mb-2 font-body text-[10px] leading-snug text-white/35">Доступно для администратора и менеджера.</p>
      <div className="mb-2 flex gap-1" role="group" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`h-8 min-w-[2rem] rounded font-body text-xs font-semibold transition-colors ${
              n <= rating ? 'bg-[#d4af37]/25 text-[#d4af37]' : 'bg-white/[0.06] text-white/35 hover:bg-white/[0.1]'
            }`}
            aria-pressed={n === rating}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Текст отзыва…"
        className="mb-2 w-full resize-none rounded-lg border border-white/[0.1] bg-black/50 px-2.5 py-2 font-body text-[12px] text-white/90 placeholder:text-white/25 outline-none focus:border-[#d4af37]/40"
      />
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="btn-primary w-full !py-2 !text-xs disabled:opacity-50"
      >
        {busy ? 'Отправка…' : 'Опубликовать отзыв'}
      </button>
      {feedback ? (
        <p className={`mt-2 font-body text-[11px] ${feedback === 'Отправлено на модерацию' ? 'text-emerald-400/90' : 'text-red-400/90'}`}>
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
