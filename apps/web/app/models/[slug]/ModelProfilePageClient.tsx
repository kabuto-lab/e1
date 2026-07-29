'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { apiUrl } from '@/lib/api-url';
import api from '@/lib/api-client';
import { useAuth } from '@/components/AuthProvider';
import { ModelFavoriteButton } from '@/components/ModelFavoriteButton';
import { BookingTonModal } from '@/components/BookingTonModal';
import { REVIEW_CHARACTERISTICS } from '@/components/ReviewModal';
import { Pencil, X, Play } from 'lucide-react';
import { resolveHeroSliderTypography, type HeroSliderTypography } from '@/lib/hero-slider-typography';
import { publicMediaUrl } from '@/lib/public-media-url';

interface ModelProfile {
  id: string;
  userId?: string | null;
  displayName: string;
  slug: string;
  biography?: string;
  verificationStatus: string;
  eliteStatus: boolean;
  isPublished: boolean;
  availabilityStatus?: string;
  nextAvailableAt?: string | null;
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
    fileType?: string;
  }>;
}

interface ApiReview {
  id: string;
  rating: number;
  comment?: string | null;
  characteristics?: string[];
  isVerified?: boolean;
  clientLabel?: string;
  createdAt: string;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | null;
}

interface ModelReviewsApi {
  averageRating: string;
  totalReviews: number;
  reviews: ApiReview[];
}

const BODY_TYPE_RU: Record<string, string> = {
  slim: 'Стройная', curvy: 'Пышная', bbw: 'Плюс', pear: 'Груша', fit: 'Спортивная',
};
const BUST_TYPE_RU: Record<string, string> = { natural: 'Натуральная', silicone: 'Силикон' };
const TEMPERAMENT_RU: Record<string, string> = { gentle: 'Нежный', active: 'Активный', adaptable: 'Гибкий' };

const AVAILABILITY_BADGE: Record<string, { label: string; dot: string; cls: string }> = {
  online: { label: 'Свободна', dot: 'bg-emerald-400', cls: 'bg-emerald-400/15 text-emerald-300' },
  in_shift: { label: 'На смене', dot: 'bg-sky-400', cls: 'bg-sky-400/15 text-sky-300' },
  busy: { label: 'Занята', dot: 'bg-amber-400', cls: 'bg-amber-400/15 text-amber-300' },
  offline: { label: 'Офлайн', dot: 'bg-white/30', cls: 'bg-white/10 text-white/50' },
};

function formatNextAvailable(iso: string): string {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return isToday ? time : `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}, ${time}`;
}

function isProxyUrl(url?: string) {
  return !!url && (url.startsWith('/pic-proxy/') || url.startsWith('/img-proxy/'));
}

/** Цена в БД хранится как decimal ("6000.00") — округляем и убираем копейки для отображения. */
function formatPrice(value: number | string | null | undefined): string {
  if (value == null) return '';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? String(Math.round(n)) : '';
}

function buildAllPhotos(profile: ModelProfile): { thumb: string; full: string }[] {
  const photosOnly = profile.photos?.filter((p) => p.fileType !== 'video') ?? [];
  return photosOnly.map((p) => {
    const u = publicMediaUrl(p.url);
    return { thumb: u, full: u };
  });
}

function buildAllVideos(profile: ModelProfile): { id: string; url: string }[] {
  const videosOnly = profile.photos?.filter((p) => p.fileType === 'video') ?? [];
  return videosOnly.map((p) => ({ id: p.id, url: publicMediaUrl(p.url) }));
}

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

export function ModelProfilePageClient({
  slug,
  initialProfile,
  initialMedia,
}: {
  slug: string;
  initialProfile?: ModelProfile | null;
  initialMedia?: Array<{ id: string; url: string; isVisible?: boolean; albumCategory?: string; sortOrder?: number; fileType?: string }>;
}) {
  const { isAdmin, user: authUser } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<ModelProfile | null>(() => {
    if (!initialProfile) return null;
    if (initialMedia && initialMedia.length > 0) {
      return { ...initialProfile, photos: initialMedia };
    }
    return initialProfile;
  });
  const [loading, setLoading] = useState(!initialProfile);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [videoLightboxUrl, setVideoLightboxUrl] = useState<string | null>(null);
  const [reviewPayload, setReviewPayload] = useState<ModelReviewsApi | null>(null);
  const [desktopSidebarTab, setDesktopSidebarTab] = useState<'gallery' | 'reviews'>('gallery');
  const [staffReviewer, setStaffReviewer] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [showContactChoice, setShowContactChoice] = useState(false);
  const [contactChoiceVisible, setContactChoiceVisible] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((i: number) => {
    setLightboxIndex(i);
    setLightboxOpen(true);
  }, []);

  const closeProfileView = useCallback(() => {
    router.push('/models');
  }, [router]);

  /** «Написать» — списаться с моделью до оплаты/брони. Без аккаунта — на логин. */
  const handleMessageModel = useCallback(() => {
    if (!profile?.userId) return;
    if (!authUser) {
      router.push('/login');
      return;
    }
    const base =
      authUser.role === 'model' ? '/model/messages' :
      authUser.role === 'client' ? '/cabinet/messages' :
      '/dashboard/messages';
    router.push(`${base}?with=${profile.userId}`);
  }, [authUser, profile, router]);

  const handleOpenBooking = useCallback(() => {
    if (!authUser) {
      router.push(`/login?redirect=${encodeURIComponent(`/models/${slug}`)}`);
      return;
    }
    setShowBookingModal(true);
    requestAnimationFrame(() => setBookingModalVisible(true));
  }, [authUser, router, slug]);

  const closeBookingModal = useCallback(() => {
    setBookingModalVisible(false);
    setTimeout(() => setShowBookingModal(false), 300);
  }, []);

  const openContactChoice = useCallback(() => {
    setShowContactChoice(true);
    requestAnimationFrame(() => setContactChoiceVisible(true));
  }, []);

  const closeContactChoice = useCallback(() => {
    setContactChoiceVisible(false);
    setTimeout(() => setShowContactChoice(false), 300);
  }, []);

  /** «В Telegram» из модалки выбора — одноразовый deep-link на бота (relay-чат). Требует авторизации. */
  const handleTelegramContact = useCallback(async () => {
    if (!profile?.id) return;
    closeContactChoice();
    if (!authUser) {
      router.push(`/login?redirect=${encodeURIComponent(`/models/${slug}`)}`);
      return;
    }
    try {
      const { deepLink } = await api.getModelTelegramContactToken(profile.id);
      if (deepLink) window.open(deepLink, '_blank', 'noopener,noreferrer');
    } catch {
      // тихо игнорируем — платформенный чат остаётся доступным вариантом
    }
  }, [profile, closeContactChoice, authUser, router, slug]);

  useEffect(() => {
    if (initialProfile) return;
    loadProfile();
  }, [slug]);

  // Esc закрывает анкету и возвращает в каталог — но только если не открыт лайтбокс
  // фото или одна из модалок поверх анкеты (сначала Esc должен закрыть именно их).
  useEffect(() => {
    const anyOverlayOpen = lightboxOpen || showContactChoice || showBookingModal || videoLightboxUrl;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (anyOverlayOpen) {
          if (showContactChoice) closeContactChoice();
          else if (videoLightboxUrl) setVideoLightboxUrl(null);
          return;
        }
        closeProfileView();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, showContactChoice, showBookingModal, videoLightboxUrl, closeProfileView, closeContactChoice]);

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
              fileType: m.fileType,
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

  /** Публичные одобренные отзывы — доступны всем, гостям тоже (см. «Логика отзывов в MVP»). */
  const reloadReviews = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await api.getPublicModelReviews(profile.id, 50);
      setReviewPayload(data);
    } catch {
      setReviewPayload(null);
    }
  }, [profile?.id]);

  useEffect(() => {
    reloadReviews();
  }, [reloadReviews]);

  const showReviewsUi = reviewPayload !== null;
  const reviewsCountLabel = reviewPayload?.totalReviews ?? 0;
  const listReviews = reviewPayload?.reviews ?? [];

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

  /** Модель, просматривающая свою собственную анкету, не должна видеть "Связаться"/"Забронировать". */
  const isOwnProfile = authUser?.role === 'model' && !!profile?.userId && authUser.id === profile.userId;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
        <Header
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
        <Header variant="page" segment={{ crumbs: [{ href: '/models', label: 'Модели' }] }} />
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
  const allVideos = buildAllVideos(profile);
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
      <Header
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
          onCloseProfile={closeProfileView}
          onMessage={openContactChoice}
          onBook={handleOpenBooking}
          isOwnProfile={isOwnProfile}
        />

        <div className="flex w-1/4 flex-col bg-black p-3" style={{ isolation: 'isolate' }}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border-[3px] border-[#d4af37]/40 bg-[#161616]">
            <div className="flex-shrink-0 px-4 pb-2 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-[#d4af37]/40 ring-offset-1 ring-offset-[#111]" style={{ backgroundImage: "url('https://placehold.co/40x40/0f0f0f/d4af37')", backgroundSize: 'cover' }}>
                  {allPhotos[0]?.thumb ? (
                    <Image src={allPhotos[0].thumb} alt={profile.displayName} width={40} height={40} unoptimized={isProxyUrl(allPhotos[0].thumb)} onError={(e) => { e.currentTarget.style.opacity = '0'; }} className="object-cover" />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-bold text-white">{profile.displayName}</div>
                    <div className="font-body text-[11px] text-white/35">
                      {allPhotos.length} фото{allVideos.length > 0 ? `, ${allVideos.length} видео` : ''}
                    </div>
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
                  {reviewPayload ? (
                    <ReviewsSummaryOnly averageRating={reviewPayload.averageRating} totalReviews={reviewPayload.totalReviews} />
                  ) : null}
                  <PublicReviewsSection
                    reviews={listReviews}
                    showTitle={false}
                    staffComposer={
                      staffReviewer ? (
                        <StaffReviewComposer modelId={profile.id} onCreated={reloadReviews} variant="sidebar" />
                      ) : null
                    }
                  />
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
                      <Image
                        src={photo.thumb}
                        alt={`${profile.displayName} ${i + 1}`}
                        fill
                        unoptimized={isProxyUrl(photo.thumb)}
                        onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                        className="object-cover"
                      />
                      {activePhoto === i ? (
                        <div className="pointer-events-none absolute inset-0 border-2 border-[#d4af37]" />
                      ) : null}
                    </button>
                  ))}
                  {allVideos.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => setVideoLightboxUrl(video.url)}
                      className="group relative aspect-square overflow-hidden opacity-80 transition-opacity duration-200 hover:opacity-100"
                    >
                      <video
                        src={video.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/10">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-[#d4af37]">
                          <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
                        </span>
                      </div>
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
        <div className="relative min-h-[min(52dvh,480px)] w-full flex-1 bg-black lg:min-h-0" style={{ backgroundImage: "url('https://placehold.co/600x800/0f0f0f/d4af37')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
          {allPhotos.length > 0 && (
            <Image
              key={allPhotos[activePhoto]?.full ?? activePhoto}
              src={allPhotos[activePhoto]?.full}
              alt=""
              fill
              unoptimized={isProxyUrl(allPhotos[activePhoto]?.full)}
              onError={(e) => { e.currentTarget.style.opacity = '0'; }}
              className="object-cover cursor-zoom-in"
              onClick={() => openLightbox(activePhoto)}
              priority
            />
          )}

          <div className="absolute right-3 top-3 z-[7] flex items-center gap-2">
            {allPhotos.length > 0 && (
              <div
                className="pointer-events-none font-body text-xs tabular-nums text-white/85 bg-black/55 px-2.5 py-1 rounded-full backdrop-blur-sm"
                aria-hidden
              >
                {activePhoto + 1}/{allPhotos.length}
              </div>
            )}
            <button
              type="button"
              onClick={closeProfileView}
              aria-label="Закрыть анкету"
              title="Закрыть (Esc)"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-black/55 text-white/85 backdrop-blur-sm transition-colors hover:border-[#d4af37]/45 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
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
                  modelId={profile.id}
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
                <Image
                  src={photo.thumb}
                  alt={`${i + 1}`}
                  fill
                  unoptimized={isProxyUrl(photo.thumb)}
                  onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-[#0a0a0a] px-4 py-3 max-[525px]:flex-col">
          <div className="min-w-0 flex flex-1 flex-col justify-center gap-1 max-[525px]:w-full max-[525px]:justify-between">
            {profile.rateHourly ? (
              <div className="flex w-full max-w-[14rem] items-baseline justify-between gap-2 sm:max-w-none max-[525px]:max-w-full">
                <span className="shrink-0 font-body text-[10px] uppercase tracking-wide text-white/30">Час</span>
                <span className="min-w-0 truncate text-right font-display text-sm font-bold tabular-nums text-[#d4af37]">
                  {formatPrice(profile.rateHourly)} ₽
                </span>
              </div>
            ) : null}
            {profile.rateOvernight ? (
              <div className="flex w-full max-w-[14rem] items-baseline justify-between gap-2 sm:max-w-none max-[525px]:max-w-full">
                <span className="shrink-0 font-body text-[10px] uppercase tracking-wide text-white/30">Ночь</span>
                <span className="min-w-0 truncate text-right font-display text-sm font-bold tabular-nums text-[#d4af37]">
                  {formatPrice(profile.rateOvernight)} ₽
                </span>
              </div>
            ) : null}
            {!profile.rateHourly && !profile.rateOvernight ? (
              <span className="font-body text-xs text-white/25">Тарифы уточняйте</span>
            ) : null}
          </div>
          {!isOwnProfile && (
            <div className="flex shrink-0 items-center gap-2 self-center max-[525px]:w-full justify-between">
              <button
                type="button"
                onClick={openContactChoice}
                className="btn-secondary !px-4 !py-2.5 !text-sm"
              >
                Связаться
              </button>
              <button
                type="button"
                onClick={handleOpenBooking}
                disabled={profile.availabilityStatus === 'busy'}
                title={profile.availabilityStatus === 'busy' ? 'Сейчас недоступна для бронирования' : undefined}
                className="btn-primary !px-5 !py-2.5 !text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="site-header-cta-enter__label !text-sm">Забронировать</span>
              </button>
            </div>
          )}
        </div>

        {profile.biography && (
          <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#0c0c0c] px-4 py-4">
            <h3 className="font-display mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
              О себе
            </h3>
            <p className="font-body whitespace-pre-line text-sm text-white/70">{profile.biography}</p>
          </div>
        )}

        {showReviewsUi ? (
          <div
            id="model-reviews"
            className="flex-shrink-0 border-t border-white/[0.06] bg-[#0c0c0c] px-4 py-5 lg:hidden"
          >
            <h3 className="font-display mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
              Отзывы
            </h3>
            {reviewPayload ? (
              <ReviewsSummaryOnly averageRating={reviewPayload.averageRating} totalReviews={reviewPayload.totalReviews} />
            ) : null}
            <PublicReviewsSection
              reviews={listReviews}
              className=""
              showTitle={false}
              staffComposer={
                staffReviewer ? (
                  <StaffReviewComposer modelId={profile.id} onCreated={reloadReviews} variant="mobile" />
                ) : null
              }
            />
          </div>
        ) : null}
      </div>

      {showContactChoice && (
        <>
          <div
            className={`fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${contactChoiceVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeContactChoice}
          />

          {/* Mobile: bottom sheet */}
          <div
            className={`fixed inset-x-0 bottom-0 z-[101] sm:hidden transition-transform duration-300 ease-out ${contactChoiceVisible ? 'translate-y-0' : 'translate-y-full'}`}
          >
            <div className="rounded-t-[1.5rem] border-t border-white/[0.08] bg-[#141414] px-6 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-2xl">
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />
              <ContactChoiceContent onTelegram={handleTelegramContact} onPlatform={() => { closeContactChoice(); handleMessageModel(); }} />
            </div>
          </div>

          {/* Desktop: centered */}
          <div
            className="fixed inset-0 z-[101] hidden items-center justify-center p-4 sm:flex"
            onClick={closeContactChoice}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#141414] p-7 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <ContactChoiceContent onTelegram={handleTelegramContact} onPlatform={() => { closeContactChoice(); handleMessageModel(); }} />
            </div>
          </div>
        </>
      )}

      {showBookingModal && profile && (
        <BookingTonModal
          modelId={profile.id}
          modelSlug={slug}
          modelName={profile.displayName}
          rateHourly={profile.rateHourly ?? null}
          availabilityStatus={profile.availabilityStatus}
          nextAvailableAt={profile.nextAvailableAt}
          visible={bookingModalVisible}
          onClose={closeBookingModal}
        />
      )}

      {lightboxOpen && (
        <Lightbox
          photos={allPhotos}
          index={lightboxIndex}
          onChange={setLightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {videoLightboxUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/96 backdrop-blur-sm"
          onClick={() => setVideoLightboxUrl(null)}
        >
          <video
            src={videoLightboxUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[92dvh] max-w-[92vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setVideoLightboxUrl(null)}
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function ContactChoiceContent({ onTelegram, onPlatform }: { onTelegram: () => void; onPlatform: () => void }) {
  return (
    <>
      <h3 className="font-display text-xl font-bold text-white">Как связаться?</h3>
      <p className="mt-1.5 font-body text-sm text-white/40">
        Выберите, где удобнее вести переписку с моделью.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onTelegram}
          className="btn-secondary w-full !justify-center !py-3.5 !text-base"
        >
          Написать в Telegram
        </button>
        <button
          type="button"
          onClick={onPlatform}
          className="btn-primary w-full !justify-center !py-3.5 !text-base"
        >
          <span className="site-header-cta-enter__label !text-base">Написать на платформе</span>
        </button>
      </div>
    </>
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
  onCloseProfile,
  onMessage,
  onBook,
  isOwnProfile,
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
  onCloseProfile: () => void;
  onBook: () => void;
  onMessage: () => void;
  isOwnProfile: boolean;
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
      style={{ backgroundImage: "url('https://placehold.co/800x600/0f0f0f/d4af37')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        if (total === 0) return;
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
            onError={(e) => { e.currentTarget.style.opacity = '0'; }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
      </div>

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

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="font-body text-xs text-white/40 bg-black/50 px-3 py-1 rounded-full">
          {activePhoto + 1} / {total}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCloseProfile();
          }}
          aria-label="Закрыть анкету"
          title="Закрыть (Esc)"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-black/50 text-white/70 backdrop-blur-sm transition-colors hover:border-[#d4af37]/45 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-16"
        style={{ fontFamily: heroTy.fontFamily }}
      >
        <div className="flex items-end justify-between">
          <div>
            {profile.availabilityStatus && AVAILABILITY_BADGE[profile.availabilityStatus] && (
              <span className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-body text-xs font-medium ${AVAILABILITY_BADGE[profile.availabilityStatus].cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${AVAILABILITY_BADGE[profile.availabilityStatus].dot}`} />
                {profile.availabilityStatus === 'offline' && profile.nextAvailableAt
                  ? `Свободна с ${formatNextAvailable(profile.nextAvailableAt)}`
                  : AVAILABILITY_BADGE[profile.availabilityStatus].label}
              </span>
            )}
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
                className="font-body mt-2 max-w-lg whitespace-pre-line text-sm opacity-80"
                style={{ color: heroTy.metaColor }}
              >
                {profile.biography}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-end gap-3">
            {profile.rateHourly && (
              <div className="text-right">
                <div className="font-body text-[10px] text-white/30 uppercase">Час</div>
                <div className="font-display text-sm font-bold text-[#d4af37]">{formatPrice(profile.rateHourly)} ₽</div>
              </div>
            )}
            {profile.rateOvernight && (
              <div className="text-right">
                <div className="font-body text-[10px] text-white/30 uppercase">Ночь</div>
                <div className="font-display text-sm font-bold text-[#d4af37]">{formatPrice(profile.rateOvernight)} ₽</div>
              </div>
            )}
            <ModelFavoriteButton slug={profile.slug} displayName={profile.displayName} modelId={profile.id} />
            <div className="flex flex-col items-stretch gap-2">
              {showReviewsButton ? (
                <button type="button" onClick={onReviewsClick} className="btn-secondary !px-5 !py-3 !text-sm">
                  Отзывы ({reviewsCount})
                </button>
              ) : null}
              {!isOwnProfile && (
                <>
                  <button type="button" onClick={onMessage} className="btn-secondary !px-5 !py-3 !text-sm">
                    Связаться
                  </button>
                  <button
                    type="button"
                    onClick={onBook}
                    disabled={profile.availabilityStatus === 'busy'}
                    title={profile.availabilityStatus === 'busy' ? 'Сейчас недоступна для бронирования' : undefined}
                    className="btn-primary !px-6 !py-3 !text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="site-header-cta-enter__label !text-sm">Забронировать</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewsSummaryOnly({ averageRating, totalReviews }: { averageRating: string; totalReviews: number }) {
  return (
    <div className="mb-3 rounded-lg border border-white/[0.08] bg-black/35 px-3 py-3">
      <p className="font-body text-[13px] text-white/80">
        Средняя оценка{' '}
        <span className="font-display font-bold text-[#d4af37]">{averageRating}</span>
        <span className="text-white/40"> / 5</span>
      </p>
      <p className="mt-1 font-body text-[11px] text-white/40">
        Всего отзывов: <span className="tabular-nums text-white/60">{totalReviews}</span>
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
              <div className="flex shrink-0 items-center justify-between gap-1.5">
                <span className="font-body text-[11px] font-medium text-white/50">{r.clientLabel ?? 'Клиент'}</span>
                <div className="flex items-center gap-1.5">
                  {r.moderationStatus && r.moderationStatus !== 'approved' ? (
                    <span className="rounded px-1 py-px font-body text-[8px] font-semibold uppercase text-amber-300/90">
                      {r.moderationStatus === 'pending' ? 'модер.' : r.moderationStatus}
                    </span>
                  ) : null}
                  <time className="font-body text-[10px] tabular-nums text-white/30" dateTime={r.createdAt}>
                    {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </time>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] leading-none tracking-tight" aria-hidden>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < Math.min(5, Math.max(0, r.rating)) ? 'text-[#d4af37]' : 'text-white/12'}>
                      ★
                    </span>
                  ))}
                </span>
                {r.isVerified ? (
                  <span className="rounded-full bg-emerald-400/10 px-1.5 py-0.5 font-body text-[8px] font-medium uppercase tracking-wide text-emerald-300">
                    Подтверждённое бронирование
                  </span>
                ) : null}
              </div>
              {r.comment?.trim() ? (
                <p className="font-body text-[12px] leading-snug text-white/70 line-clamp-4">{r.comment.trim()}</p>
              ) : null}
              {r.characteristics && r.characteristics.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {r.characteristics.map((c) => (
                    <span key={c} className="rounded-full border border-white/[0.08] px-1.5 py-0.5 font-body text-[9px] text-white/45">
                      {REVIEW_CHARACTERISTICS.find((rc) => rc.value === c)?.label ?? c}
                    </span>
                  ))}
                </div>
              ) : null}
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
      <img
        src={photos[index]?.full}
        alt=""
        onError={(e) => { e.currentTarget.style.opacity = '0'; }}
        className="max-h-[92dvh] max-w-[92vw] select-none object-contain drop-shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      <div className="pointer-events-none absolute right-4 top-4 font-body text-xs tabular-nums text-white/50 bg-black/55 px-2.5 py-1 rounded-full">
        {index + 1} / {total}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
        aria-label="Закрыть"
      >
        ✕
      </button>

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
