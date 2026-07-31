'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  X,
  Check,
  AlertCircle,
  Send,
  Trash2,
  Star,
  ListOrdered,
} from 'lucide-react';
import { api, resolveUploadMimeType, type MassageMaster } from '@/lib/api-client';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { NumberStepperInput } from '@/components/NumberStepperInput';
import { Switch } from '@/components/Switch';
import { SelectDropdown } from '@/components/SelectDropdown';

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Свободен' },
  { value: 'busy', label: 'Занят' },
  { value: 'unavailable', label: 'Недоступен' },
];

const AVAILABILITY_BADGE: Record<'available' | 'busy' | 'unavailable', { color: string; label: string }> = {
  available: { color: 'bg-green-500', label: 'Свободен' },
  busy: { color: 'bg-red-500', label: 'Занят' },
  unavailable: { color: 'bg-gray-500', label: 'Недоступен' },
};

const GRID_SLOTS = 8;

/**
 * Общая форма создания/редактирования мастера (по образцу /dashboard/models/create) —
 * используется и на /dashboard/masters/create, и на /dashboard/masters/[id]/edit.
 */
export function MasterEditorForm({ initialMaster }: { initialMaster?: MassageMaster }) {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);

  const [createdId, setCreatedId] = useState<string | null>(initialMaster?.id ?? null);
  const [displayName, setDisplayName] = useState(initialMaster?.displayName ?? 'Новый мастер');
  const [slug, setSlug] = useState(initialMaster?.slug ?? '');
  const [slugEditing, setSlugEditing] = useState(false);
  const [description, setDescription] = useState(initialMaster?.description ?? '');
  const [priceFrom, setPriceFrom] = useState(initialMaster?.priceFrom ?? '');
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'unavailable'>(
    initialMaster?.availabilityStatus ?? 'available',
  );
  const [isPopular, setIsPopular] = useState(initialMaster?.isPopular ?? false);
  const [isPublished, setIsPublished] = useState(initialMaster?.isPublished ?? false);
  const [mainPhotoUrl, setMainPhotoUrl] = useState(initialMaster?.mainPhotoUrl ?? '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialMaster?.photoUrls ?? []);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nameEditing, setNameEditing] = useState(false);

  const gallery = mainPhotoUrl ? [mainPhotoUrl, ...photoUrls.filter((u) => u !== mainPhotoUrl)] : photoUrls;
  const gridCells = Array.from({ length: GRID_SLOTS }, (_, i) => gallery[i] || null);

  const create = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created: MassageMaster = await api.createMassageMaster({
        displayName: displayName.trim() || 'Новый мастер',
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        priceFrom: priceFrom ? Number(priceFrom) : undefined,
        isPopular,
        isPublished,
      });
      setCreatedId(created.id);
      setSlug(created.slug);
      setSuccess('Мастер создан — теперь можно загрузить фото');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать мастера');
    } finally {
      setIsSaving(false);
    }
  };

  const save = async () => {
    if (!createdId) return create();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.updateMassageMaster(createdId, {
        displayName: displayName.trim() || 'Новый мастер',
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        priceFrom: priceFrom ? Number(priceFrom) : undefined,
        mainPhotoUrl: mainPhotoUrl || undefined,
        photoUrls,
        availabilityStatus,
        isPopular,
        isPublished,
      });
      setSuccess('Сохранено');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setIsSaving(false);
    }
  };

  const uploadToSlot = async (file: File, slotIndex: number) => {
    setUploadingSlot(slotIndex);
    setError(null);
    try {
      const mimeType = resolveUploadMimeType(file);
      const { uploadUrl, cdnUrl } = await api.presignMasterPhoto({
        fileName: file.name,
        mimeType,
        fileSize: file.size,
      });
      await api.uploadToMinIO(uploadUrl, file, mimeType);

      const nextGallery = [...gallery];
      nextGallery[slotIndex] = cdnUrl;
      const cleaned = nextGallery.filter((u): u is string => !!u);
      const newMain = mainPhotoUrl || cleaned[0] || '';
      const newRest = cleaned.filter((u) => u !== newMain);

      setMainPhotoUrl(newMain);
      setPhotoUrls(newRest);

      if (createdId) {
        await api.updateMassageMaster(createdId, { mainPhotoUrl: newMain, photoUrls: newRest });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки фото');
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeSlot = async (slotIndex: number) => {
    const url = gallery[slotIndex];
    if (!url) return;
    const cleaned = gallery.filter((_, i) => i !== slotIndex);
    const newMain = url === mainPhotoUrl ? cleaned[0] || '' : mainPhotoUrl;
    const newRest = cleaned.filter((u) => u !== newMain);
    setMainPhotoUrl(newMain);
    setPhotoUrls(newRest);
    if (createdId) {
      try {
        await api.updateMassageMaster(createdId, { mainPhotoUrl: newMain || undefined, photoUrls: newRest });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось удалить фото');
      }
    }
  };

  const makeMain = async (slotIndex: number) => {
    const url = gallery[slotIndex];
    if (!url || url === mainPhotoUrl) return;
    const newRest = gallery.filter((u) => u !== url && u !== mainPhotoUrl).concat(mainPhotoUrl ? [mainPhotoUrl] : []);
    setMainPhotoUrl(url);
    setPhotoUrls(newRest.filter((u): u is string => !!u));
    if (createdId) {
      try {
        await api.updateMassageMaster(createdId, { mainPhotoUrl: url, photoUrls: newRest.filter((u): u is string => !!u) });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось назначить главное фото');
      }
    }
  };

  const crumbName = displayName.trim() || 'Новый мастер';

  return (
    <div className={`-m-4 flex min-h-0 w-auto flex-1 flex-col overflow-hidden font-body lg:-m-6 lg:-mr-8 ${t.page}`}>
      <div className={t.topBarModel}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/dashboard/masters"
            className={`shrink-0 rounded-lg p-2 transition-colors ${L ? 'text-[#646970] hover:bg-[#f0f0f1] hover:text-[#1d2327]' : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'}`}
            aria-label="Назад к списку"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs sm:text-sm" aria-label="Хлебные крошки">
            <Link href="/dashboard" className={`shrink-0 font-display transition-colors ${L ? 'text-[#646970] hover:text-[#2271b1]' : 'text-zinc-500 hover:text-[#d4af37]'}`}>
              Дэшборд
            </Link>
            <span className={`shrink-0 px-1 font-display font-bold ${L ? 'text-[#a7aaad]' : 'text-zinc-700'}`} aria-hidden>/</span>
            <Link href="/dashboard/masters" className={`shrink-0 font-display transition-colors ${L ? 'text-[#646970] hover:text-[#2271b1]' : 'text-zinc-500 hover:text-[#d4af37]'}`}>
              Мастера
            </Link>
            <span className={`shrink-0 px-1 font-display font-bold ${L ? 'text-[#a7aaad]' : 'text-zinc-700'}`} aria-hidden>/</span>
            <span className={`min-w-0 truncate font-display ${L ? 'text-[#1d2327]' : 'text-zinc-300'}`} title={crumbName}>
              {crumbName}
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {createdId ? (
            <Link
              href={`/dashboard/masters/${createdId}/programs`}
              className={L ? `${t.btnSecondary} px-3 py-1.5 text-xs` : 'flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-[#d4af37]/50 hover:text-white'}
            >
              <ListOrdered className="h-3.5 w-3.5" /> Программы
            </Link>
          ) : (
            <span
              title="Сначала создайте мастера"
              className={`flex cursor-not-allowed items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${L ? 'border-[#dcdcde] text-[#a7aaad]' : 'border-white/[0.04] text-gray-600'}`}
            >
              <ListOrdered className="h-3.5 w-3.5" /> Программы
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${L ? 'border border-[#2271b1] bg-[#2271b1] text-white hover:bg-[#135e96]' : 'bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black hover:shadow-lg'}`}
          >
            {isSaving ? (
              <>
                <div className={`h-3 w-3 animate-spin rounded-full border-2 border-t-transparent ${L ? 'border-[#2271b1]/30 border-t-[#2271b1]' : 'border-black/30 border-t-black'}`} /> Сохранение
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> {!createdId ? 'Создать' : 'Сохранить'}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className={L ? 'mx-6 my-4 flex flex-shrink-0 items-center gap-2 rounded-sm border border-[#d63638] bg-[#fcf0f1] p-2.5' : 'mx-6 my-4 flex flex-shrink-0 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5'}>
          <AlertCircle className={`h-4 w-4 flex-shrink-0 ${L ? 'text-[#d63638]' : 'text-red-500'}`} />
          <span className={`text-xs ${L ? 'text-[#d63638]' : 'text-red-400'}`}>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-red-500/50 hover:text-red-400">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {success && (
        <div className={L ? 'mx-6 my-4 flex flex-shrink-0 items-center gap-2 rounded-sm border border-[#00a32a] bg-[#edfaef] p-2.5' : 'mx-6 my-4 flex flex-shrink-0 items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-2.5'}>
          <Check className={`h-4 w-4 flex-shrink-0 ${L ? 'text-[#00a32a]' : 'text-green-500'}`} />
          <span className={`text-xs ${L ? 'text-[#00a32a]' : 'text-green-400'}`}>{success}</span>
        </div>
      )}

      <div className="mx-auto flex min-h-0 w-full max-w-[min(1920px,100%)] flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-4 pb-3 pt-2 sm:px-6 xl:flex-row xl:items-stretch xl:gap-6 xl:overflow-hidden xl:pb-4 xl:pt-1 max-[1630px]:flex-wrap">
        {/* Телефон-превью */}
        <div className="order-1 flex min-h-0 w-full flex-col gap-1.5 xl:order-1 xl:h-full xl:max-h-full xl:w-[min(420px,38vw)] xl:min-w-[260px] xl:shrink-0 xl:overflow-hidden max-[1630px]:min-w-1/2">
          <div className={`mx-auto flex w-full min-h-[min(400px,52dvh)] flex-1 flex-col overflow-hidden xl:min-h-0 ${t.phoneOuter}`}>
            <div className={`flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain ${L ? 'bg-[#f6f7f7]' : 'bg-[#0a0a0a]'}`}>
              <div
                className={`relative w-full min-h-[min(280px,48dvh)] flex-1 overflow-hidden sm:min-h-[min(320px,52dvh)] ${L ? 'bg-[#f6f7f7]' : 'bg-black'}`}
              >
                {gallery.length > 0 && gallery[previewIndex] ? (
                  <img src={gallery[previewIndex] as string} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141414] px-6 text-center">
                    <span className={`mb-3 text-[13px] ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Нет фото</span>
                    {!createdId ? (
                      <button
                        type="button"
                        onClick={create}
                        disabled={isSaving}
                        className={`inline-flex max-w-full items-center justify-center gap-2 rounded px-3 py-2.5 text-[12px] font-bold shadow-sm transition-[filter] disabled:opacity-50 ${L ? 'border border-[#2271b1] bg-[#2271b1] text-white hover:bg-[#135e96]' : 'bg-gradient-to-b from-[#e8c547] via-[#d4af37] to-[#b8941f] text-black hover:brightness-105'}`}
                      >
                        {isSaving ? (
                          <div className={`h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent ${L ? 'border-white/30 border-t-white' : 'border-black/25 border-t-black'}`} />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Создать мастера
                      </button>
                    ) : (
                      <span className={`text-[12px] ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Загрузите фото ниже</span>
                    )}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" aria-hidden />
                <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-black/80 px-2 py-1">
                  <div className={`h-1.5 w-1.5 rounded-full ${AVAILABILITY_BADGE[availabilityStatus].color}`} />
                  <span className="pointer-events-none text-[9px] text-white">{AVAILABILITY_BADGE[availabilityStatus].label}</span>
                </div>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[8] p-4 pt-12">
                  <div className="pointer-events-auto">
                    {nameEditing ? (
                      <input
                        autoFocus
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onBlur={() => setNameEditing(false)}
                        className="mb-1 w-full rounded border border-white/25 bg-black/60 px-2 py-1.5 font-display text-xl font-bold text-white outline-none focus:border-[#d4af37]"
                        placeholder="Имя"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNameEditing(true)}
                        className="block max-w-full truncate text-left font-display text-xl font-bold text-white drop-shadow-md hover:opacity-90"
                      >
                        {displayName || 'Имя — нажмите'}
                      </button>
                    )}
                    {priceFrom ? (
                      <span className="mt-1 block text-xs text-white/70">от {Number(priceFrom).toLocaleString('ru-RU')} ₽</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={`shrink-0 border-t px-2 pb-1.5 pt-2 ${L ? 'border-[#dcdcde] bg-[#f6f7f7]' : 'border-white/[0.08] bg-[#0a0a0a]'}`}>
                <div className={`grid grid-cols-4 ${L ? 'gap-px bg-[#dcdcde]' : 'gap-px bg-white/[0.04]'}`}>
                  {gridCells.map((url, idx) => (
                    <div key={url ?? `slot-${idx}`} className={`group relative ${t.phoneThumb}`}>
                      {url ? (
                        <>
                          <button
                            type="button"
                            className="absolute inset-0 z-0 block h-full w-full overflow-hidden p-0"
                            onClick={() => setPreviewIndex(idx)}
                            aria-label={`Показать фото ${idx + 1}`}
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </button>
                          {idx === previewIndex ? (
                            <div className="pointer-events-none absolute inset-0 z-[1] border-2 border-[#d4af37]" aria-hidden />
                          ) : null}
                          {url === mainPhotoUrl ? (
                            <div className={`absolute left-0.5 top-0.5 z-[2] rounded px-1 py-px text-[6px] font-bold uppercase ${L ? 'bg-[#2271b1] text-white' : 'bg-[#d4af37] text-black'}`}>
                              Главн.
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); makeMain(idx); }}
                              className="absolute bottom-0.5 left-0.5 z-[3] rounded-full bg-black/85 p-1 opacity-0 transition-opacity hover:bg-[#d4af37]/90 hover:text-black group-hover:opacity-100"
                              title="Сделать главным фото"
                            >
                              <Star className="h-3 w-3 text-white" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeSlot(idx); }}
                            className="absolute right-0.5 top-0.5 z-[3] rounded-full bg-black/85 p-1 opacity-0 transition-opacity hover:bg-red-600/90 group-hover:opacity-100"
                            aria-label="Удалить фото"
                          >
                            <Trash2 className="h-3 w-3 text-white" />
                          </button>
                        </>
                      ) : (
                        <label
                          className={`flex h-full w-full flex-col items-center justify-center transition-colors ${L ? 'cursor-pointer text-[#646970] hover:bg-[#f0f6fc] hover:text-[#2271b1]' : 'cursor-pointer text-gray-500 hover:bg-white/[0.04] hover:text-[#d4af37]'}`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingSlot !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) void uploadToSlot(file, idx);
                            }}
                          />
                          {uploadingSlot === idx ? (
                            <div className={`h-5 w-5 animate-spin rounded-full border-2 border-t-transparent ${L ? 'border-[#2271b1]/30 border-t-[#2271b1]' : 'border-[#d4af37]/30 border-t-[#d4af37]'}`} />
                          ) : (
                            <>
                              <Upload className="h-3 w-3 opacity-70" />
                              <span className="mt-px text-[7px] font-medium tabular-nums">{idx + 1}</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Форма */}
        <div className="order-2 min-h-0 min-w-0 overflow-y-auto xl:order-2 xl:flex-1 xl:min-h-0 max-[1630px]:min-w-[50%]">
          <div className="space-y-4 pb-6">
            <section className={t.formSection}>
              <h2 className={`mb-4 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>
                Основное
              </h2>
              <div className="space-y-3">
                <div>
                  <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Имя</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={t.inputXs}
                  />
                </div>
                <div>
                  <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>
                    Slug {createdId ? '' : '(необязательно, сгенерируется автоматически)'}
                  </label>
                  {slugEditing || !createdId ? (
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      onBlur={() => setSlugEditing(false)}
                      placeholder="master-name"
                      className={`${t.inputXs} font-mono`}
                    />
                  ) : (
                    <button type="button" onClick={() => setSlugEditing(true)} className={`block w-full truncate rounded border px-2.5 py-2 text-left font-mono text-xs ${L ? 'border-[#8c8f94] bg-white text-[#2c3338]' : 'border-white/[0.08] bg-[#0a0a0a] text-white'}`}>
                      {slug || '—'}
                    </button>
                  )}
                </div>
                <div>
                  <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Описание</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className={t.textareaXs}
                    placeholder="Расскажите о мастере…"
                  />
                </div>
                <div>
                  <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Цена от (₽)</label>
                  <NumberStepperInput
                    value={priceFrom ? Number(priceFrom) : undefined}
                    onChange={(v) => setPriceFrom(v ? String(v) : '')}
                    min={0}
                    max={1_000_000}
                    step={100}
                    placeholder="8000"
                    light={L}
                  />
                </div>
              </div>
            </section>

            <section className={t.formSection}>
              <h2 className={`mb-4 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>
                Настройки
              </h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Статус доступности</label>
                  <SelectDropdown
                    value={availabilityStatus}
                    onChange={(v) => setAvailabilityStatus(v as 'available' | 'busy' | 'unavailable')}
                    options={AVAILABILITY_OPTIONS}
                    light={L}
                  />
                </div>
                <div className={`flex items-center justify-between rounded-lg border p-3 ${L ? 'border-[#dcdcde] bg-white' : 'border-white/[0.06] bg-[#0a0a0a]'}`}>
                  <span className={`text-xs font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>Популярный мастер</span>
                  <Switch checked={isPopular} onChange={setIsPopular} light={L} ariaLabel="Популярный мастер" />
                </div>
                <div className={`flex items-center justify-between rounded-lg border p-3 ${L ? 'border-[#dcdcde] bg-white' : 'border-white/[0.06] bg-[#0a0a0a]'}`}>
                  <span className={`text-xs font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>Опубликован (виден в каталоге)</span>
                  <Switch checked={isPublished} onChange={setIsPublished} light={L} ariaLabel="Опубликован" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
