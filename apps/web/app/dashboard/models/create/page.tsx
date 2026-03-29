/**
 * Create Model Profile Page — тот же интерфейс, что на редактировании
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProfileSchema, type CreateProfileInput } from '@/lib/validations';
import {
  ArrowLeft,
  Upload,
  X,
  Check,
  AlertCircle,
  Ruler,
  Weight,
  User,
  ExternalLink,
  Trash2,
  Send,
  FileEdit,
} from 'lucide-react';
import Link from 'next/link';
import { useUnsavedWarning } from '@/lib/useUnsavedWarning';
import { api, resolveUploadMimeType, type Profile } from '@/lib/api-client';
import { apiUrl } from '@/lib/api-url';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { RippleSurface } from '@/components/RippleSurface';

interface ModelProfile {
  id: string;
  displayName: string;
  slug: string;
  biography?: string;
  verificationStatus: string;
  eliteStatus: boolean;
  isPublished: boolean;
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
  availabilityStatus?: string;
  rateHourly?: number;
  rateOvernight?: number;
  mainPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface GalleryPhoto {
  id: string;
  url: string;
}

function buildUpdateBody(data: CreateProfileInput, publishMode?: 'draft' | 'publish') {
  const cleanedData: any = { displayName: data.displayName?.trim() || '' };
  if (data.slug?.trim()) cleanedData.slug = data.slug.trim();
  if (data.biography?.trim()) cleanedData.biography = data.biography.trim();
  if (publishMode === 'draft') cleanedData.isPublished = false;
  if (publishMode === 'publish') cleanedData.isPublished = true;
  const attrs: any = {};
  if (data.physicalAttributes) {
    const p = data.physicalAttributes;
    if (p.age && p.age > 0) attrs.age = p.age;
    if (p.height && p.height > 0) attrs.height = p.height;
    if (p.weight && p.weight > 0) attrs.weight = p.weight;
    if (p.bustSize && p.bustSize > 0) attrs.bustSize = p.bustSize;
    if (p.bustType) attrs.bustType = p.bustType;
    if (p.bodyType) attrs.bodyType = p.bodyType;
    if (p.temperament) attrs.temperament = p.temperament;
    if (p.sexuality) attrs.sexuality = p.sexuality;
    if (p.hairColor?.trim()) attrs.hairColor = p.hairColor.trim();
    if (p.eyeColor?.trim()) attrs.eyeColor = p.eyeColor.trim();
    if (p.city?.trim()) attrs.city = p.city.trim();
  }
  if (Object.keys(attrs).length > 0) cleanedData.physicalAttributes = attrs;
  if (data.rateHourly && data.rateHourly > 0) cleanedData.rateHourly = data.rateHourly;
  if (data.rateOvernight && data.rateOvernight > 0) cleanedData.rateOvernight = data.rateOvernight;
  return cleanedData;
}

export default function CreateModelPage() {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [model, setModel] = useState<ModelProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mainPhoto, setMainPhoto] = useState('');
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [uploadingCell, setUploadingCell] = useState<number | null>(null);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const previewGalleryInitRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty, errors },
  } = useForm<CreateProfileInput>({
    mode: 'onSubmit',
    resolver: zodResolver(createProfileSchema) as any,
    shouldUnregister: false,
    defaultValues: {
      displayName: 'Новая модель',
      slug: '',
      biography: '',
      physicalAttributes: {
        age: 22,
        height: 168,
        weight: 52,
        bustSize: 2,
        bustType: 'natural',
        bodyType: 'slim',
        temperament: 'gentle',
        city: 'Москва',
      },
    },
  });

  const [cardEdit, setCardEdit] = useState<null | 'name' | 'age' | 'height' | 'weight'>(null);
  const [slugEditing, setSlugEditing] = useState(false);
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';

  useUnsavedWarning(isDirty);
  const formData = watch();

  useEffect(() => {
    if (slugEditing) slugInputRef.current?.focus();
  }, [slugEditing]);

  useEffect(() => {
    previewGalleryInitRef.current = false;
  }, [createdId]);

  const refreshModel = useCallback(async (id: string): Promise<ModelProfile | null> => {
    try {
      const response = await fetch(apiUrl(`/models/id/${id}`));
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setModel(data);
          return data;
        }
      }
    } catch {
      /* non-critical */
    }
    return null;
  }, []);

  function profileToModel(p: Profile, overrides?: Partial<ModelProfile>): ModelProfile {
    const rates = p as Profile & { rateHourly?: unknown; rateOvernight?: unknown };
    return {
      id: p.id,
      displayName: p.displayName,
      slug: p.slug,
      biography: p.biography,
      verificationStatus: p.verificationStatus,
      eliteStatus: p.eliteStatus,
      isPublished: p.isPublished,
      physicalAttributes: p.physicalAttributes as ModelProfile['physicalAttributes'],
      rateHourly: rates.rateHourly != null ? Number(rates.rateHourly) : undefined,
      rateOvernight: rates.rateOvernight != null ? Number(rates.rateOvernight) : undefined,
      mainPhotoUrl: p.mainPhotoUrl,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      availabilityStatus: 'online',
      ...overrides,
    };
  }

  const loadMedia = useCallback(async (profileMainPhotoUrl?: string | null) => {
    if (!createdId) return;
    try {
      const media = await api.getProfileMedia(createdId);
      const withUrl = media.filter((m: any) => m.cdnUrl && String(m.cdnUrl).trim().length > 0);
      const sorted = [...withUrl].sort(
        (a: any, b: any) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0),
      );
      let list: GalleryPhoto[] = sorted.map((m: any) => ({ id: m.id, url: m.cdnUrl as string }));
      const seen = new Set(list.map((p) => p.url));
      const main =
        profileMainPhotoUrl !== undefined
          ? (profileMainPhotoUrl && String(profileMainPhotoUrl).trim()) || ''
          : (mainPhoto && String(mainPhoto).trim()) || '';
      if (main && !seen.has(main)) {
        list = [{ id: '__profile_main__', url: main }, ...list];
      }
      setGallery(list);
    } catch {
      /* non-critical */
    }
  }, [createdId, mainPhoto]);

  useEffect(() => {
    if (createdId) loadMedia();
  }, [createdId, loadMedia]);

  const uploadPhoto = useCallback(
    async (file: File, cellIndex: number) => {
      if (!createdId) return;
      setUploadingCell(cellIndex);
      setError(null);
      try {
        const mimeType = resolveUploadMimeType(file);
        const { uploadUrl, cdnUrl, mediaId } = await api.generatePresignedUrl({
          fileName: file.name,
          mimeType: mimeType as any,
          fileSize: file.size,
          modelId: createdId,
        });
        await api.uploadToMinIO(uploadUrl, file, mimeType);
        await api.confirmUpload(mediaId, {
          cdnUrl,
          modelId: createdId,
          metadata: { originalName: file.name },
        });

        if (gallery.length === 0 && !mainPhoto) {
          await api.setMainPhoto(mediaId, createdId);
          setMainPhoto(cdnUrl);
        }
        await loadMedia();
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки');
      } finally {
        setUploadingCell(null);
      }
    },
    [createdId, gallery.length, mainPhoto, loadMedia],
  );

  const deletePhoto = useCallback(
    async (mediaId: string) => {
      if (!createdId) return;
      try {
        if (mediaId === '__profile_main__') {
          const token = localStorage.getItem('accessToken');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers.Authorization = `Bearer ${token.replace(/^"|"$/g, '')}`;
          const response = await fetch(apiUrl(`/models/${createdId}`), {
            method: 'PUT',
            headers,
            body: JSON.stringify({ mainPhotoUrl: '' }),
          });
          if (!response.ok) {
            const e = await response.json().catch(() => ({}));
            throw new Error(e.message || 'Не удалось сбросить главное фото');
          }
          setMainPhoto('');
          await loadMedia(null);
          return;
        }
        await api.deleteMedia(mediaId);
        await loadMedia();
        const resp = await fetch(apiUrl(`/models/id/${createdId}`));
        if (resp.ok) {
          const fresh = await resp.json();
          setMainPhoto(fresh?.mainPhotoUrl || '');
          await loadMedia(fresh?.mainPhotoUrl != null ? fresh.mainPhotoUrl : null);
        }
      } catch (err: any) {
        setError(err.message || 'Ошибка удаления');
      }
    },
    [createdId, loadMedia],
  );

  async function putModel(id: string, body: Record<string, unknown>) {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token.replace(/^"|"$/g, '')}`;
    const response = await fetch(apiUrl(`/models/${id}`), {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.message || 'Ошибка');
    }
    return response.json();
  }

  function buildCreatePayload(data: CreateProfileInput) {
    const payload: any = { displayName: data.displayName?.trim() || '' };
    if (data.slug?.trim()) payload.slug = data.slug.trim();
    if (data.biography?.trim()) payload.biography = data.biography.trim();
    const attrs: any = {};
    if (data.physicalAttributes) {
      const p = data.physicalAttributes;
      if (p.age && p.age > 0) attrs.age = Number(p.age);
      if (p.height && p.height > 0) attrs.height = Number(p.height);
      if (p.weight && p.weight > 0) attrs.weight = Number(p.weight);
      if (p.bustSize && p.bustSize > 0) attrs.bustSize = Number(p.bustSize);
      if (p.bustType) attrs.bustType = p.bustType;
      if (p.bodyType) attrs.bodyType = p.bodyType;
      if (p.temperament) attrs.temperament = p.temperament;
      if (p.sexuality) attrs.sexuality = p.sexuality;
      if ((p as any).hairColor?.trim()) attrs.hairColor = (p as any).hairColor.trim();
      if ((p as any).eyeColor?.trim()) attrs.eyeColor = (p as any).eyeColor.trim();
      if ((p as any).city?.trim()) attrs.city = (p as any).city.trim();
    }
    if (Object.keys(attrs).length > 0) payload.physicalAttributes = attrs;
    if (data.rateHourly && Number(data.rateHourly) > 0) payload.rateHourly = Number(data.rateHourly);
    if (data.rateOvernight && Number(data.rateOvernight) > 0)
      payload.rateOvernight = Number(data.rateOvernight);
    return payload;
  }

  const saveModel = async (data: CreateProfileInput, publishMode?: 'draft' | 'publish') => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!createdId) {
        const profile: Profile = await api.createProfile(buildCreatePayload(data));
        setCreatedId(profile.id);
        setValue('slug', profile.slug || '');
        if (profile.mainPhotoUrl) setMainPhoto(profile.mainPhotoUrl);

        if (publishMode === 'draft') {
          const saved = await putModel(profile.id, { isPublished: false });
          const full = await refreshModel(profile.id);
          if (!full) {
            setModel(
              profileToModel(profile, {
                isPublished: false,
                updatedAt: saved?.updatedAt ?? profile.updatedAt,
              }),
            );
          }
        } else {
          const full = await refreshModel(profile.id);
          if (!full) setModel(profileToModel(profile));
        }

        if (publishMode === 'draft') {
          setSuccess('Черновик сохранён');
        } else if (publishMode === 'publish') {
          setSuccess('Опубликовано');
        } else {
          setSuccess('Модель создана');
        }
        setTimeout(() => setSuccess(null), 3000);
        return;
      }

      const cleanedData = buildUpdateBody(data, publishMode);
      const saved = await putModel(createdId, cleanedData);
      if (saved && typeof saved.isPublished === 'boolean') {
        setModel((m) =>
          m ? { ...m, isPublished: saved.isPublished, updatedAt: saved.updatedAt ?? m.updatedAt } : m,
        );
      }
      await refreshModel(createdId);
      setSuccess(
        publishMode === 'publish'
          ? 'Опубликовано'
          : publishMode === 'draft'
            ? 'Черновик сохранён'
            : 'Изменения сохранены',
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка');
    } finally {
      setIsSaving(false);
    }
  };

  const GRID_SLOTS = 9;
  const gridCells = Array.from({ length: GRID_SLOTS }, (_, i) => gallery[i] || null);
  const galleryKey = gallery.map((g) => g.id).join('|');
  const previewSlides =
    gallery.length > 0
      ? gallery
      : mainPhoto
        ? [{ id: '__main-fallback__', url: mainPhoto }]
        : [];
  const previewSlideCount = previewSlides.length;

  useEffect(() => {
    setPreviewPhotoIndex((i) => {
      if (previewSlideCount === 0) return 0;
      return Math.min(i, previewSlideCount - 1);
    });
  }, [galleryKey, previewSlideCount]);

  useEffect(() => {
    if (gallery.length === 0 || previewGalleryInitRef.current) return;
    const idx = gallery.findIndex((p) => p.url === mainPhoto);
    setPreviewPhotoIndex(idx >= 0 ? idx : 0);
    previewGalleryInitRef.current = true;
  }, [galleryKey, mainPhoto, gallery.length]);

  const slugVal = formData.slug || model?.slug || '';
  const updatedLabel = model?.updatedAt
    ? new Date(model.updatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  const onSaveDraft = handleSubmit((d) => saveModel(d, 'draft'));
  const onSavePublish = handleSubmit((d) => saveModel(d, 'publish'));

  const crumbName = (formData.displayName || model?.displayName || '').trim() || 'Новая модель';
  const slugReg = register('slug');

  const availabilityOnline = model?.availabilityStatus === 'online';

  return (
    <div className={`-m-4 flex min-h-0 w-full flex-1 flex-col overflow-hidden font-body lg:-m-6 lg:-mr-8 ${t.page}`}>
      <div className={t.topBarModel}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/dashboard/models/list"
            className={`shrink-0 rounded-lg p-2 transition-colors ${L ? 'text-[#646970] hover:bg-[#f0f0f1] hover:text-[#1d2327]' : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'}`}
            aria-label="Назад к списку"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs sm:text-sm" aria-label="Хлебные крошки">
            <Link href="/dashboard" className={`shrink-0 font-display transition-colors ${L ? 'text-[#646970] hover:text-[#2271b1]' : 'text-zinc-500 hover:text-[#d4af37]'}`}>
              Дэшборд
            </Link>
            <span className={`shrink-0 px-1 font-display font-bold ${L ? 'text-[#a7aaad]' : 'text-zinc-700'}`} aria-hidden>
              /
            </span>
            <Link href="/dashboard/models/list" className={`shrink-0 font-display transition-colors ${L ? 'text-[#646970] hover:text-[#2271b1]' : 'text-zinc-500 hover:text-[#d4af37]'}`}>
              Модели
            </Link>
            <span className={`shrink-0 px-1 font-display font-bold ${L ? 'text-[#a7aaad]' : 'text-zinc-700'}`} aria-hidden>
              /
            </span>
            <span className={`min-w-0 truncate font-display ${L ? 'text-[#1d2327]' : 'text-zinc-300'}`} title={crumbName}>
              {crumbName}
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {createdId && slugVal ? (
            <a
              href={`/models/${slugVal}`}
              target="_blank"
              rel="noopener noreferrer"
              className={L ? `${t.btnSecondary} px-3 py-1.5 text-xs` : 'flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-[#d4af37]/50 hover:text-white'}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Предпросмотр
            </a>
          ) : (
            <span className={`flex cursor-not-allowed items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${L ? 'border-[#dcdcde] text-[#a7aaad]' : 'border-white/[0.04] text-gray-600'}`}>
              <ExternalLink className="h-3.5 w-3.5" /> Предпросмотр
            </span>
          )}
          <button
            type="submit"
            form="create-model-form"
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${L ? 'border border-[#2271b1] bg-[#2271b1] text-white hover:bg-[#135e96]' : 'bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black hover:shadow-lg'}`}
          >
            {isSaving ? (
              <>
                <div className={`h-3 w-3 animate-spin rounded-full border-2 border-t-transparent ${L ? 'border-[#2271b1]/30 border-t-[#2271b1]' : 'border-black/30 border-t-black'}`} /> Сохранение
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> {createdId ? 'Сохранить' : 'Создать'}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className={L ? 'mx-6 mt-2 flex flex-shrink-0 items-center gap-2 rounded-sm border border-[#d63638] bg-[#fcf0f1] p-2.5' : 'mx-6 mt-2 flex flex-shrink-0 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5'}>
          <AlertCircle className={`h-4 w-4 flex-shrink-0 ${L ? 'text-[#d63638]' : 'text-red-500'}`} />
          <span className={`text-xs ${L ? 'text-[#d63638]' : 'text-red-400'}`}>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-red-500/50 hover:text-red-400">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {success && (
        <div className={L ? 'mx-6 mt-2 flex flex-shrink-0 items-center gap-2 rounded-sm border border-[#00a32a] bg-[#edfaef] p-2.5' : 'mx-6 mt-2 flex flex-shrink-0 items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-2.5'}>
          <Check className={`h-4 w-4 flex-shrink-0 ${L ? 'text-[#00a32a]' : 'text-green-500'}`} />
          <span className={`text-xs ${L ? 'text-[#00a32a]' : 'text-green-400'}`}>{success}</span>
        </div>
      )}

      <div className="mx-auto flex min-h-0 w-full max-w-[min(1920px,100%)] flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-4 pb-3 pt-2 sm:px-6 xl:flex-row xl:items-stretch xl:gap-6 xl:overflow-hidden xl:pb-4 xl:pt-1">
        <div className="order-1 flex min-h-0 w-full flex-col gap-1.5 xl:order-1 xl:h-full xl:max-h-full xl:w-[min(420px,38vw)] xl:min-w-[260px] xl:shrink-0 xl:overflow-hidden">
          <div
            className={`mx-auto flex w-full min-h-[min(400px,52dvh)] flex-1 flex-col overflow-hidden xl:min-h-0 ${t.phoneOuter}`}
          >
            <div
              className={`flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain ${L ? 'bg-[#f6f7f7]' : 'bg-[#0a0a0a]'}`}
            >
              <div
                className={`phone-mockup-status-bar grid flex-shrink-0 grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-2 px-3 py-2.5 backdrop-blur-lg ${
                  L ? 'border-b border-[#dcdcde] bg-white/95' : 'border-b border-white/[0.06] bg-[#0a0a0a]/90'
                }`}
                aria-label="Статус-бар мокапа"
              >
                <span className="min-w-0" aria-hidden />
                <div className="flex min-w-0 justify-center justify-self-center">
                  <div
                    className={`inline-flex max-w-[min(240px,72vw)] items-center gap-1.5 rounded-full border-2 px-3 py-1 ${
                      L
                        ? 'border-[#d4af37]/45 bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
                        : 'border-[#d4af37]/40 bg-black/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                    }`}
                  >
                    <span
                      className={`shrink-0 text-[10px] font-medium tracking-wide ${
                        L ? 'text-[#b8941f]' : 'text-[#d4af37]/65'
                      }`}
                    >
                      slug
                    </span>
                    {slugEditing ? (
                      <input
                        id="create-slug"
                        form="create-model-form"
                        {...slugReg}
                        ref={(el) => {
                          slugReg.ref(el);
                          slugInputRef.current = el;
                        }}
                        onBlur={(e) => {
                          slugReg.onBlur(e);
                          setSlugEditing(false);
                        }}
                        className={`min-w-0 max-w-[min(180px,50vw)] flex-1 border-0 bg-transparent py-0.5 font-mono text-[12px] outline-none ring-0 focus:ring-0 ${
                          L
                            ? 'text-[#1d2327] placeholder:text-[#a7aaad]'
                            : 'text-white placeholder:text-white/30'
                        }`}
                        placeholder="anna-moscow"
                        title="Публичный адрес"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSlugEditing(true)}
                        className={`min-w-0 max-w-[min(180px,50vw)] truncate text-left font-mono text-[12px] font-semibold ${
                          L
                            ? 'text-[#1d2327] hover:text-[#2271b1]'
                            : 'text-white hover:text-[#d4af37]/90'
                        }`}
                      >
                        {slugVal.trim()
                          ? slugVal.trim()
                          : createdId
                            ? '…'
                            : 'адрес…'}
                      </button>
                    )}
                  </div>
                </div>
                <span
                  className={`min-w-0 justify-self-end font-body text-[10px] tabular-nums ${L ? 'text-[#646970]' : 'text-white/30'}`}
                >
                  {previewSlideCount > 0 ? `${previewPhotoIndex + 1}/${previewSlideCount}` : '—'}
                </span>
              </div>

              <div
                className={`relative w-full min-h-[min(280px,48dvh)] flex-1 overflow-hidden sm:min-h-[min(320px,52dvh)] ${L ? 'bg-[#f6f7f7]' : 'bg-black'}`}
              >
                {previewSlides.length > 0 ? (
                  <RippleSurface
                    images={previewSlides.map((p) => p.url)}
                    currentIndex={previewPhotoIndex}
                    onIndexChange={setPreviewPhotoIndex}
                    className="absolute inset-0 h-full min-h-[inherit] w-full"
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
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141414]">
                    <User className={`mb-3 h-14 w-14 ${L ? 'text-[#a7aaad]' : 'text-gray-600'}`} />
                    <span className={`text-[13px] ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Нет главного фото</span>
                  </div>
                )}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                  aria-hidden
                />
                <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-black/80 px-2 py-1">
                  <div className={`h-1.5 w-1.5 rounded-full ${availabilityOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="pointer-events-none text-[9px] text-white">
                    {availabilityOnline ? 'Свободна' : 'Оффлайн'}
                  </span>
                </div>
                <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-10 p-4 pt-12">
                  {cardEdit === 'name' ? (
                    <input
                      autoFocus
                      form="create-model-form"
                      {...register('displayName')}
                      onBlur={() => setCardEdit(null)}
                      className="mb-1 w-full rounded border border-white/25 bg-black/60 px-2 py-1.5 font-display text-xl font-bold text-white outline-none focus:border-[#d4af37]"
                      placeholder="Имя"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCardEdit('name')}
                      className="block max-w-full truncate text-left font-display text-xl font-bold text-white drop-shadow-md hover:opacity-90"
                    >
                      {formData.displayName || 'Имя — нажмите'}
                    </button>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-body text-xs text-white/50">
                    {cardEdit === 'age' ? (
                      <input
                        autoFocus
                        form="create-model-form"
                        type="number"
                        min={18}
                        max={99}
                        {...register('physicalAttributes.age', { valueAsNumber: true })}
                        onBlur={() => setCardEdit(null)}
                        className="w-16 rounded border border-white/25 bg-black/50 px-1.5 py-0.5 text-[11px] text-white outline-none focus:border-[#d4af37]"
                      />
                    ) : (
                      <button type="button" onClick={() => setCardEdit('age')} className="text-left hover:opacity-90">
                        Возраст:{' '}
                        <span className="text-white/80">
                          {formData.physicalAttributes?.age != null && Number(formData.physicalAttributes.age) > 0
                            ? formData.physicalAttributes.age
                            : '—'}
                        </span>
                      </button>
                    )}
                    {cardEdit === 'height' ? (
                      <input
                        autoFocus
                        form="create-model-form"
                        type="number"
                        min={140}
                        max={220}
                        {...register('physicalAttributes.height', { valueAsNumber: true })}
                        onBlur={() => setCardEdit(null)}
                        className="w-16 rounded border border-white/25 bg-black/50 px-1.5 py-0.5 text-[11px] text-white outline-none focus:border-[#d4af37]"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCardEdit('height')}
                        className="inline-flex items-center gap-1 text-left hover:opacity-90"
                      >
                        <Ruler className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
                        <span className="text-white/80">{formData.physicalAttributes?.height || '—'} см</span>
                      </button>
                    )}
                    {cardEdit === 'weight' ? (
                      <input
                        autoFocus
                        form="create-model-form"
                        type="number"
                        min={35}
                        max={150}
                        {...register('physicalAttributes.weight', { valueAsNumber: true })}
                        onBlur={() => setCardEdit(null)}
                        className="w-16 rounded border border-white/25 bg-black/50 px-1.5 py-0.5 text-[11px] text-white outline-none focus:border-[#d4af37]"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCardEdit('weight')}
                        className="inline-flex items-center gap-1 text-left hover:opacity-90"
                      >
                        <Weight className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
                        <span className="text-white/80">{formData.physicalAttributes?.weight || '—'} кг</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {(formData.rateHourly || formData.rateOvernight) && (
                <div className={t.phoneRatesBar}>
                  <div className="flex gap-4">
                    {formData.rateHourly ? (
                      <div>
                        <div className={`text-[8px] ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Час</div>
                        <div className={`text-xs font-bold ${accent}`}>{formData.rateHourly} ₽</div>
                      </div>
                    ) : null}
                    {formData.rateOvernight ? (
                      <div>
                        <div className={`text-[8px] ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Ночь</div>
                        <div className={`text-xs font-bold ${accent}`}>{formData.rateOvernight} ₽</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className={`shrink-0 border-t px-2 pb-1.5 pt-2 ${L ? 'border-[#dcdcde] bg-[#f6f7f7]' : 'border-white/[0.08] bg-[#0a0a0a]'}`}>
                <div className={`grid grid-cols-3 ${L ? 'gap-px bg-[#dcdcde]' : 'gap-px bg-white/[0.04]'}`}>
                  {gridCells.map((photo, idx) => (
                    <div key={photo?.id ?? `slot-${idx}`} className={`group relative ${t.phoneThumb}`}>
                      {photo ? (
                        <>
                          <button
                            type="button"
                            className="absolute inset-0 z-0 block h-full w-full overflow-hidden p-0"
                            onClick={() => setPreviewPhotoIndex(idx)}
                            aria-label={`Показать фото ${idx + 1}`}
                          >
                            <img src={photo.url} alt="" className="h-full w-full object-cover" />
                          </button>
                          {idx === previewPhotoIndex ? (
                            <div
                              className="pointer-events-none absolute inset-0 z-[1] border-2 border-[#d4af37]"
                              aria-hidden
                            />
                          ) : null}
                          {photo.url === mainPhoto ? (
                            <div
                              className={`absolute left-0.5 top-0.5 z-[2] rounded px-1 py-px text-[6px] font-bold uppercase ${L ? 'bg-[#2271b1] text-white' : 'bg-[#d4af37] text-black'}`}
                            >
                              Главн.
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePhoto(photo.id);
                            }}
                            className="absolute right-0.5 top-0.5 z-[3] rounded-full bg-black/85 p-1 opacity-0 transition-opacity hover:bg-red-600/90 group-hover:opacity-100 group-focus-within:opacity-100"
                            aria-label="Удалить фото"
                          >
                            <Trash2 className="h-3 w-3 text-white" />
                          </button>
                        </>
                      ) : (
                        <label
                          className={`flex h-full w-full flex-col items-center justify-center transition-colors ${
                            createdId
                              ? L
                                ? 'cursor-pointer text-[#646970] hover:bg-[#f0f6fc] hover:text-[#2271b1]'
                                : 'cursor-pointer text-gray-500 hover:bg-white/[0.04] hover:text-[#d4af37]'
                              : 'cursor-not-allowed opacity-50'
                          }`}
                        >
                          {uploadingCell === idx ? (
                            <div className={`h-5 w-5 animate-spin rounded-full border-2 border-t-transparent ${L ? 'border-[#2271b1]/30 border-t-[#2271b1]' : 'border-[#d4af37]/30 border-t-[#d4af37]'}`} />
                          ) : (
                            <>
                              <Upload className="h-3 w-3 opacity-70" />
                              <span className="mt-px text-[7px] font-medium tabular-nums">{idx + 1}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            ref={(el) => {
                              fileRefs.current[idx] = el;
                            }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadPhoto(f, idx);
                              e.target.value = '';
                            }}
                            disabled={!createdId || uploadingCell !== null}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
                {!createdId ? (
                  <p className={`mt-1.5 text-[9px] ${L ? 'text-[#646970]' : 'text-gray-600'}`}>Сохраните карточку, чтобы загрузить фото</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="order-2 min-h-0 min-w-0 overflow-y-auto xl:order-2 xl:flex-1 xl:min-h-0">
          <form id="create-model-form" onSubmit={handleSubmit((d) => saveModel(d))} className="space-y-4 pb-6">
            <section className={t.formSection}>
              <h2 className={`mb-4 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>
                Биография
              </h2>
              {errors.displayName && (
                <p className="mb-2 text-[10px] text-red-400">{errors.displayName.message}</p>
              )}
              <textarea
                {...register('biography')}
                rows={5}
                className={t.textareaXs}
                placeholder="Расскажите о себе…"
              />
            </section>

            <section className={t.formSection}>
              <h2 className={`mb-4 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>
                Параметры
              </h2>
              <p className={`mb-3 text-[10px] leading-relaxed ${L ? 'text-[#646970]' : 'text-gray-600'}`}>
                Имя, возраст, рост и вес — в мокапе телефона выше (на широком экране — слева).
              </p>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Грудь</label>
                    <input
                      {...register('physicalAttributes.bustSize')}
                      type="number"
                      className={t.inputXs}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Тип</label>
                    <select
                      {...register('physicalAttributes.bustType')}
                      className={t.inputXs}
                    >
                      <option value="">-</option>
                      <option value="natural">Нат</option>
                      <option value="silicone">Сил</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Фигура</label>
                    <select
                      {...register('physicalAttributes.bodyType')}
                      className={t.inputXs}
                    >
                      <option value="">-</option>
                      <option value="slim">Стройная</option>
                      <option value="fit">Спортивная</option>
                      <option value="curvy">Пышная</option>
                    </select>
                  </div>
                  <div>
                    <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Темперамент</label>
                    <select
                      {...register('physicalAttributes.temperament')}
                      className={t.inputXs}
                    >
                      <option value="">-</option>
                      <option value="gentle">Нежный</option>
                      <option value="active">Активный</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Волосы</label>
                    <input
                      {...register('physicalAttributes.hairColor')}
                      className={t.inputXs}
                      placeholder="Брюнет"
                    />
                  </div>
                  <div>
                    <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Глаза</label>
                    <input
                      {...register('physicalAttributes.eyeColor')}
                      className={t.inputXs}
                      placeholder="Карие"
                    />
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        <div className="order-3 flex w-full shrink-0 flex-col gap-4 xl:order-3 xl:w-[280px] xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
          <section className={t.publishBox}>
            <h2 className={`${t.sectionTitleBar}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>
              Публикация
            </h2>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className={`text-[10px] uppercase tracking-wide ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Статус</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  !model
                    ? 'bg-zinc-600/20 text-zinc-400'
                    : model.isPublished
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {!model ? 'Новая' : model.isPublished ? 'Опубликовано' : 'Черновик'}
              </span>
            </div>
            <p className={`mb-4 text-[10px] leading-relaxed ${L ? 'text-[#646970]' : 'text-gray-500'}`}>
              <span className={L ? 'text-[#50575e]' : 'text-gray-600'}>Изменено:</span> {updatedLabel}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onSaveDraft()}
                className={t.btnSecondary + ' w-full py-2.5 text-[12px]'}
              >
                <FileEdit className={`h-3.5 w-3.5 ${L ? 'text-[#646970]' : 'text-gray-400'}`} />
                Сохранить черновик
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onSavePublish()}
                className={`flex w-full items-center justify-center gap-2 rounded px-3 py-2.5 text-[12px] font-bold shadow-sm transition-[filter] disabled:opacity-50 ${
                  L ? 'border border-[#2271b1] bg-[#2271b1] text-white hover:bg-[#135e96]' : 'bg-gradient-to-b from-[#e8c547] via-[#d4af37] to-[#b8941f] text-black hover:brightness-105'
                }`}
              >
                {isSaving ? (
                  <div className={`h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent ${L ? 'border-white/30 border-t-white' : 'border-black/25 border-t-black'}`} />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Опубликовать
              </button>
            </div>
          </section>

          <section className={t.formSection}>
            <h2 className={`mb-4 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>
              Расценки
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Час (₽)</label>
                <input
                  {...register('rateHourly')}
                  type="number"
                  form="create-model-form"
                  className={t.inputXs}
                  placeholder="5000"
                />
              </div>
              <div>
                <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Ночь (₽)</label>
                <input
                  {...register('rateOvernight')}
                  type="number"
                  form="create-model-form"
                  className={t.inputXs}
                  placeholder="25000"
                />
              </div>
            </div>
            <div className={`mt-3 flex items-center justify-between border-t pt-3 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
              <span className={`text-[9px] ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Итого:</span>
              <span className={`text-sm font-bold ${accent}`}>
                {(Number(formData.rateHourly) || 0) + (Number(formData.rateOvernight) || 0)} ₽
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
