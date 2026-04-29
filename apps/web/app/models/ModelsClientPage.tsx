'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GalleryHorizontal, LayoutGrid, MessageCircle, Pencil, X } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { useAuth } from '@/components/AuthProvider';
import { generateDemoPhotos } from '@/lib/demo-photos';
import { apiUrl } from '@/lib/api-url';
import { parsePgTextArray } from '@/lib/parse-pg-text-array';

interface ModelPhoto {
  id: string;
  url: string;
  isVisible?: boolean;
  sortOrder?: number;
}

interface ModelProfile {
  id: string;
  displayName: string;
  slug: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  eliteStatus: boolean;
  availabilityStatus: 'offline' | 'online' | 'in_shift' | 'busy';
  rateHourly: string | null;
  rateOvernight: string | null;
  psychotypeTags: string[] | null;
  languages: string[] | null;
  mainPhotoUrl: string | null;
  photos?: ModelPhoto[];
  physicalAttributes: {
    age?: number;
    height?: number;
    weight?: number;
    bustSize?: number;
    bustType?: 'natural' | 'silicone';
    bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
    temperament?: 'gentle' | 'active' | 'adaptable';
    sexuality?: 'active' | 'passive' | 'universal';
    city?: string;
  } | null;
  ratingReliability: string;
  totalMeetings: number;
  photoCount: number;
  videoWalkthroughUrl: string | null;
  createdAt: string;
}

type CatalogDistrictFilter = '' | 'moscow' | 'mo';

interface Filters {
  availabilityStatus: string;
  verificationStatus: string;
  eliteStatus: boolean;
  orderBy: 'rating' | 'createdAt' | 'displayName';
  order: 'asc' | 'desc';
  district: CatalogDistrictFilter;
  ageMin: number;
  ageMax: number;
  limit: number;
  offset: number;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  online: { color: 'bg-green-500', label: 'Свободна' },
  in_shift: { color: 'bg-yellow-500', label: 'В смене' },
  busy: { color: 'bg-red-500', label: 'Занята' },
  offline: { color: 'bg-gray-500', label: 'Оффлайн' },
};

const TAG_RU: Record<string, string> = {
  romantic: 'Романтичная',
  adaptable: 'Гибкая',
  mysterious: 'Загадочная',
  passionate: 'Страстная',
  wise: 'Мудрая',
  gentle: 'Нежная',
  confident: 'Уверенная',
  sophisticated: 'Утончённая',
  ambitious: 'Амбициозная',
  luxurious: 'Роскошная',
  stylish: 'Стильная',
  creative: 'Творческая',
  playful: 'Игривая',
  active: 'Активная',
  cheerful: 'Жизнерадостная',
};

function translateTag(tag: string): string {
  return TAG_RU[tag.toLowerCase()] || tag;
}

function normalizeCity(c: string | undefined): string {
  return (c ?? '').trim().toLowerCase();
}

const MOSCOW_OBLAST_CITIES_LC = new Set(
  [
    'Подмосковье',
    'Московская область',
    'Химки',
    'Одинцово',
    'Красногорск',
    'Мытищи',
    'Люберцы',
    'Балашиха',
    'Долгопрудный',
    'Реутов',
    'Королёв',
    'Железнодорожный',
    'Пушкино',
    'Сергиев посад',
    'Домодедово',
    'Подольск',
    'Щёлково',
    'Раменское',
    'Жуковский',
    'Коломна',
    'Серпухов',
    'Ногинск',
    'Егорьевск',
    'Дмитров',
    'Истра',
    'Наро-фоминск',
    'Видное',
    'Краснознаменск',
    'Орехово-зуево',
    'Электросталь',
    'Воскресенск',
    'Солнечногорск',
    'Дубна',
    'Климовск',
    'Фрязино',
    'Лыткарино',
    'Котельники',
    'Московский',
  ].map((s) => s.toLowerCase()),
);

function isMoscowDistrict(cityRaw: string | undefined): boolean {
  const n = normalizeCity(cityRaw);
  return n === 'москва' || n === 'moscow';
}

function isMoscowOblastDistrict(cityRaw: string | undefined): boolean {
  const n = normalizeCity(cityRaw);
  if (!n || isMoscowDistrict(cityRaw)) return false;
  if (MOSCOW_OBLAST_CITIES_LC.has(n)) return true;
  if (n.includes('подмосков')) return true;
  if (n.includes('московск') && (n.includes('обл') || n.includes('област'))) return true;
  return false;
}

type CatalogLaneId = 'elite' | 'online' | 'in_shift' | 'busy' | 'offline';

function catalogLaneForModel(m: ModelProfile): CatalogLaneId {
  if (m.eliteStatus) return 'elite';
  if (m.availabilityStatus === 'online') return 'online';
  if (m.availabilityStatus === 'in_shift') return 'in_shift';
  if (m.availabilityStatus === 'busy') return 'busy';
  return 'offline';
}

const MOBILE_CATALOG_LANES: { id: CatalogLaneId; title: string }[] = [
  { id: 'elite', title: 'Элитные' },
  { id: 'online', title: 'Свободна' },
  { id: 'in_shift', title: 'В смене' },
  { id: 'busy', title: 'Занята' },
  { id: 'offline', title: 'Оффлайн' },
];

function processModel(m: ModelProfile): ModelProfile {
  const processed = { ...m };
  processed.psychotypeTags = parsePgTextArray(m.psychotypeTags as unknown);
  processed.languages = parsePgTextArray(m.languages as unknown);
  const urls = generateDemoPhotos(m.id, m.mainPhotoUrl, 12);
  processed.photos = urls.map((url, i) => ({ id: `photo-${i}`, url }));
  return processed;
}

export function ModelsClientPage({
  initialModels,
  initialStats,
}: {
  initialModels?: ModelProfile[];
  initialStats?: { total: number; online: number; verified: number; elite: number };
}) {
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [allModels, setAllModels] = useState<ModelProfile[]>(() =>
    initialModels ? initialModels.map(processModel) : [],
  );
  const [loading, setLoading] = useState(!initialModels);
  const [stats, setStats] = useState(
    initialStats ?? { total: 0, online: 0, verified: 0, elite: 0 },
  );
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [mobileShelfView, setMobileShelfView] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    availabilityStatus: '',
    verificationStatus: '',
    eliteStatus: false,
    orderBy: 'rating',
    order: 'desc',
    district: '',
    ageMin: 0,
    ageMax: 0,
    limit: 50,
    offset: 0,
  });

  const loadModels = useCallback(async () => {
    setLoading(true);
    setCatalogError(null);
    try {
      const params = new URLSearchParams();
      if (filters.availabilityStatus) params.append('availabilityStatus', filters.availabilityStatus);
      if (filters.verificationStatus) params.append('verificationStatus', filters.verificationStatus);
      if (filters.eliteStatus) params.append('eliteStatus', 'true');
      if (filters.orderBy) params.append('orderBy', filters.orderBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const [response, statsResponse] = await Promise.all([
        fetch(apiUrl(`/models?${params.toString()}`)),
        fetch(apiUrl('/models/stats')),
      ]);

      let apiMessage: string | null = null;
      if (!response.ok) {
        setAllModels([]);
        try {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const body = await response.json();
            if (body && typeof body.message === 'string' && body.message.trim()) {
              apiMessage = body.message.trim();
            }
          }
        } catch { /* тело не JSON */ }
        setCatalogError(
          apiMessage ??
            `Каталог недоступен (код ${response.status}). Обычно это API не отвечает, ошибка БД на сервере или неверный URL API.`,
        );
      } else {
        const data: ModelProfile[] = await response.json();
        setAllModels(data.map(processModel));
      }

      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      } else {
        setStats({ total: 0, online: 0, verified: 0, elite: 0 });
      }
    } catch {
      setAllModels([]);
      setCatalogError('Не удалось связаться с сервером. Проверьте сеть и переменную NEXT_PUBLIC_API_URL (если задана).');
      setStats({ total: 0, online: 0, verified: 0, elite: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Skip first effect run when server data is available; re-run on filter changes.
  const skipFirstFetch = useRef(!!initialModels);
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    let filtered = allModels;
    if (filters.district === 'moscow') {
      filtered = filtered.filter((m) => isMoscowDistrict(m.physicalAttributes?.city));
    } else if (filters.district === 'mo') {
      filtered = filtered.filter((m) => isMoscowOblastDistrict(m.physicalAttributes?.city));
    }
    if (filters.ageMin > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.age || 0) >= filters.ageMin);
    }
    if (filters.ageMax > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.age || 99) <= filters.ageMax);
    }
    setModels(filtered);
  }, [allModels, filters.district, filters.ageMin, filters.ageMax]);

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasExtraFilters = !!filters.district || filters.ageMin > 0 || filters.ageMax > 0;

  const modelsByLane = useMemo(() => {
    const buckets: Record<CatalogLaneId, ModelProfile[]> = {
      elite: [],
      online: [],
      in_shift: [],
      busy: [],
      offline: [],
    };
    for (const m of models) {
      buckets[catalogLaneForModel(m)].push(m);
    }
    return buckets;
  }, [models]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <SiteHeader
        variant="page"
        segment={{
          crumbs: [{ label: 'Модели' }],
          hint: (
            <span className="ml-1 hidden font-body text-xs text-white/25 sm:inline">
              {models.length} из {stats.total}
            </span>
          ),
        }}
      />

      {/* Filter bar */}
      <div className="px-6 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={() => setMobileShelfView((v) => !v)}
          className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.06] text-[#d4af37] transition-colors hover:border-[#d4af37]/35 hover:bg-white/[0.09] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/40"
          aria-pressed={mobileShelfView}
          aria-label={mobileShelfView ? 'Показать сетку из двух колонок' : 'Показать категории со скроллом влево-вправо'}
          title={mobileShelfView ? 'Сетка' : 'По категориям'}
        >
          {mobileShelfView ? <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden /> : <GalleryHorizontal className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />}
        </button>
        <Pill active={!filters.availabilityStatus} onClick={() => handleFilterChange('availabilityStatus', '')}>Все</Pill>
        <Pill active={filters.availabilityStatus === 'online'} onClick={() => handleFilterChange('availabilityStatus', 'online')}>Свободна</Pill>
        <Pill active={filters.availabilityStatus === 'in_shift'} onClick={() => handleFilterChange('availabilityStatus', 'in_shift')}>В смене</Pill>
        <Pill active={filters.eliteStatus} onClick={() => handleFilterChange('eliteStatus', !filters.eliteStatus)}>Элитные</Pill>
        <span className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
        <Pill active={filters.orderBy === 'rating'} onClick={() => handleFilterChange('orderBy', 'rating')} subtle>По рейтингу</Pill>
        <Pill active={filters.orderBy === 'createdAt'} onClick={() => handleFilterChange('orderBy', 'createdAt')} subtle>Новые</Pill>
        <Pill active={filters.orderBy === 'displayName'} onClick={() => handleFilterChange('orderBy', 'displayName')} subtle>А–Я</Pill>
        <span className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
        <Pill
          active={showExtra || !!hasExtraFilters}
          onClick={() => {
            if (hasExtraFilters) {
              setFilters(prev => ({ ...prev, district: '', ageMin: 0, ageMax: 0 }));
            } else {
              setShowExtra(!showExtra);
            }
          }}
          subtle
        >
          {hasExtraFilters ? '✕ Сбросить' : '+ Район, возраст'}
        </Pill>
      </div>

      {/* Extra filters row */}
      {showExtra && (
        <div className="px-6 pb-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <span className="font-body text-[11px] text-white/25 flex-shrink-0 uppercase tracking-wider">Район</span>
          <Pill active={!filters.district} onClick={() => handleFilterChange('district', '')}>
            Все
          </Pill>
          <Pill
            active={filters.district === 'moscow'}
            onClick={() => handleFilterChange('district', 'moscow')}
          >
            Москва
          </Pill>
          <Pill active={filters.district === 'mo'} onClick={() => handleFilterChange('district', 'mo')}>
            Подмосковье
          </Pill>
          <span className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
          <span className="font-body text-[11px] text-white/25 flex-shrink-0 uppercase tracking-wider">Возраст</span>
          <input
            type="number"
            placeholder="от"
            value={filters.ageMin || ''}
            onChange={(e) => handleFilterChange('ageMin', parseInt(e.target.value) || 0)}
            className="w-14 px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white text-xs text-center font-body placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/40"
          />
          <span className="text-white/15 text-xs">—</span>
          <input
            type="number"
            placeholder="до"
            value={filters.ageMax || ''}
            onChange={(e) => handleFilterChange('ageMax', parseInt(e.target.value) || 0)}
            className="w-14 px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white text-xs text-center font-body placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/40"
          />
        </div>
      )}

      <div className="px-6 pb-10">
        <main>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="aspect-[3/4] bg-white/[0.04] rounded-lg mb-3" />
                  <div className="h-4 bg-white/[0.06] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/[0.03] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : models.length === 0 ? (
            <div className="card text-center py-20 px-6 max-w-lg mx-auto">
              {catalogError ? (
                <>
                  <div className="text-5xl mb-4 opacity-40" aria-hidden>⚠</div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">Не удалось загрузить каталог</h3>
                  <p className="font-body text-sm text-amber-200/90 mb-3">{catalogError}</p>
                  <p className="font-body text-xs text-white/35">
                    Если сообщение выше от API — исправьте причину там. Иначе на VPS: неверный пароль в DATABASE_URL, после pull нужен{' '}
                    <code className="text-white/45">npm run vps:after-pull</code> (не <code className="text-white/45">pm2 restart</code>), или PostgreSQL не поднят.
                  </p>
                </>
              ) : hasExtraFilters ? (
                <>
                  <div className="text-5xl mb-4 opacity-30" aria-hidden>🔍</div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">Ничего не найдено</h3>
                  <p className="font-body text-sm text-white/30">Сбросьте район или возраст — сейчас никто не подходит под фильтры.</p>
                </>
              ) : stats.total === 0 ? (
                <>
                  <div className="text-5xl mb-4 opacity-30" aria-hidden>📋</div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">Каталог пуст</h3>
                  <p className="font-body text-sm text-white/40 mb-3">
                    В базе нет профилей моделей (типично после нового сервера или пустого тома PostgreSQL).
                  </p>
                  <p className="font-body text-xs text-white/25">
                    Один раз на сервере из корня репозитория с рабочим <code className="text-white/50">DATABASE_URL</code> в{' '}
                    <code className="text-white/50">.env</code>:{' '}
                    <code className="text-[#d4af37]/90">npm run db:bootstrap</code>
                  </p>
                </>
              ) : stats.verified === 0 ? (
                <>
                  <div className="text-5xl mb-4 opacity-30" aria-hidden>⏳</div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">В каталоге пока никого</h3>
                  <p className="font-body text-sm text-white/40">
                    В системе есть профили, но ни одна анкета ещё не в статусе «верифицирована» для публичного показа. Проверьте модерацию в панели.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4 opacity-30" aria-hidden>🔍</div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">Ничего не найдено</h3>
                  <p className="font-body text-sm text-white/30">Попробуйте изменить параметры фильтров выше.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div
                className={`grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${mobileShelfView ? 'max-md:hidden' : ''}`}
              >
                {models.map((model) => (
                  <ModelCard key={model.id} model={model} />
                ))}
              </div>
              {mobileShelfView ? (
                <div className="flex flex-col gap-8 pb-2 md:hidden" aria-label="Каталог по категориям">
                  {MOBILE_CATALOG_LANES.map(({ id, title }) => {
                    const laneModels = modelsByLane[id];
                    if (laneModels.length === 0) return null;
                    return (
                      <section key={id} className="min-w-0">
                        <h2 className="mb-3 px-0.5 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#d4af37]/90">
                          {title}
                        </h2>
                        <div className="-mx-1 flex touch-pan-x gap-4 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.45)_rgba(255,255,255,0.06)] snap-x snap-mandatory">
                          {laneModels.map((model) => (
                            <div
                              key={model.id}
                              className="w-[min(86vw,300px)] shrink-0 snap-start"
                            >
                              <ModelCard model={model} />
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Pill({
  active, onClick, subtle, children,
}: {
  active: boolean;
  onClick: () => void;
  subtle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-medium transition-all ${
        active
          ? subtle
            ? 'bg-white/10 text-white'
            : 'bg-[#d4af37] text-black'
          : 'text-white/35 hover:text-white/60'
      }`}
    >
      {children}
    </button>
  );
}

interface PublicCatalogReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

function CatalogStarRow({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span className="text-[10px] leading-none tracking-tight" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < r ? 'text-[#d4af37]' : 'text-white/12'}>
          ★
        </span>
      ))}
    </span>
  );
}

function ModelCard({ model }: { model: ModelProfile }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [publicReviews, setPublicReviews] = useState<PublicCatalogReview[] | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const reviewsFetchStarted = useRef(false);

  const psychotypeTags = parsePgTextArray(model.psychotypeTags as unknown);
  const physical = model.physicalAttributes || {};
  const status = STATUS_MAP[model.availabilityStatus] || STATUS_MAP.offline;

  const allPhotos = (() => {
    const urls: string[] = [];
    if (model.mainPhotoUrl) urls.push(model.mainPhotoUrl);
    if (model.photos) {
      for (const p of model.photos) {
        if (p.url && !urls.includes(p.url)) urls.push(p.url);
      }
    }
    return urls;
  })();

  const getPreviewImage = (segment: number): string | undefined => {
    if (allPhotos.length === 0) return undefined;
    return allPhotos[segment % allPhotos.length];
  };

  const displayImage =
    activeSegment !== null ? getPreviewImage(activeSegment) : (allPhotos[0] ?? undefined);

  const profileHref = `/models/${model.slug || model.id}`;

  const loadPublicReviews = useCallback(async () => {
    if (reviewsFetchStarted.current) return;
    reviewsFetchStarted.current = true;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const r = await fetch(apiUrl(`/reviews/public/model/${model.id}?limit=30`));
      if (!r.ok) {
        reviewsFetchStarted.current = false;
        throw new Error('Не удалось загрузить отзывы');
      }
      const data = (await r.json()) as { reviews?: PublicCatalogReview[] };
      setPublicReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (e) {
      reviewsFetchStarted.current = false;
      setReviewsError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setPublicReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [model.id]);

  const openReviewsFace = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipped(true);
    void loadPublicReviews();
  };

  const closeReviewsFace = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipped(false);
  };

  return (
    <article
      onClick={() => {
        if (!flipped) router.push(profileHref);
      }}
      className={`card card--catalog-flip flex h-full flex-col overflow-visible group ${
        model.eliteStatus
          ? '!border-2 !border-[#d4af37] !shadow-[0_0_0_1px_rgba(212,175,55,0.35),0_12px_40px_-12px_rgba(212,175,55,0.22)]'
          : ''
      } ${flipped ? '' : 'cursor-pointer'}`}
    >
      <div
        className={`flex min-h-[18rem] flex-1 flex-col transition-[filter,box-shadow] duration-[650ms] ease-[cubic-bezier(0.2,0.85,0.22,1)] [perspective:min(92vw,880px)] [perspective-origin:50%_38%] ${
          flipped
            ? 'shadow-[0_28px_56px_-14px_rgba(0,0,0,0.72),0_12px_28px_-12px_rgba(212,175,55,0.08)]'
            : 'shadow-[0_16px_40px_-18px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div
          className="relative flex min-h-0 flex-1 flex-col [transform-style:preserve-3d] will-change-transform transition-transform duration-[650ms] ease-[cubic-bezier(0.2,0.85,0.22,1)]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* —— Лицевая сторона —— */}
          <div
            className={`flex flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] [backface-visibility:hidden] [transform:translateZ(4px)] [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_-20px_40px_-24px_rgba(0,0,0,0.35)] ${
              flipped ? 'pointer-events-none' : ''
            }`}
          >
            <div className="relative aspect-[5/4] overflow-hidden rounded-t-[var(--radius-lg)] bg-[#0a0a0a]">
              {displayImage ? (
                <Image
                  src={displayImage}
                  alt={model.displayName}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-t-[var(--radius-lg)] text-5xl opacity-20">
                  👤
                </div>
              )}

              <div
                className="absolute inset-0 z-[15] grid grid-cols-3 grid-rows-3"
                aria-hidden
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    onMouseEnter={() => setActiveSegment(i)}
                    onMouseLeave={() => setActiveSegment(null)}
                    className="box-border border border-transparent transition-colors duration-75 hover:border-[#d4af37]/75"
                  />
                ))}
              </div>

              {allPhotos.length > 1 && (
                <div className="pointer-events-none absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                  {allPhotos.slice(0, 8).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-all duration-150 ${
                        activeSegment !== null && activeSegment % allPhotos.length === i
                          ? 'scale-125 bg-[#d4af37]'
                          : 'bg-white/40'
                      }`}
                    />
                  ))}
                  {allPhotos.length > 8 && (
                    <span className="ml-0.5 text-[9px] text-white/40">+{allPhotos.length - 8}</span>
                  )}
                </div>
              )}

              {model.eliteStatus ? (
                <div className="pointer-events-none badge badge-gold absolute right-3 top-3 z-20">Элитная</div>
              ) : null}

              <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur-sm">
                <span className={`h-2 w-2 rounded-full ${status.color} shadow-[0_0_8px] shadow-current`} />
                <span className="font-body text-[11px] text-white/80">{status.label}</span>
              </div>

              {model.verificationStatus === 'verified' && (
                <div className="pointer-events-none badge badge-success absolute bottom-3 right-3 z-20">✓</div>
              )}

              <div className="pointer-events-none absolute inset-0 z-[12] bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 flex-1 truncate font-display text-sm font-bold text-white transition-colors group-hover:text-[#d4af37]">
                  {model.displayName}
                </h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openReviewsFace}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-black/40 text-[#d4af37]/90 backdrop-blur-sm transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45"
                    aria-label={`Отзывы — ${model.displayName}`}
                    aria-expanded={flipped}
                    title="Отзывы"
                  >
                    <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </button>
                  {isAdmin ? (
                    <Link
                      href={`/dashboard/models/${model.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-black/40 text-[#d4af37]/90 backdrop-blur-sm transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45"
                      aria-label={`Редактировать профиль ${model.displayName}`}
                      title="Правка"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-1.5 mb-3 flex gap-3 font-body text-xs text-white/30">
                {physical.age && <span>{physical.age} лет</span>}
                {physical.height && <span>{physical.height} см</span>}
                {physical.weight && <span>{physical.weight} кг</span>}
              </div>

              {psychotypeTags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {psychotypeTags.slice(0, 3).map((tag) => (
                    <span key={tag} className="badge badge-secondary !px-2 !py-0.5 !text-[10px]">
                      {translateTag(tag)}
                    </span>
                  ))}
                </div>
              )}

              <div className="min-h-[0.5rem] flex-1" aria-hidden />

              {model.rateHourly && (
                <div className="mt-auto border-t border-white/[0.06] pt-3 text-center">
                  <span className="font-display text-base font-bold text-gradient-gold">
                    {model.rateHourly} ₽/час
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* —— Обратная сторона — отзывы —— */}
          <div
            className={`absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.08] bg-[#101010] [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(4px)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_48px_rgba(0,0,0,0.45)] ${
              flipped ? '' : 'pointer-events-none'
            }`}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-0.5 md:hidden">
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Отзывы:
                  </span>
                  <span className="truncate font-display text-[15px] font-bold leading-tight text-gradient-gold">
                    {model.displayName}
                  </span>
                </div>
                <p className="hidden truncate md:block font-display text-xs font-bold uppercase leading-none tracking-[0.12em]">
                  <span className="text-white/45">Отзывы · </span>
                  <span className="text-gradient-gold">{model.displayName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeReviewsFace}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.1] text-white/70 transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45"
                aria-label="Закрыть отзывы"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2">
              {reviewsLoading ? (
                <div className="flex flex-1 items-center justify-center py-12">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d4af37]/30 border-t-[#d4af37]" />
                </div>
              ) : reviewsError ? (
                <p className="font-body text-center text-xs text-amber-200/80">{reviewsError}</p>
              ) : publicReviews && publicReviews.length === 0 ? (
                <p className="px-1 font-body text-center text-xs leading-relaxed text-white/35">
                  Пока нет одобренных отзывов или текст скрыт настройками приватности.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {(publicReviews ?? []).map((rev) => (
                    <li
                      key={rev.id}
                      className="rounded-lg border border-white/[0.06] bg-black/35 px-2.5 py-2"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <CatalogStarRow rating={rev.rating} />
                        <time
                          className="shrink-0 font-body text-[10px] tabular-nums text-white/30"
                          dateTime={rev.createdAt}
                        >
                          {new Date(rev.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </time>
                      </div>
                      {rev.comment?.trim() ? (
                        <p className="font-body text-[11px] leading-snug text-white/65">{rev.comment.trim()}</p>
                      ) : (
                        <p className="font-body text-[10px] text-white/25">Оценка без текста</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="shrink-0 border-t border-white/[0.06] p-2.5">
              <Link
                href={`${profileHref}#model-reviews`}
                onClick={(e) => e.stopPropagation()}
                className="block w-full rounded-full border border-[#d4af37]/35 bg-[#d4af37]/10 py-2 text-center font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-[#d4af37] transition-colors hover:bg-[#d4af37]/20"
              >
                Профиль и все отзывы
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
