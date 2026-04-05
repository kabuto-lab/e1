'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

interface Filters {
  availabilityStatus: string;
  verificationStatus: string;
  eliteStatus: boolean;
  orderBy: 'rating' | 'createdAt' | 'displayName';
  order: 'asc' | 'desc';
  city: string;
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

const CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Сочи', 'Екатеринбург', 'Новосибирск'];

export default function ModelsPage() {
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [allModels, setAllModels] = useState<ModelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, online: 0, verified: 0, elite: 0 });
  /** Ошибка HTTP/сети при загрузке каталога — не путать с «пустым результатом фильтров». */
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [showExtra, setShowExtra] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    availabilityStatus: '',
    verificationStatus: '',
    eliteStatus: false,
    orderBy: 'rating',
    order: 'desc',
    city: '',
    ageMin: 0,
    ageMax: 0,
    limit: 50,
    offset: 0,
  });

  const loadModels = async () => {
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

      const response = await fetch(apiUrl(`/models?${params.toString()}`));
      if (!response.ok) {
        setAllModels([]);
        setCatalogError(
          `Каталог недоступен (код ${response.status}). Обычно это API не отвечает, ошибка БД на сервере или неверный URL API.`,
        );
      } else {
        const data: ModelProfile[] = await response.json();
        for (const m of data) {
          m.psychotypeTags = parsePgTextArray(m.psychotypeTags as unknown);
          m.languages = parsePgTextArray(m.languages as unknown);
          const urls = generateDemoPhotos(m.id, m.mainPhotoUrl, 12);
          m.photos = urls.map((url, i) => ({ id: `photo-${i}`, url }));
        }
        setAllModels(data);
      }

      const statsResponse = await fetch(apiUrl('/models/stats'));
      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      } else if (!response.ok) {
        setStats({ total: 0, online: 0, verified: 0, elite: 0 });
      }
    } catch {
      setAllModels([]);
      setCatalogError('Не удалось связаться с сервером. Проверьте сеть и переменную NEXT_PUBLIC_API_URL (если задана).');
      setStats({ total: 0, online: 0, verified: 0, elite: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, [filters.availabilityStatus, filters.verificationStatus, filters.eliteStatus, filters.orderBy, filters.order]);

  useEffect(() => {
    let filtered = allModels;
    if (filters.city) {
      filtered = filtered.filter((m) => m.physicalAttributes?.city === filters.city);
    }
    if (filters.ageMin > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.age || 0) >= filters.ageMin);
    }
    if (filters.ageMax > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.age || 99) <= filters.ageMax);
    }
    setModels(filtered);
  }, [allModels, filters.city, filters.ageMin, filters.ageMax]);

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasExtraFilters = filters.city || filters.ageMin > 0 || filters.ageMax > 0;

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
        <Pill active={!filters.availabilityStatus} onClick={() => handleFilterChange('availabilityStatus', '')}>Все</Pill>
        <Pill active={filters.availabilityStatus === 'online'} onClick={() => handleFilterChange('availabilityStatus', 'online')}>Свободна</Pill>
        <Pill active={filters.availabilityStatus === 'in_shift'} onClick={() => handleFilterChange('availabilityStatus', 'in_shift')}>В смене</Pill>
        <Pill active={filters.eliteStatus} onClick={() => handleFilterChange('eliteStatus', !filters.eliteStatus)}>Elite</Pill>
        <span className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
        <Pill active={filters.orderBy === 'rating'} onClick={() => handleFilterChange('orderBy', 'rating')} subtle>По рейтингу</Pill>
        <Pill active={filters.orderBy === 'createdAt'} onClick={() => handleFilterChange('orderBy', 'createdAt')} subtle>Новые</Pill>
        <Pill active={filters.orderBy === 'displayName'} onClick={() => handleFilterChange('orderBy', 'displayName')} subtle>А–Я</Pill>
        <span className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
        <Pill
          active={showExtra || !!hasExtraFilters}
          onClick={() => {
            if (hasExtraFilters) {
              setFilters(prev => ({ ...prev, city: '', ageMin: 0, ageMax: 0 }));
            } else {
              setShowExtra(!showExtra);
            }
          }}
          subtle
        >
          {hasExtraFilters ? '✕ Сбросить' : '+ Город, возраст'}
        </Pill>
      </div>

      {/* Extra filters row */}
      {showExtra && (
        <div className="px-6 pb-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <span className="font-body text-[11px] text-white/25 flex-shrink-0 uppercase tracking-wider">Город</span>
          <Pill active={!filters.city} onClick={() => handleFilterChange('city', '')}>Все</Pill>
          {CITIES.map((c) => (
            <Pill key={c} active={filters.city === c} onClick={() => handleFilterChange('city', c)}>{c}</Pill>
          ))}
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
                    На VPS чаще всего: неверный пароль в DATABASE_URL, PM2 без перезапуска после смены .env, или PostgreSQL ещё не поднят.
                  </p>
                </>
              ) : hasExtraFilters ? (
                <>
                  <div className="text-5xl mb-4 opacity-30" aria-hidden>🔍</div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">Ничего не найдено</h3>
                  <p className="font-body text-sm text-white/30">Сбросьте город или возраст — сейчас никто не подходит под фильтры.</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {models.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
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

/* ─── Sub-components ──────────────────────────── */

function ModelCard({ model }: { model: ModelProfile }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
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

  return (
    <article
      onClick={() => router.push(`/models/${model.slug || model.id}`)}
      className={`card overflow-hidden cursor-pointer group ${
        model.eliteStatus ? '!border-[#d4af37]/25' : ''
      }`}
    >
      {/* Photo with 3x4 hover grid */}
      <div className="relative aspect-[3/4] bg-[#0a0a0a] overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={model.displayName}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">👤</div>
        )}

        {/* 3x4 hover grid overlay — always visible */}
        <div className="absolute inset-0 z-10 grid grid-cols-3 grid-rows-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              onMouseEnter={() => setActiveSegment(i)}
              onMouseLeave={() => setActiveSegment(null)}
              className="transition-colors duration-75 hover:bg-white/[0.06]"
            />
          ))}
        </div>

        {/* Photo indicator dots */}
        {allPhotos.length > 1 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {allPhotos.slice(0, 8).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
                  (activeSegment !== null && (activeSegment % allPhotos.length) === i)
                    ? 'bg-[#d4af37] scale-125'
                    : 'bg-white/40'
                }`}
              />
            ))}
            {allPhotos.length > 8 && (
              <span className="text-[9px] text-white/40 ml-0.5">+{allPhotos.length - 8}</span>
            )}
          </div>
        )}

        {model.eliteStatus && (
          <div className="absolute top-3 right-3 badge badge-gold z-20">Elite</div>
        )}

        {/* Status pill */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full z-20">
          <span className={`w-2 h-2 rounded-full ${status.color} shadow-[0_0_8px] shadow-current`} />
          <span className="font-body text-[11px] text-white/80">{status.label}</span>
        </div>

        {model.verificationStatus === 'verified' && (
          <div className="absolute bottom-3 right-3 badge badge-success z-20">✓</div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm font-bold text-white group-hover:text-[#d4af37] transition-colors flex items-center gap-2 min-w-0">
            {model.displayName}
          </h3>
          {isAdmin ? (
            <Link
              href={`/dashboard/models/${model.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d4af37]/90 hover:text-[#d4af37] transition-colors"
              aria-label={`Редактировать профиль ${model.displayName}`}
            >
              Правка
            </Link>
          ) : null}
        </div>

        <div className="flex gap-3 font-body text-xs text-white/30 mt-1.5 mb-3">
          {physical.age && <span>{physical.age} лет</span>}
          {physical.height && <span>{physical.height} см</span>}
          {physical.weight && <span>{physical.weight} кг</span>}
        </div>

        {psychotypeTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {psychotypeTags.slice(0, 3).map((tag) => (
              <span key={tag} className="badge badge-secondary !text-[10px] !py-0.5 !px-2">
                {translateTag(tag)}
              </span>
            ))}
          </div>
        )}

        {model.rateHourly && (
          <div className="pt-3 border-t border-white/[0.06] text-center">
            <span className="font-display text-base font-bold text-gradient-gold">
              {model.rateHourly} ₽/час
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
