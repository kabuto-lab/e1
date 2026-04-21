'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { generateDemoPhotos } from '@/lib/demo-photos';
import { apiUrl } from '@/lib/api-url';
import { useAuth } from '@/components/AuthProvider';
import { ModelFavoriteButton } from '@/components/ModelFavoriteButton';
import { BookingTonModal } from '@/components/BookingTonModal';
import { Pencil } from 'lucide-react';
import { resolveHeroSliderTypography, type HeroSliderTypography } from '@/lib/hero-slider-typography';
import { publicMediaUrl } from '@/lib/public-media-url';

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
  heroSliderTypography?: HeroSliderTypography | null;
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
    return profile.photos.map((p) => {
      const u = publicMediaUrl(p.url);
      return { thumb: u, full: u };
    });
  }
  const thumbs = generateDemoPhotos(profile.id, profile.mainPhotoUrl, 12, 400, 600);
  return thumbs.map((thumb) => {
    const full = /\/pic-proxy\/seed\/[^/]+\/\d+\/\d+$/.test(thumb)
      ? thumb.replace(/\/\d+\/\d+$/, '/2000/3000')
      : thumb;
    return { thumb, full };
  });
}

/** Бейджи «Элитная» и верификация — справа от имени в карточке профиля, не в хлебных крошках. */
function ModelTrustBadges({ profile }: { profile: ModelProfile }) {
  const showElite = profile.eliteStatus;
  const showVerified = profile.verificationStatus === 'verified';
  if (!showElite && !showVerified) return null;
  return (
    <div className="flex shrink-0 items-center gap-2">
      {showElite ? <span className="badge badge-gold whitespace-nowrap">Элитная</span> : null}
      {showVerified ? (
        <span className="badge badge-success" aria-label="Верифицирована">
          ✓
        </span>
      ) : null}
    </div>
  );
}

export default function ModelProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { isAdmin, user: authUser } = useAuth();

  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [reviewPayload, setReviewPayload] = useState<ModelReviewsApi | null>(null);
  const [reviewLoadState, setReviewLoadState] = useState<'guest' | 'denied' | 'ok'>('guest');
  const [desktopSidebarTab, setDesktopSidebarTab] = useState<'gallery' | 'reviews'>('gallery');
  const [staffReviewer, setStaffReviewer] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((i: number) => {
    setLightboxIndex(i);
    setLightboxOpen(true);
  }, []);

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
      if (typeof data.mainPhotoUrl === 'string' && data.mainPhotoUrl) {
        data.mainPhotoUrl = publicMediaUrl(data.mainPhotoUrl);
      }

      try {
        const mediaRes = await fetch(apiUrl(`/media/model/${data.id}`));
        if (mediaRes.ok) {
          const mediaFiles = await mediaRes.json();
          const visiblePhotos = mediaFiles
            .filter((m: any) => m.cdnUrl)
            .map((m: any) => ({
              id: m.id,
              url: publicMediaUrl(m.cdnUrl),
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

  const heroTy = resolveHeroSliderTypography(profile?.heroSliderTypography ?? null);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
        <SiteHeader
          variant="page"
          segment={{ crumbs: [{ label: 'Загрузка…' }] }}
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4af37]/30 border-t-[#d4af37]" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
        <SiteHeader variant="page" segment={{ crumbs: [{ href: '/models', label: 'Модели' }] }} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="font-display text-lg text-white/60">{error || 'Модель не найдена'}</div>
          <Link href="/models" className="btn-secondary">
            Вернуться к моделям
          </Link>
        </div>
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
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#0a0a0a] pt-[var(--site-header-height)] lg:h-screen lg:overflow-hidden">
      <SiteHeader
        variant="page"
        segment={{
          crumbs: [{ href: '/models', label: 'Модели' }, { label: profile.displayName }],
        }}
        afterLoginCta={
          isAdmin ? (
            <Link
              href={`/dashboard/models/${profile.id}/edit`}
              className="whitespace-nowrap font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d4af37]/90 transition-colors hover:text-[#d4af37] focus:outline-none focus-visible:text-[#d4af37]"
            >
              Редактировать
            </Link>
          ) : null
        }
      />

      {/* ===== DESKTOP ===== */}
      <div className="flex-1 hidden lg:flex min-h-0">
        {/* LEFT — 75% photo viewer with pan */}
        <PanPhotoViewer
          photos={allPhotos}
          activePhoto={activePhoto}
          setActivePhoto={setActivePhoto}
          profile={profile}
          attrs={attrs}
          heroTy={heroTy}
          onReviewsClick={() => setDesktopSidebarTab('reviews')}
          reviewsCount={reviewsCountLabel}
          showReviewsButton={showReviewsUi}
          onOpenLightbox={openLightbox}
        />

        {/* RIGHT — rounded panel (фото | отзывы) */}
        <div className="flex w-1/4 flex-col bg-black p-3" style={{ isolation: 'isolate' }}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border-[3px] border-[#d4af37]/40 bg-[#161616]">
            <div className="flex-shrink-0 px-4 pb-2 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-[#d4af37]/40 ring-offset-1 ring-offset-[#111]">
                  <img src={allPhotos[0]?.thumb} alt={profile.displayName} className="h-full w-full object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-bold text-white">{profile.displayName}</div>
                    <div className="font-body text-[11px] text-white/35">{allPhotos.length} фото</div>
                  </div>
                  <ModelTrustBadges profile={profile} />
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
            <div className="profile-mock-gold-scroll min-h-0 flex-1 overflow-y-auto pr-0.5">
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
                      onClick={() => { setActivePhoto(i); openLightbox(i); }}
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
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:hidden">
        {/* Main photo */}
        <div className="relative min-h-[min(52dvh,480px)] w-full flex-1 bg-black lg:min-h-0">
          {allPhotos.length > 0 ? (
            <>
              <img
                key={allPhotos[activePhoto]?.full ?? activePhoto}
                src={allPhotos[activePhoto]?.full}
                alt=""
                className="absolute inset-0 h-full w-full object-cover cursor-zoom-in"
                onClick={() => openLightbox(activePhoto)}
              />
              <div
                className="pointer-events-none absolute right-3 top-3 z-[7] font-body text-xs tabular-nums text-white/85 bg-black/55 px-2.5 py-1 rounded-full backdrop-blur-sm"
                aria-hidden
              >
                {activePhoto + 1}/{allPhotos.length}
              </div>
              {isAdmin ? (
                <Link
                  href={`/dashboard/models/${profile.id}/edit`}
                  className="absolute left-3 top-3 z-[7] inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-black/55 text-[#d4af37] backdrop-blur-sm transition-colors hover:border-[#d4af37]/45 hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45"
                  aria-label={`Редактировать профиль ${profile.displayName}`}
                >
                  <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
              ) : null}
              {allPhotos.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActivePhoto((p) => (p - 1 + allPhotos.length) % allPhotos.length)}
                    className="absolute left-2 top-1/2 z-[6] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-lg text-white/90 backdrop-blur-sm transition-colors hover:bg-black/75"
                    aria-label="Предыдущее фото"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhoto((p) => (p + 1) % allPhotos.length)}
                    className="absolute right-2 top-1/2 z-[6] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-lg text-white/90 backdrop-blur-sm transition-colors hover:bg-black/75"
                    aria-label="Следующее фото"
                  >
                    ›
                  </button>
                </>
              ) : null}
            </>
          ) : null}

          {/* Bottom info overlay */}
          <div
            className="pointer-events-auto absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12"
            style={{ fontFamily: heroTy.fontFamily }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h2
                  className="min-w-0 flex-1 truncate text-xl font-bold drop-shadow-sm"
                  style={{ color: heroTy.textColor }}
                >
                  {profile.displayName}
                </h2>
                <ModelFavoriteButton
                  slug={profile.slug}
                  displayName={profile.displayName}
                  className="shrink-0"
                />
              </div>
              <ModelTrustBadges profile={profile} />
            </div>
            {attrs.length > 0 && (
              <div
                className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-body text-xs"
                style={{ color: heroTy.metaColor }}
              >
                {attrs.slice(0, 3).map(({ label, value }) => (
                  <span key={label}>
                    {label}: <span className="opacity-90">{value}</span>
                  </span>
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

        {/* Contact bar: столбец цен (час / ночь по строкам) + связаться; отзывы ниже на странице */}
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-[#0a0a0a] px-4 py-3">
          <div className="min-w-0 flex flex-1 flex-col justify-center gap-1">
            {profile.rateHourly ? (
              <div className="flex w-full max-w-[14rem] items-baseline justify-between gap-2 sm:max-w-none">
                <span className="shrink-0 font-body text-[10px] uppercase tracking-wide text-white/30">Час</span>
                <span className="min-w-0 truncate text-right font-display text-sm font-bold tabular-nums text-[#d4af37] sm:text-base">
                  {profile.rateHourly} ₽
                </span>
              </div>
            ) : null}
            {profile.rateOvernight ? (
              <div className="flex w-full max-w-[14rem] items-baseline justify-between gap-2 sm:max-w-none">
                <span className="shrink-0 font-body text-[10px] uppercase tracking-wide text-white/30">Ночь</span>
                <span className="min-w-0 truncate text-right font-display text-sm font-bold tabular-nums text-[#d4af37] sm:text-base">
                  {profile.rateOvernight} ₽
                </span>
              </div>
            ) : null}
            {!profile.rateHourly && !profile.rateOvernight ? (
              <span className="font-body text-xs text-white/25">Тарифы уточняйте</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!authUser) {
                window.location.href = `/login?next=/models/${slug}`;
                return;
              }
              setShowBookingModal(true);
            }}
            className="btn-primary shrink-0 self-center !px-5 !py-2.5 !text-sm"
          >
            <span className="site-header-cta-enter__label !text-sm">Показать контакты</span>
          </button>
        </div>

        {showBookingModal && profile && (
          <BookingTonModal
            modelId={profile.id}
            modelSlug={slug}
            modelName={profile.displayName}
            rateHourly={profile.rateHourly ?? null}
            onClose={() => setShowBookingModal(false)}
          />
        )}

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

      {lightboxOpen && (
        <Lightbox
          photos={allPhotos}
          index={lightboxIndex}
          onChange={setLightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop viewer: pan on hover                                      */
/* ------------------------------------------------------------------ */

const PAN_LERP = 0.04;
const PAN_SCALE = 1.15;

function PanPhotoViewer({
  photos,
  activePhoto,
  setActivePhoto,
  profile,
  attrs,
  heroTy,
  onReviewsClick,
  reviewsCount,
  showReviewsButton,
  onOpenLightbox,
}: {
  photos: { thumb: string; full: string }[];
  activePhoto: number;
  setActivePhoto: (i: number | ((p: number) => number)) => void;
  profile: ModelProfile;
  attrs: { label: string; value: string }[];
  heroTy: ReturnType<typeof resolveHeroSliderTypography>;
  onReviewsClick: () => void;
  reviewsCount: number;
  showReviewsButton: boolean;
  onOpenLightbox: (i: number) => void;
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
      className="w-3/4 relative bg-black overflow-hidden cursor-zoom-in"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onOpenLightbox(activePhoto);
      }}
    >
      <div ref={innerRef} className="absolute inset-0 will-change-transform" style={{ transform: `scale(${PAN_SCALE})` }}>
        {photos.length > 0 ? (
          <img
            key={photos[activePhoto]?.full ?? activePhoto}
            src={photos[activePhoto]?.full}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
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
      <div
        className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-16"
        style={{ fontFamily: heroTy.fontFamily }}
      >
        <div className="flex items-end justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-extrabold leading-tight drop-shadow-sm" style={{ color: heroTy.textColor }}>
              {profile.displayName}
            </h1>
            {attrs.length > 0 && (
              <div className="flex gap-4 font-body text-sm" style={{ color: heroTy.metaColor }}>
                {attrs.slice(0, 4).map(({ label, value }) => (
                  <span key={label}>
                    {label}: <span className="opacity-90">{value}</span>
                  </span>
                ))}
              </div>
            )}
            {profile.biography && (
              <p
                className="font-body mt-2 max-w-lg line-clamp-2 text-sm opacity-80"
                style={{ color: heroTy.metaColor }}
              >
                {profile.biography}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <ModelFavoriteButton slug={profile.slug} displayName={profile.displayName} />
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
            <button type="button" className="btn-primary !px-6 !py-3 !text-sm">
              <span className="site-header-cta-enter__label !text-sm">Связаться</span>
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
            <li key={r.id} className="flex flex-col gap-1.5 rounded-lg border border-white/[0.06] bg-black/40 px-2.5 py-2">
              <div className="flex shrink-0 items-center justify-end gap-1.5">
                {r.moderationStatus && r.moderationStatus !== 'approved' ? (
                  <span className="rounded px-1 py-px font-body text-[8px] font-semibold uppercase text-amber-300/90">
                    {r.moderationStatus === 'pending' ? 'модер.' : r.moderationStatus}
                  </span>
                ) : null}
                <time className="font-body text-[10px] tabular-nums text-white/30" dateTime={r.createdAt}>
                  {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </time>
              </div>
              {r.comment?.trim() ? (
                <p className="font-body text-[12px] leading-snug text-white/70 line-clamp-4">{r.comment.trim()}</p>
              ) : null}
              <div className="flex justify-end pt-0.5">
                <span className="text-[11px] leading-none tracking-tight" aria-hidden>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < Math.min(5, Math.max(0, r.rating)) ? 'text-[#d4af37]' : 'text-white/12'}>
                      ★
                    </span>
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {staffComposer}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Lightbox                                                           */
/* ------------------------------------------------------------------ */

function Lightbox({
  photos,
  index,
  onChange,
  onClose,
}: {
  photos: { full: string }[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const total = photos.length;

  useEffect(() => {
    const prev = () => onChange((index - 1 + total) % total);
    const next = () => onChange((index + 1) % total);
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [index, total, onChange, onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/96 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Image */}
      <img
        src={photos[index]?.full}
        alt=""
        className="max-h-[92dvh] max-w-[92vw] select-none object-contain drop-shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {/* Counter */}
      <div className="pointer-events-none absolute right-4 top-4 font-body text-xs tabular-nums text-white/50 bg-black/55 px-2.5 py-1 rounded-full">
        {index + 1} / {total}
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
        aria-label="Закрыть"
      >
        ✕
      </button>

      {/* Prev */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange((index - 1 + total) % total); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-xl text-white/70 transition-colors hover:bg-black/80 hover:text-white"
          aria-label="Предыдущее фото"
        >
          ‹
        </button>
      )}

      {/* Next */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange((index + 1) % total); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-xl text-white/70 transition-colors hover:bg-black/80 hover:text-white"
          aria-label="Следующее фото"
        >
          ›
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Staff review composer                                              */
/* ------------------------------------------------------------------ */

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
        <span className="site-header-cta-enter__label !text-xs">
          {busy ? 'Отправка…' : 'Опубликовать отзыв'}
        </span>
      </button>
      {feedback ? (
        <p className={`mt-2 font-body text-[11px] ${feedback === 'Отправлено на модерацию' ? 'text-emerald-400/90' : 'text-red-400/90'}`}>
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
