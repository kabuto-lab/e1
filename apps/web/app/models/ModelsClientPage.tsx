'use client';

import Image from 'next/image';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GalleryHorizontal, LayoutGrid, MapPin, Pencil, Play, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { LocationSidebar, type GeoCountry } from '@/components/LocationSidebar';
import { SelectDropdown } from '@/components/SelectDropdown';
import { useAuth } from '@/components/AuthProvider';
import { publicMediaUrl } from '@/lib/public-media-url';
import { apiUrl } from '@/lib/api-url';
import { parsePgTextArray } from '@/lib/parse-pg-text-array';
import { useMassageMode } from '@/hooks/useMassageMode';
import { api, type MassageMaster } from '@/lib/api-client';
import { GuestBookingModal } from '@/components/GuestBookingModal';
import { formatPrice } from '@/lib/format-price';
import { AVAILABILITY_CLIENT_HINT, AVAILABILITY_CLIENT_LABEL, AVAILABILITY_DOT_COLOR } from '@/lib/availability';

interface ModelPhoto {
  id: string;
  url: string;
  isVisible?: boolean;
  sortOrder?: number;
}

interface ModelMediaItem {
  id: string;
  url: string;
  fileType: 'photo' | 'video';
}

interface ModelProfile {
  id: string;
  /** Владелец анкеты — нужен, чтобы показать кнопку правки самой модели. */
  userId: string;
  /** Менеджер анкеты — по нему менеджер видит правку только своих моделей. */
  managerId: string | null;
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
  media?: ModelMediaItem[];
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
    country?: string;
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
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
  bustMin: number;
  bustMax: number;
  priceMin: number;
  priceMax: number;
  limit: number;
  offset: number;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  online: { color: AVAILABILITY_DOT_COLOR.online, label: AVAILABILITY_CLIENT_LABEL.online },
  in_shift: { color: AVAILABILITY_DOT_COLOR.in_shift, label: AVAILABILITY_CLIENT_LABEL.in_shift },
  busy: { color: AVAILABILITY_DOT_COLOR.busy, label: AVAILABILITY_CLIENT_LABEL.busy },
  offline: { color: AVAILABILITY_DOT_COLOR.offline, label: AVAILABILITY_CLIENT_LABEL.offline },
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

/**
 * Психотип в карточке: короткие значения — пилюли, а длинное (менеджер вписал описание одним
 * предложением: «Спокойная, милая, люблю разговаривать…») — обычный текст. Предложение не режем:
 * это одна мысль, а в пилюле заглавными оно переносилось внутри капсулы и ломало карточку.
 */
const CARD_TAG_MAX_LENGTH = 24;

function isCardSentence(tag: string): boolean {
  return tag.length > CARD_TAG_MAX_LENGTH;
}

function normalizeCity(c: string | undefined): string {
  return (c ?? '').trim().toLowerCase();
}

/** Русские формы для счётчика каталога: 1 профиль, 2 профиля, 5 профилей. */
function pluralProfiles(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'профиль';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'профиля';
  return 'профилей';
}

/** Подписи сортировки — по ТЗ каталога. */
const SORT_OPTIONS: { key: 'rating' | 'createdAt' | 'displayName'; label: string }[] = [
  { key: 'rating', label: 'По рейтингу' },
  { key: 'createdAt', label: 'Сначала новые' },
  { key: 'displayName', label: 'По имени' },
];

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
  { id: 'online', title: AVAILABILITY_CLIENT_LABEL.online },
  { id: 'in_shift', title: AVAILABILITY_CLIENT_LABEL.in_shift },
  { id: 'busy', title: AVAILABILITY_CLIENT_LABEL.busy },
  { id: 'offline', title: AVAILABILITY_CLIENT_LABEL.offline },
];

function processModel(m: ModelProfile): ModelProfile {
  const processed = { ...m };
  processed.psychotypeTags = parsePgTextArray(m.psychotypeTags as unknown);
  processed.languages = parsePgTextArray(m.languages as unknown);

  const media = (m.media ?? []).map((f) => ({ ...f, url: publicMediaUrl(f.url) || f.url }));
  const mainUrl = publicMediaUrl(m.mainPhotoUrl) || m.mainPhotoUrl;
  const mainIdx = mainUrl ? media.findIndex((f) => f.url === mainUrl) : -1;
  if (mainIdx > 0) {
    const [mainItem] = media.splice(mainIdx, 1);
    media.unshift(mainItem);
  }
  processed.media = media;
  return processed;
}

export function ModelsClientPage({
  initialModels,
  initialStats,
  initialTotalCount,
}: {
  initialModels?: ModelProfile[];
  initialStats?: { total: number; online: number; verified: number; elite: number };
  initialTotalCount?: number;
}) {
  const massage = useMassageMode();
  const [masters, setMasters] = useState<MassageMaster[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [bookingMaster, setBookingMaster] = useState<MassageMaster | null>(null);

  useEffect(() => {
    if (!massage.enabled) return;
    let cancelled = false;
    setMastersLoading(true);
    api
      .getMassageMasters()
      .then((data) => {
        if (!cancelled) setMasters(data);
      })
      .catch(() => {
        if (!cancelled) setMasters([]);
      })
      .finally(() => {
        if (!cancelled) setMastersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [massage.enabled]);

  const [models, setModels] = useState<ModelProfile[]>([]);
  const [allModels, setAllModels] = useState<ModelProfile[]>(() =>
    initialModels ? initialModels.map(processModel) : [],
  );
  /** Снимок без city/country-фильтра — источник для сайдбара геолокации, чтобы после выбора
   * города в нём не пропадали остальные страны/города (city/country теперь фильтруются на бэкенде). */
  const [geoModels, setGeoModels] = useState<ModelProfile[]>(() =>
    initialModels ? initialModels.map(processModel) : [],
  );
  const [loading, setLoading] = useState(!initialModels);
  const [stats, setStats] = useState(
    initialStats ?? { total: 0, online: 0, verified: 0, elite: 0 },
  );
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(initialTotalCount ?? null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelPos, setPanelPos] = useState<CSSProperties>({});
  const filterBtnRef = useRef<HTMLDivElement>(null);
  const [mobileShelfView, setMobileShelfView] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [mobileLocationOpen, setMobileLocationOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    availabilityStatus: '',
    verificationStatus: '',
    eliteStatus: false,
    orderBy: 'rating',
    order: 'desc',
    district: '',
    ageMin: 0,
    ageMax: 0,
    heightMin: 0,
    heightMax: 0,
    weightMin: 0,
    weightMax: 0,
    bustMin: 0,
    bustMax: 0,
    priceMin: 0,
    priceMax: 0,
    limit: 15,
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
      if (selectedCity) params.append('city', selectedCity);
      else if (selectedCountry) params.append('country', selectedCountry);
      if (filters.ageMin) params.append('ageMin', filters.ageMin.toString());
      if (filters.ageMax) params.append('ageMax', filters.ageMax.toString());
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
        setTotalCount(0);
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
        const processed = data.map(processModel);
        setAllModels(processed);
        if (!selectedCity && !selectedCountry) {
          setGeoModels(processed);
        }
        const totalHeader = response.headers.get('X-Total-Count');
        setTotalCount(totalHeader ? parseInt(totalHeader, 10) : data.length);
      }

      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      } else {
        setStats({ total: 0, online: 0, verified: 0, elite: 0 });
      }
    } catch {
      setAllModels([]);
      setTotalCount(0);
      setCatalogError('Не удалось связаться с сервером. Проверьте сеть и переменную NEXT_PUBLIC_API_URL (если задана).');
      setStats({ total: 0, online: 0, verified: 0, elite: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters, selectedCity, selectedCountry]);

  // Skip first effect run when server data is available; re-run on filter changes.
  const skipFirstFetch = useRef(!!initialModels);
  useEffect(() => {
    if (massage.enabled) return;
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    loadModels();
  }, [loadModels, massage.enabled]);

  const handleLocationSelect = (country: string, city: string) => {
    setSelectedCountry(country);
    setSelectedCity(city);
    setFilters((prev) => ({ ...prev, offset: 0 }));
  };

  // Build sidebar geo data purely from loaded models
  const dynamicGeoData = useMemo(() => {
    const countryMap = new Map<string, Set<string>>();
    for (const m of geoModels) {
      const country = m.physicalAttributes?.country?.trim();
      const city = m.physicalAttributes?.city?.trim();
      if (!country) continue;
      if (!countryMap.has(country)) countryMap.set(country, new Set());
      if (city) countryMap.get(country)!.add(city);
    }
    return Array.from(countryMap.entries()).map(([country, cities]) => ({
      country,
      code: country,
      cities: Array.from(cities).sort(),
    }));
  }, [geoModels]);

  const locationLabel = selectedCity || selectedCountry;

  useEffect(() => {
    let filtered = allModels;

    // city/country фильтруются на бэкенде (см. loadModels) — allModels уже
    // сужен по всему каталогу через offset/limit, а не только внутри уже загруженной страницы
    // (раньше поиск резал по имени/городу ЛОКАЛЬНО, только среди 15 уже подгруженных анкет —
    // из-за этого пагинация строилась по общему total, а не по числу реальных совпадений).

    if (filters.district === 'moscow') {
      filtered = filtered.filter((m) => isMoscowDistrict(m.physicalAttributes?.city));
    } else if (filters.district === 'mo') {
      filtered = filtered.filter((m) => isMoscowOblastDistrict(m.physicalAttributes?.city));
    }
    // ageMin/ageMax теперь фильтруются на бэкенде (см. loadModels).
    if (filters.heightMin > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.height || 0) >= filters.heightMin);
    }
    if (filters.heightMax > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.height || 999) <= filters.heightMax);
    }
    if (filters.weightMin > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.weight || 0) >= filters.weightMin);
    }
    if (filters.weightMax > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.weight || 999) <= filters.weightMax);
    }
    if (filters.bustMin > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.bustSize || 0) >= filters.bustMin);
    }
    if (filters.bustMax > 0) {
      filtered = filtered.filter((m) => (m.physicalAttributes?.bustSize || 999) <= filters.bustMax);
    }
    if (filters.priceMin > 0) {
      filtered = filtered.filter((m) => (Number(m.rateHourly) || 0) >= filters.priceMin);
    }
    if (filters.priceMax > 0) {
      filtered = filtered.filter((m) => (Number(m.rateHourly) || Infinity) <= filters.priceMax);
    }
    setModels(filtered);
  }, [
    allModels,
    filters.district,
    filters.heightMin, filters.heightMax,
    filters.weightMin, filters.weightMax,
    filters.bustMin, filters.bustMax,
    filters.priceMin, filters.priceMax,
  ]);


  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key === 'offset' ? {} : { offset: 0 }) }));
  };

  const goToPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, offset: Math.max(0, (page - 1) * prev.limit) }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /** orderBy и order всегда меняются вместе — иначе, например, «А–Я» может уйти
   * по унаследованному order='desc' от предыдущей сортировки и показать Я→А. */
  const setSort = (orderBy: Filters['orderBy'], order: Filters['order']) => {
    setFilters(prev => ({ ...prev, orderBy, order, offset: 0 }));
  };

  const closeFiltersPanel = useCallback(() => {
    setPanelVisible(false);
    setTimeout(() => setShowFiltersPanel(false), 300);
  }, []);

  const openFiltersPanel = useCallback(() => {
    if (filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 328),
      });
    }
    setShowFiltersPanel(true);
    requestAnimationFrame(() => setPanelVisible(true));
  }, []);

  const hasExtraFilters =
    !!filters.district ||
    filters.ageMin > 0 || filters.ageMax > 0 ||
    filters.heightMin > 0 || filters.heightMax > 0 ||
    filters.weightMin > 0 || filters.weightMax > 0 ||
    filters.bustMin > 0 || filters.bustMax > 0 ||
    filters.priceMin > 0 || filters.priceMax > 0;

  /** Любой активный фильтр (доступность, локация, диапазоны):
   * от него зависит подпись счётчика и кнопка «Сбросить фильтры». */
  const hasAnyFilters =
    Boolean(filters.availabilityStatus) ||
    Boolean(selectedCountry) ||
    Boolean(selectedCity) ||
    hasExtraFilters;

  /** Полный сброс каталога: и локация, и диапазоны (сортировку не трогаем). */
  const resetAllFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      availabilityStatus: '',
      district: '',
      ageMin: 0, ageMax: 0,
      heightMin: 0, heightMax: 0,
      weightMin: 0, weightMax: 0,
      bustMin: 0, bustMax: 0,
      priceMin: 0, priceMax: 0,
      offset: 0,
    }));
    setSelectedCountry('');
    setSelectedCity('');
  }, []);

  /** X-Total-Count с текущими фильтрами — отсюда и «146 профилей», и «Найдено 24 профиля». */
  const profilesTotal = totalCount ?? models.length;

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

  if (massage.enabled) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
        <Header variant="page" segment={{ crumbs: [{ label: 'Мастера' }] }} />

        <div className="px-6 py-10">
          {massage.catalogMode === 'closed' ? (
            <div className="card mx-auto max-w-lg py-16 px-6 text-center">
              <h3 className="font-display text-lg font-bold text-white mb-3">
                Каталог мастеров доступен по предварительной заявке
              </h3>
              <p className="font-body text-sm text-white/40 mb-6">
                Оставьте контакт, и администратор расскажет о доступных мастерах и программах.
              </p>
              <Link href="/contacts" className="btn-primary">
                Запросить доступ
              </Link>
            </div>
          ) : mastersLoading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="aspect-[3/4] bg-white/[0.04] rounded-lg mb-3" />
                  <div className="h-4 bg-white/[0.06] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/[0.03] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : masters.length === 0 ? (
            <div className="card mx-auto max-w-lg py-16 px-6 text-center">
              <h3 className="font-display text-lg font-bold text-white mb-2">Пока нет мастеров</h3>
              <p className="font-body text-sm text-white/40">Загляните позже.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {masters.map((master) => (
                <MasterCard key={master.id} master={master} onBook={() => setBookingMaster(master)} />
              ))}
            </div>
          )}
        </div>

        {bookingMaster ? (
          <GuestBookingModal
            modelId={bookingMaster.id}
            modelName={bookingMaster.displayName}
            variant="massage"
            onClose={() => setBookingMaster(null)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <Header
        variant="page"
        segment={{
          crumbs: [{ label: massage.enabled ? 'Мастера' : 'Модели' }],
          hint: massage.enabled ? (
            <span className="ml-1 hidden font-body text-xs text-white/25 sm:inline">
              {masters.length} из {stats.total}
            </span>
          ) : undefined,
        }}
      />

      <div className="flex flex-1 min-h-0">
        {/* Location sidebar */}
        {/* <LocationSidebar
          selectedCountry={selectedCountry}
          selectedCity={selectedCity}
          onSelect={handleLocationSelect}
          mobileOpen={mobileLocationOpen}
          onMobileClose={() => setMobileLocationOpen(false)}
          geoData={dynamicGeoData}
        /> */}

        <div className="flex flex-1 min-w-0 flex-col">
      {/* Filter bar */}
      {/* safe center, а не justify-center: когда пилюли не влезают (мобилка), обычный center выталкивает
          начало ряда за левый край, куда скролл не достаёт. safe — по центру, пока влезает, иначе от левого края. */}
      <div className="px-4 py-3 flex items-center [justify-content:safe_center] gap-2 overflow-x-auto scrollbar-hide border-b border-white/[0.04]">
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
        {/* Mobile: location button — отключена вместе с LocationSidebar выше: открывала боковой сайдбар выбора локации. */}
        {/* <button
          type="button"
          onClick={() => setMobileLocationOpen(true)}
          className={`md:hidden flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 font-body text-xs font-medium transition-colors ${
            locationLabel
              ? 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37]'
              : 'border-white/[0.1] bg-white/[0.06] text-white/50 hover:text-white/75'
          }`}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="max-w-[80px] truncate">{locationLabel || 'Город'}</span>
        </button> */}
        <Pill active={!filters.availabilityStatus} onClick={() => handleFilterChange('availabilityStatus', '')}>Все</Pill>
        <Pill
          active={filters.availabilityStatus === 'online'}
          onClick={() => handleFilterChange('availabilityStatus', 'online')}
          title={AVAILABILITY_CLIENT_HINT.online}
        >
          {AVAILABILITY_CLIENT_LABEL.online}
        </Pill>
        <span className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
        <span className="shrink-0 font-body text-xs text-white/35">
          Сортировка
        </span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <Pill
            key={key}
            active={filters.orderBy === key}
            onClick={() => setSort(key, key === 'displayName' ? 'asc' : 'desc')}
            subtle
          >
            {label}
          </Pill>
        ))}
        <span className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
        <div ref={filterBtnRef} className="inline-flex">
          <Pill
            active={showFiltersPanel || Boolean(selectedCountry) || Boolean(selectedCity)}
            onClick={openFiltersPanel}
            subtle
          >
            Все фильтры
          </Pill>
        </div>
        {hasAnyFilters ? (
          /* Отдельное действие, а не ещё один фильтр — отодвигаем от «Все фильтры», чтобы надписи не слипались. */
          <div className="ml-2 inline-flex">
            <Pill active={false} onClick={resetAllFilters} subtle>
              Сбросить фильтры
            </Pill>
          </div>
        ) : null}
      </div>

      {/* Filters panel — bottom sheet on mobile, popover on desktop */}
      {showFiltersPanel && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${panelVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeFiltersPanel}
          />
          {/* Mobile: bottom sheet */}
          <div className={`fixed inset-x-0 bottom-0 z-50 md:hidden transition-transform duration-300 ease-out ${panelVisible ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="rounded-t-[1.5rem] border-t border-white/[0.08] bg-[#0f0f0f] px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />
              <FilterPanelContent
                filters={filters}
                onChange={handleFilterChange}
                onClose={closeFiltersPanel}
                onReset={resetAllFilters}
                hasFilters={hasAnyFilters}
                geoData={dynamicGeoData}
                selectedCountry={selectedCountry}
                selectedCity={selectedCity}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          </div>
          {/* Desktop: popover */}
          <div
            className="fixed z-50 hidden md:block w-80 rounded-2xl border border-white/[0.08] bg-[#0f0f0f] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04)]"
            style={panelPos}
          >
            <FilterPanelContent
              filters={filters}
              onChange={handleFilterChange}
              onClose={closeFiltersPanel}
              onReset={resetAllFilters}
              hasFilters={hasAnyFilters}
              geoData={dynamicGeoData}
              selectedCountry={selectedCountry}
              selectedCity={selectedCity}
              onLocationSelect={handleLocationSelect}
            />
          </div>
        </>
      )}

      <div className="px-6 pb-10">
        <main className={!models.length ? "min-h-[calc(100vh-200px)] flex items-center" : ""}>
          {loading ? (
            <div className="grid grid-cols-1 min-[376px]:grid-cols-2 min-[769px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="aspect-[3/4] bg-white/[0.04] rounded-lg mb-3" />
                  <div className="h-4 bg-white/[0.06] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/[0.03] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : !models.length ? (
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
                    Анкет пока нет. Загляните позже — мы работаем над наполнением каталога.
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
                className={`grid grid-cols-1 gap-5 pt-[20px] min-[376px]:grid-cols-2 min-[769px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 ${mobileShelfView ? 'max-md:hidden' : ''}`}
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
        {!loading && !catalogError && totalCount !== null && totalCount > filters.limit ? (
          <Pagination
            page={Math.floor(filters.offset / filters.limit) + 1}
            totalPages={Math.max(1, Math.ceil(totalCount / filters.limit))}
            onPageChange={goToPage}
          />
        ) : null}
      </div>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = useMemo(() => {
    const window = 2;
    const result: (number | 'ellipsis')[] = [];
    const start = Math.max(1, page - window);
    const end = Math.min(totalPages, page + window);

    if (start > 1) {
      result.push(1);
      if (start > 2) result.push('ellipsis');
    }
    for (let p = start; p <= end; p++) result.push(p);
    if (end < totalPages) {
      if (end < totalPages - 1) result.push('ellipsis');
      result.push(totalPages);
    }
    return result;
  }, [page, totalPages]);

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-1.5"
      aria-label="Страницы каталога"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 min-w-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.06] px-3 font-body text-xs font-medium text-white/60 transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37] disabled:pointer-events-none disabled:opacity-30"
        aria-label="Предыдущая страница"
      >
        ←
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="px-1.5 font-body text-xs text-white/25">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`flex h-9 min-w-9 items-center justify-center rounded-full px-3 font-body text-xs font-medium transition-colors ${
              p === page
                ? 'bg-[#d4af37] text-black'
                : 'border border-white/[0.1] bg-white/[0.06] text-white/60 hover:border-[#d4af37]/40 hover:text-[#d4af37]'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-9 min-w-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.06] px-3 font-body text-xs font-medium text-white/60 transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37] disabled:pointer-events-none disabled:opacity-30"
        aria-label="Следующая страница"
      >
        →
      </button>
    </nav>
  );
}

function Pill({
  active, onClick, subtle, title, children,
}: {
  active: boolean;
  onClick: () => void;
  subtle?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
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

const RANGE_FILTERS = [
  { label: 'Возраст', minKey: 'ageMin', maxKey: 'ageMax', minPh: '18', maxPh: '50' },
  { label: 'Рост, см', minKey: 'heightMin', maxKey: 'heightMax', minPh: '155', maxPh: '185' },
  { label: 'Вес, кг', minKey: 'weightMin', maxKey: 'weightMax', minPh: '45', maxPh: '70' },
  { label: 'Грудь', minKey: 'bustMin', maxKey: 'bustMax', minPh: '1', maxPh: '5' },
  { label: 'Цена, ₽/час', minKey: 'priceMin', maxKey: 'priceMax', minPh: '5000', maxPh: '50000' },
] as const;

const inputCls =
  'w-16 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-xs text-center font-body placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/50 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

function FilterPanelContent({
  filters,
  onChange,
  onClose,
  onReset,
  hasFilters,
  geoData,
  selectedCountry,
  selectedCity,
  onLocationSelect,
}: {
  filters: Filters;
  onChange: (key: keyof Filters, value: any) => void;
  onClose: () => void;
  onReset: () => void;
  hasFilters: boolean;
  geoData: GeoCountry[];
  selectedCountry: string;
  selectedCity: string;
  onLocationSelect: (country: string, city: string) => void;
}) {
  const cities = geoData.find((g) => g.code === selectedCountry)?.cities ?? [];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="font-display text-sm font-bold text-white tracking-wide">Фильтры</span>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button
              onClick={onReset}
              className="font-body text-xs text-[#d4af37]/70 hover:text-[#d4af37] transition-colors"
            >
              Сбросить фильтры
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Локация — два отдельных поля: страна и город (город только здесь, не в поиске) */}
      <div className="mb-5 flex flex-col gap-3">
        {/* Кастомный SelectDropdown вместо нативного <select>: системный список выбивался из тёмной золотой темы. */}
        <div className="flex items-center justify-between gap-2">
          <span className="w-20 flex-shrink-0 font-body text-xs text-white/40">Страна</span>
          <div className="w-[10rem]">
            <SelectDropdown
              size="sm"
              value={selectedCountry}
              onChange={(code) => onLocationSelect(code, '')}
              options={[
                { value: '', label: 'Все страны' },
                ...geoData.map(({ code, country }) => ({ value: code, label: country })),
              ]}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="w-20 flex-shrink-0 font-body text-xs text-white/40">Город</span>
          <div className="w-[10rem]">
            <SelectDropdown
              size="sm"
              value={selectedCity}
              onChange={(city) => onLocationSelect(selectedCountry, city)}
              disabled={!selectedCountry || cities.length === 0}
              options={[
                { value: '', label: !selectedCountry ? 'Сначала страна' : cities.length === 0 ? 'Городов пока нет' : 'Все города' },
                ...cities.map((city) => ({ value: city, label: city })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Range filters */}
      <div className="flex flex-col gap-4">
        {RANGE_FILTERS.map(({ label, minKey, maxKey, minPh, maxPh }) => (
          <div key={minKey} className="flex items-center justify-between gap-2">
            <span className="font-body text-xs text-white/40 w-20 flex-shrink-0">{label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={minPh}
                value={(filters[minKey as keyof Filters] as number) || ''}
                onChange={(e) => onChange(minKey as keyof Filters, parseInt(e.target.value) || 0)}
                className={inputCls}
              />
              <span className="text-white/20 text-xs">—</span>
              <input
                type="number"
                placeholder={maxPh}
                value={(filters[maxKey as keyof Filters] as number) || ''}
                onChange={(e) => onChange(maxKey as keyof Filters, parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Apply button (mobile convenience) */}
      <button
        onClick={onClose}
        className="mt-6 w-full rounded-full border border-[#d4af37]/35 bg-[#d4af37]/10 py-2.5 font-body text-xs font-semibold uppercase tracking-[0.08em] text-[#d4af37] transition-colors hover:bg-[#d4af37]/20"
      >
        Применить
      </button>
    </div>
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
  const { user } = useAuth();
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [publicReviews, setPublicReviews] = useState<PublicCatalogReview[] | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const reviewsFetchStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(`/reviews/public/model/${model.id}?limit=1`))
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { totalReviews?: number } | null) => {
        if (!cancelled && typeof data?.totalReviews === 'number') setReviewCount(data.totalReviews);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [model.id]);

  const psychotypeAll = parsePgTextArray(model.psychotypeTags as unknown);
  const psychotypeTags = psychotypeAll.filter((tag) => !isCardSentence(tag));
  const psychotypeSentence = psychotypeAll.find(isCardSentence);
  const physical = model.physicalAttributes || {};
  const status = STATUS_MAP[model.availabilityStatus] || STATUS_MAP.offline;

  const allMedia = model.media ?? [];
  const hasVideo = allMedia.some((f) => f.fileType === 'video');
  // Обложка карточки (без наведения) — только фото, никогда видео. Если фото нет вообще
  // (только видео) — показываем заглушку-силуэт, а не автовоспроизведение видео.
  const firstPhoto = allMedia.find((f) => f.fileType === 'photo');

  const getPreviewItem = (segment: number): ModelMediaItem | undefined => {
    if (allMedia.length === 0) return undefined;
    return allMedia[segment % allMedia.length];
  };

  const displayItem = activeSegment !== null ? getPreviewItem(activeSegment) : firstPhoto;
  const displayImage = displayItem?.url;
  const displayIsVideo = displayItem?.fileType === 'video';

  const profileHref = `/models/${model.slug || model.id}`;

  /** Кнопка правки — владельцу анкеты и сотрудникам с правами (как проверяет бэкенд: ADMIN/MODERATOR — любую,
   *  MANAGER — только своих моделей, модель — только свою анкету, EMPLOYEE — при canEditModels). */
  const role = user?.role;
  const canEditProfile = Boolean(
    user &&
      (role === 'admin' ||
        role === 'moderator' ||
        (role === 'model' && model.userId === user.id) ||
        (role === 'manager' && model.managerId === user.id) ||
        (role === 'employee' && user.employeeAccess?.canEditModels)),
  );
  const editHref = role === 'model' ? '/model/profile' : `/dashboard/models/${model.id}/edit`;

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
      className={`card card--catalog-flip flex h-full flex-col overflow-visible group ${flipped ? '' : 'cursor-pointer'}`}
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
            <div
              className="relative aspect-[3/4] overflow-hidden rounded-t-[var(--radius-lg)] bg-[#0a0a0a]"
              style={{ backgroundImage: "url('https://placehold.co/300x400/0f0f0f/d4af37')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              {displayImage && displayIsVideo ? (
                <video
                  key={displayImage}
                  src={displayImage}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : displayImage ? (
                <Image
                  src={displayImage}
                  alt={model.displayName}
                  fill
                  unoptimized={
                    displayImage.startsWith('/pic-proxy/') ||
                    displayImage.startsWith('/img-proxy/')
                  }
                  onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-t-[var(--radius-lg)] text-5xl opacity-20">
                  👤
                </div>
              )}

              {hasVideo && !displayIsVideo && (
                <div className="pointer-events-none absolute left-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm">
                  <Play className="h-3.5 w-3.5 fill-[#d4af37] text-[#d4af37]" strokeWidth={0} />
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

              {allMedia.length > 1 && (
                <div className="pointer-events-none absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                  {allMedia.slice(0, 8).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-all duration-150 ${
                        activeSegment !== null && activeSegment % allMedia.length === i
                          ? 'scale-125 bg-[#d4af37]'
                          : 'bg-white/40'
                      }`}
                    />
                  ))}
                  {allMedia.length > 8 && (
                    <span className="ml-0.5 text-[9px] text-white/40">+{allMedia.length - 8}</span>
                  )}
                </div>
              )}

              <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur-sm">
                <span className={`h-2 w-2 rounded-full ${status.color} shadow-[0_0_8px] shadow-current`} />
                <span className="font-body text-[11px] text-white/80">{status.label}</span>
              </div>

              {model.verificationStatus === 'verified' && (
                /* Пояснение проверки живёт здесь — на единственной плашке каталога (под фотографией),
                   чтобы не дублировать отметку в описании карточки. */
                <div
                  className="pointer-events-auto absolute bottom-3 right-3 z-20 rounded-md bg-black/75 px-2.5 py-1 font-body text-[10px] font-medium text-emerald-200"
                  title="Личность модели и соответствие фотографий проверены My Muse"
                >
                  Профиль подтверждён
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 z-[12] bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 flex-1 truncate font-display text-sm font-bold text-white transition-colors group-hover:text-[#d4af37]">
                  {model.displayName}
                </h3>
                {canEditProfile ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href={editHref}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-black/40 text-[#d4af37]/90 backdrop-blur-sm transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45"
                      aria-label={`Редактировать профиль ${model.displayName}`}
                      title="Правка"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="mt-1.5 mb-3 flex flex-col gap-0.5 font-body text-xs text-white/45">
                {physical.city || physical.age ? (
                  <span className="truncate">
                    {[physical.city, physical.age ? `${physical.age} лет` : null].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
                {physical.height || physical.weight ? (
                  <span className="truncate">
                    {[
                      physical.height ? `${physical.height} см` : null,
                      physical.weight ? `${physical.weight} кг` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                ) : null}
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

              {psychotypeSentence ? (
                <p
                  title={psychotypeSentence}
                  className="mb-3 line-clamp-2 font-body text-xs leading-relaxed text-white/55 first-letter:uppercase"
                >
                  {psychotypeSentence}
                </p>
              ) : null}

              <div className="min-h-[0.5rem] flex-1" aria-hidden />

              {reviewCount > 0 ? (
                <button
                  type="button"
                  onClick={openReviewsFace}
                  className="mb-2 self-start font-body text-xs text-white/50 underline-offset-2 transition-colors hover:text-[#d4af37] hover:underline"
                  aria-expanded={flipped}
                >
                  Отзывы · {reviewCount}
                </button>
              ) : (
                <p className="mb-2 font-body text-xs text-white/35">Пока нет отзывов</p>
              )}

              {model.rateHourly && (
                <div className="mt-auto border-t border-white/[0.06] pt-3 text-center">
                  <span className="font-display text-base font-bold text-gradient-gold">
                    {formatPrice(model.rateHourly)} ₽ / час
                  </span>
                </div>
              )}

              <Link
                href={profileHref}
                onClick={(e) => e.stopPropagation()}
                className="mt-3 block rounded-full border border-white/[0.14] py-2 text-center font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-white/85 transition-colors hover:border-[#d4af37]/45 hover:text-[#d4af37]"
              >
                Посмотреть профиль
              </Link>
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

const MASTER_STATUS_MAP: Record<MassageMaster['availabilityStatus'], { color: string; label: string }> = {
  available: { color: 'bg-green-500', label: 'Свободен' },
  busy: { color: 'bg-red-500', label: 'Занят' },
  unavailable: { color: 'bg-gray-500', label: 'Недоступен' },
};

/** Карточка мастера массажного режима (ТЗ §2) — фото, имя, статус, цена «от X ₽», без доп. функций. */
function MasterCard({ master, onBook }: { master: MassageMaster; onBook: () => void }) {
  const image = publicMediaUrl(master.mainPhotoUrl);
  const status = MASTER_STATUS_MAP[master.availabilityStatus] ?? MASTER_STATUS_MAP.available;
  const profileHref = `/models/${master.slug}`;

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-t-[var(--radius-lg)] bg-[#0a0a0a]"
        style={{ backgroundImage: "url('https://placehold.co/300x400/0f0f0f/d4af37')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {image ? (
          <Image
            src={image}
            alt={master.displayName}
            fill
            unoptimized={image.startsWith('/pic-proxy/') || image.startsWith('/img-proxy/')}
            onError={(e) => { e.currentTarget.style.opacity = '0'; }}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl opacity-20">👤</div>
        )}
        {master.isPopular ? <div className="badge badge-gold absolute right-3 top-3 z-20">Популярный мастер</div> : null}
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur-sm">
          <span className={`h-2 w-2 rounded-full ${status.color}`} />
          <span className="font-body text-[11px] text-white/80">{status.label}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-sm font-bold text-white">{master.displayName}</h3>
        {master.priceFrom ? (
          <p className="mt-1 font-display text-sm font-bold text-gradient-gold">
            от {Math.round(Number(master.priceFrom)).toLocaleString('ru-RU')} ₽
          </p>
        ) : null}
        <div className="mt-auto flex gap-2 pt-3">
          <Link
            href={profileHref}
            className="flex-1 rounded-lg border border-white/[0.1] py-2 text-center font-body text-xs font-medium text-white/75 transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37]"
          >
            Подробнее
          </Link>
          <button
            type="button"
            onClick={onBook}
            className="flex-1 rounded-lg bg-[#d4af37] py-2 font-body text-xs font-semibold text-black transition-colors hover:bg-[#c49a2b]"
          >
            Забронировать
          </button>
        </div>
      </div>
    </article>
  );
}
