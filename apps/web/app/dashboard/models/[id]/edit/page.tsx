/**
 * Edit Model Profile Page
 * Phone mockup + 6×6 upload grid + form fields
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
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

  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import { useUnsavedWarning } from '@/lib/useUnsavedWarning';
import { api, resolveUploadMimeType } from '@/lib/api-client';
import { apiUrl } from '@/lib/api-url';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { useAuth } from '@/components/AuthProvider';
import { ModelProfileMediaModal } from '@/components/ModelProfileMediaModal';
import { resolveHeroSliderTypography, type HeroSliderTypography } from '@/lib/hero-slider-typography';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ModelProfile {
  id: string;
  displayName: string;
  slug: string;
  biography?: string;
  verificationStatus: string;
  eliteStatus: boolean;
  isPublished: boolean;
  physicalAttributes?: {
    age?: number; height?: number; weight?: number; bustSize?: number;
    bustType?: string; bodyType?: string; temperament?: string; sexuality?: string;
    hairColor?: string; eyeColor?: string; city?: string;
  };
  availabilityStatus?: string;
  rateHourly?: number;
  rateOvernight?: number;
  contactTelegram?: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  mainPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
  heroSliderTypography?: HeroSliderTypography | null;
}

interface GalleryPhoto { id: string; url: string; isPublicVisible?: boolean; createdAt?: string; }

interface ModelReviewRow {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | null;
}

export default function EditModelPage() {
  const params = useParams();
  const modelId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [model, setModel] = useState<ModelProfile | null>(null);
  const [mainPhoto, setMainPhoto] = useState('');
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [fullMedia, setFullMedia] = useState<any[]>([]);
  const [gallery2Open, setGallery2Open] = useState(false);
  const [gallery3Open, setGallery3Open] = useState(false);
  const [galleryLoadError, setGalleryLoadError] = useState<string | null>(null);
  const [uploadingCell, setUploadingCell] = useState<number | null>(null);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);
  const [modelReviews, setModelReviews] = useState<ModelReviewRow[]>([]);
  const [reviewsHint, setReviewsHint] = useState<string | null>(null);
  const { loading: authLoading } = useAuth();
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalSlot, setMediaModalSlot] = useState(0);
  const previewGalleryInitRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<CreateProfileInput>({
    mode: 'onSubmit',
    resolver: zodResolver(createProfileSchema) as any,
    shouldUnregister: false,
  });

  const [cardEdit, setCardEdit] = useState<null | 'name' | 'age' | 'height' | 'weight'>(null);
  const [slugEditing, setSlugEditing] = useState(false);
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';

  useUnsavedWarning(isDirty);
  const formData = watch();
  const heroTy = useMemo(
    () => resolveHeroSliderTypography(model?.heroSliderTypography ?? null),
    [model?.heroSliderTypography],
  );

  useEffect(() => {
    loadModel();
  }, [modelId]);

  useEffect(() => {
    previewGalleryInitRef.current = false;
  }, [modelId]);

  useEffect(() => {
    if (slugEditing) slugInputRef.current?.focus();
  }, [slugEditing]);

  useEffect(() => {
    if (!modelId || authLoading) return;
    let cancelled = false;
    setReviewsHint(null);
    api
      .getModelReviews(modelId, 100)
      .then((data) => {
        if (cancelled) return;
        if (data?.accessMode === 'list' && Array.isArray(data.reviews)) {
          setModelReviews(data.reviews as ModelReviewRow[]);
          setReviewsHint(null);
          return;
        }
        if (data?.accessMode === 'summary') {
          setModelReviews([]);
          setReviewsHint(
            `По тарифу доступна только сводка: ${data.averageRating} / 5, отзывов: ${data.totalReviews}.`,
          );
          return;
        }
        setModelReviews([]);
        setReviewsHint('Отзывы недоступны (войдите снова или проверьте роль / привязку менеджера к анкете).');
      })
      .catch(() => {
        if (!cancelled) {
          setModelReviews([]);
          setReviewsHint('Не удалось загрузить отзывы.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [modelId, authLoading]);

  const loadModel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/models/id/${modelId}`));
      if (!response.ok) throw new Error('Модель не найдена');
      const data = await response.json();
      if (!data) throw new Error('Модель не найдена');
      setModel(data);

      setValue('displayName', data.displayName || '');
      setValue('slug', data.slug || '');
      setValue('biography', data.biography || '');
      const a = data.physicalAttributes || {};
      if (a.age) setValue('physicalAttributes.age', a.age);
      if (a.height) setValue('physicalAttributes.height', a.height);
      if (a.weight) setValue('physicalAttributes.weight', a.weight);
      if (a.bustSize) setValue('physicalAttributes.bustSize', a.bustSize);
      if (a.bustType) setValue('physicalAttributes.bustType', a.bustType);
      if (a.bodyType) setValue('physicalAttributes.bodyType', a.bodyType);
      if (a.temperament) setValue('physicalAttributes.temperament', a.temperament);
      if (a.sexuality) setValue('physicalAttributes.sexuality', a.sexuality);
      if (a.hairColor) setValue('physicalAttributes.hairColor', a.hairColor);
      if (a.eyeColor) setValue('physicalAttributes.eyeColor', a.eyeColor);
      if (a.city) setValue('physicalAttributes.city', a.city);
      if (data.rateHourly) setValue('rateHourly', data.rateHourly);
      if (data.rateOvernight) setValue('rateOvernight', data.rateOvernight);
      setValue('contactTelegram', data.contactTelegram || '');
      setValue('contactPhone', data.contactPhone || '');
      setValue('contactWhatsapp', data.contactWhatsapp || '');

      setMainPhoto(data.mainPhotoUrl || '');
      await loadMedia(data.mainPhotoUrl != null ? data.mainPhotoUrl : null);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить модель');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMedia = async (profileMainPhotoUrl?: string | null) => {
    setGalleryLoadError(null);
    try {
      const media = await api.getProfileMedia(modelId);
      const withUrl = media.filter((m: any) => m.cdnUrl && String(m.cdnUrl).trim().length > 0);
      const sorted = [...withUrl].sort(
        (a: any, b: any) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0),
      );
      setFullMedia(sorted);
      let list: GalleryPhoto[] = sorted.map((m: any) => ({ id: m.id, url: m.cdnUrl as string, isPublicVisible: m.isPublicVisible !== false, createdAt: m.createdAt ?? m.created_at }));
      const seen = new Set(list.map((p) => p.url));
      const main =
        profileMainPhotoUrl !== undefined
          ? (profileMainPhotoUrl && String(profileMainPhotoUrl).trim()) || ''
          : (mainPhoto && String(mainPhoto).trim()) || '';
      if (main && !seen.has(main)) {
        list = [{ id: '__profile_main__', url: main }, ...list];
      }
      setGallery(list);
      setGallery2Open(list.slice(10, 20).some(Boolean));
      setGallery3Open(list.slice(20, 30).some(Boolean));
    } catch (e: any) {
      setGalleryLoadError(e?.message || 'Не удалось загрузить список медиа');
      setGallery([]);
    }
  };

  const uploadPhoto = useCallback(async (file: File, cellIndex: number) => {
    setUploadingCell(cellIndex);
    setError(null);
    try {
      const mimeType = resolveUploadMimeType(file);
      const { uploadUrl, cdnUrl, mediaId } = await api.generatePresignedUrl({
        fileName: file.name,
        mimeType: mimeType as any,
        fileSize: file.size,
        modelId,
      });
      await api.uploadToMinIO(uploadUrl, file, mimeType);
      await api.confirmUpload(mediaId, {
        cdnUrl,
        modelId,
        metadata: { originalName: file.name },
        sortOrder: cellIndex,
      });

      if (gallery.length === 0 && !mainPhoto) {
        const p = await api.setMainPhoto(mediaId, modelId);
        setMainPhoto(p?.mainPhotoUrl || cdnUrl);
      }
      await loadMedia();
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
      throw err;
    } finally {
      setUploadingCell(null);
    }
  }, [modelId, gallery.length, mainPhoto]);

  const openMediaModal = useCallback((cellIndex: number) => {
    setMediaModalSlot(cellIndex);
    setPreviewPhotoIndex(cellIndex);
    setMediaModalOpen(true);
  }, []);

  const replacePhotoAtSlot = useCallback(
    async (file: File, cellIndex: number) => {
      const existing = gallery[cellIndex];
      if (!existing) {
        await uploadPhoto(file, cellIndex);
        return;
      }
      const wasMain = existing.url === mainPhoto;
      setUploadingCell(cellIndex);
      setError(null);
      try {
        if (existing.id === '__profile_main__') {
          const token = localStorage.getItem('accessToken');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers.Authorization = `Bearer ${token.replace(/^"|"$/g, '')}`;
          const response = await fetch(apiUrl(`/models/${modelId}`), {
            method: 'PUT',
            headers,
            body: JSON.stringify({ mainPhotoUrl: '' }),
          });
          if (!response.ok) {
            const e = await response.json().catch(() => ({}));
            throw new Error(e.message || 'Не удалось сбросить главное фото');
          }
          setMainPhoto('');
        } else {
          await api.deleteMedia(existing.id);
        }
        const mimeType = resolveUploadMimeType(file);
        const { uploadUrl, cdnUrl, mediaId } = await api.generatePresignedUrl({
          fileName: file.name,
          mimeType: mimeType as any,
          fileSize: file.size,
          modelId,
        });
        await api.uploadToMinIO(uploadUrl, file, mimeType);
        await api.confirmUpload(mediaId, {
          cdnUrl,
          modelId,
          metadata: { originalName: file.name },
          sortOrder: cellIndex,
        });
        if (wasMain) {
          const p = await api.setMainPhoto(mediaId, modelId);
          setMainPhoto(p?.mainPhotoUrl || cdnUrl);
        }
        await loadMedia(wasMain ? cdnUrl : undefined);
      } catch (err: any) {
        setError(err.message || 'Ошибка замены фото');
        throw err;
      } finally {
        setUploadingCell(null);
      }
    },
    [modelId, gallery, mainPhoto, uploadPhoto],
  );

  const handleModalUpload = useCallback(
    async (file: File) => {
      const slot = mediaModalSlot;
      try {
        if (gallery[slot]) {
          await replacePhotoAtSlot(file, slot);
        } else {
          await uploadPhoto(file, slot);
        }
        setMediaModalOpen(false);
      } catch {
        /* ошибка уже в состоянии */
      }
    },
    [mediaModalSlot, gallery, replacePhotoAtSlot, uploadPhoto],
  );

  const applyLibraryMediaToSlot = useCallback(
    async (pickedMediaId: string) => {
      const cellIndex = mediaModalSlot;
      const existing = gallery[cellIndex];
      if (existing?.id === pickedMediaId) {
        setMediaModalOpen(false);
        return;
      }
      setUploadingCell(cellIndex);
      setError(null);
      try {
        let needSetMain = false;
        if (existing) {
          needSetMain = existing.url === mainPhoto || existing.id === '__profile_main__';
          if (existing.id === '__profile_main__') {
            const token = localStorage.getItem('accessToken');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token.replace(/^"|"$/g, '')}`;
            const response = await fetch(apiUrl(`/models/${modelId}`), {
              method: 'PUT',
              headers,
              body: JSON.stringify({ mainPhotoUrl: '' }),
            });
            if (!response.ok) {
              const e = await response.json().catch(() => ({}));
              throw new Error(e.message || 'Не удалось сбросить главное фото');
            }
            setMainPhoto('');
          } else {
            await api.deleteMedia(existing.id);
          }
        } else if (gallery.length === 0 && !mainPhoto) {
          needSetMain = true;
        }

        await api.assignMediaToModel(pickedMediaId, { modelId, sortOrder: cellIndex });
        if (needSetMain) {
          const p = await api.setMainPhoto(pickedMediaId, modelId);
          setMainPhoto(p?.mainPhotoUrl || '');
        }
        await loadMedia();
        setMediaModalOpen(false);
      } catch (err: any) {
        setError(err.message || 'Не удалось вставить из медиатеки');
      } finally {
        setUploadingCell(null);
      }
    },
    [mediaModalSlot, gallery, modelId, mainPhoto, loadMedia],
  );

  const deletePhoto = useCallback(async (mediaId: string) => {
    try {
      if (mediaId === '__profile_main__') {
        const token = localStorage.getItem('accessToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token.replace(/^"|"$/g, '')}`;
        const response = await fetch(apiUrl(`/models/${modelId}`), {
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
      const resp = await fetch(apiUrl(`/models/id/${modelId}`));
      if (resp.ok) {
        const fresh = await resp.json();
        setMainPhoto(fresh?.mainPhotoUrl || '');
        await loadMedia(fresh?.mainPhotoUrl != null ? fresh.mainPhotoUrl : null);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления');
    }
  }, [modelId]);

  const saveModel = async (data: CreateProfileInput, publishMode?: 'draft' | 'publish') => {
    setIsSaving(true); setError(null); setSuccess(null);
    try {
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
      if (data.contactTelegram?.trim()) cleanedData.contactTelegram = data.contactTelegram.trim();
      if (data.contactPhone?.trim()) cleanedData.contactPhone = data.contactPhone.trim();
      if (data.contactWhatsapp?.trim()) cleanedData.contactWhatsapp = data.contactWhatsapp.trim();

      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token.replace(/^"|"$/g, '')}`;
      const response = await fetch(apiUrl(`/models/${modelId}`), {
        method: 'PUT', headers, body: JSON.stringify(cleanedData),
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.message || 'Ошибка'); }
      const saved = await response.json();
      if (saved && typeof saved.isPublished === 'boolean') {
        setModel((m) => (m ? { ...m, isPublished: saved.isPublished, updatedAt: saved.updatedAt ?? m.updatedAt } : m));
      }
      setSuccess(
        publishMode === 'publish' ? 'Опубликовано' : publishMode === 'draft' ? 'Черновик сохранён' : 'Изменения сохранены',
      );
      setTimeout(() => setSuccess(null), 3000);
      // visible photos bubble to front
      setGallery((prev) => {
        const visible = prev.filter((g) => g.isPublicVisible !== false);
        const hidden = prev.filter((g) => g.isPublicVisible === false);
        const reordered = [...visible, ...hidden];
        reordered.forEach((photo, idx) => {
          api.updateMediaVisibility(photo.id, { sortOrder: idx }).catch(() => {});
        });
        return reordered;
      });
    } catch (err: any) {
      setError(err.message || 'Не удалось сохранить');
    } finally {
      setIsSaving(false);
    }
  };

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = gallery.findIndex((g) => g.id === active.id);
    const newIndex = gallery.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(gallery, oldIndex, newIndex);
    setGallery(reordered);
    await Promise.all(
      reordered.map((photo, idx) =>
        api.updateMediaVisibility(photo.id, { sortOrder: idx }),
      ),
    );
  }, [gallery]);

  const handleToggleVisibility = useCallback(async (photoId: string) => {
    const photo = gallery.find((g) => g.id === photoId);
    if (!photo) return;
    const next = photo.isPublicVisible === false ? true : false;
    setGallery((prev) => prev.map((g) => g.id === photoId ? { ...g, isPublicVisible: next } : g));
    await api.updateMediaVisibility(photoId, { isPublicVisible: next });
  }, [gallery]);

  const galleryKey = gallery.map((g) => g.id).join('|');
  const previewSlideCount =
    gallery.length > 0 ? gallery.length : mainPhoto ? 1 : 0;

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

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center font-body">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#d4af37]/20 border-t-[#d4af37]" />
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 font-body">
        <AlertCircle className="h-16 w-16 text-red-500" />
        <h2 className="text-xl font-bold text-white">Модель не найдена</h2>
        <Link href="/dashboard/models/list" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b8941f] px-6 py-3 font-semibold text-black">
          <ArrowLeft className="h-4 w-4" /> К списку
        </Link>
      </div>
    );
  }

  const GALLERY_SLOTS = 10;
  const EXTRA_SLOTS = 20;
  const TOTAL_SLOTS = GALLERY_SLOTS + EXTRA_SLOTS;
  const gridCells = Array.from({ length: TOTAL_SLOTS }, (_, i) => gallery[i] || null);
  const previewSlides =
    gallery.length > 0
      ? gallery
      : mainPhoto
        ? [{ id: '__main-fallback__', url: mainPhoto }]
        : [];

  const slugVal = formData.slug || model.slug || '';
  const updatedLabel = model.updatedAt
    ? new Date(model.updatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  const onSaveDraft = handleSubmit((data) => saveModel(data, 'draft'));
  const onSavePublish = handleSubmit((data) => saveModel(data, 'publish'));

  const crumbName = (formData.displayName || model.displayName || '').trim() || 'Без имени';
  const slugReg = register('slug');

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
            <span className={`shrink-0 px-1 font-display font-bold ${L ? 'text-[#a7aaad]' : 'text-zinc-700'}`} aria-hidden>/</span>
            <Link href="/dashboard/models/list" className={`shrink-0 font-display transition-colors ${L ? 'text-[#646970] hover:text-[#2271b1]' : 'text-zinc-500 hover:text-[#d4af37]'}`}>
              Модели
            </Link>
            <span className={`shrink-0 px-1 font-display font-bold ${L ? 'text-[#a7aaad]' : 'text-zinc-700'}`} aria-hidden>/</span>
            <span className={`min-w-0 truncate font-display ${L ? 'text-[#1d2327]' : 'text-zinc-300'}`} title={crumbName}>{crumbName}</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {success && (
            <span className={`flex items-center gap-1 text-xs ${L ? 'text-[#00a32a]' : 'text-green-400'}`}>
              <Check className="h-3.5 w-3.5" />{success}
            </span>
          )}
          <a
            href={`/models/${slugVal || model.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={L ? `${t.btnSecondary} px-3 py-1.5 text-xs` : 'flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-[#d4af37]/50 hover:text-white'}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Предпросмотр
          </a>
          <button
            type="submit"
            form="edit-model-form"
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${L ? 'border border-[#2271b1] bg-[#2271b1] text-white hover:bg-[#135e96]' : isDirty ? 'bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black hover:shadow-lg' : 'border border-white/[0.08] bg-transparent text-gray-400 hover:border-white/20 hover:text-white'}`}
          >
            {isSaving ? (
              <>
                <div className={`h-3 w-3 animate-spin rounded-full border-2 border-t-transparent ${L ? 'border-[#2271b1]/30 border-t-[#2271b1]' : 'border-black/30 border-t-black'}`} /> Сохранение
              </>
            ) : isDirty ? (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                Сохранить
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Сохранено
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className={L ? 'mx-6 mt-2 flex flex-shrink-0 items-center gap-2 rounded-sm border border-[#d63638] bg-[#fcf0f1] p-2.5' : 'mx-6 mt-2 flex flex-shrink-0 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5'}>
          <AlertCircle className={`h-4 w-4 flex-shrink-0 ${L ? 'text-[#d63638]' : 'text-red-500'}`} />
          <span className={`text-xs ${L ? 'text-[#d63638]' : 'text-red-400'}`}>{error}</span>
          <button type="button" onClick={() => setError(null)} className={`ml-auto ${L ? 'text-[#d63638]/70 hover:text-[#d63638]' : 'text-red-500/50 hover:text-red-400'}`}><X className="h-3 w-3" /></button>
        </div>
      )}


      <div className="mx-auto flex min-h-0 w-full max-w-[min(1920px,100%)] flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-4 pb-3 pt-2 sm:px-6 xl:grid xl:flex-none xl:grid-cols-4 xl:items-stretch xl:gap-4 xl:overflow-hidden xl:pb-4 xl:pt-1">
        <div className="order-1 flex min-h-0 w-full flex-col gap-1.5 xl:order-1 xl:h-full xl:max-h-full xl:min-w-0 xl:overflow-y-auto xl:overflow-x-hidden">
          {galleryLoadError ? (
            <p className={`rounded-md px-2 py-1.5 text-[10px] ${L ? 'bg-[#fcf0f1] text-[#d63638]' : 'bg-red-500/10 text-red-300'}`}>
              {galleryLoadError}
            </p>
          ) : null}

          <div
            className={`mx-auto flex w-full min-h-[min(400px,52dvh)] flex-1 flex-col overflow-hidden xl:min-h-0 ${t.phoneOuter}`}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain bg-[#0a0a0a]">
              <div className="flex min-h-0 flex-1 flex-col border-b border-white/[0.04]">
                <div
                  className="phone-mockup-status-bar flex flex-shrink-0 flex-col items-center gap-y-1 bg-[#0a0a0a]/90 px-3 py-2.5 backdrop-blur-lg sm:grid sm:flex-none sm:grid-cols-[1fr_minmax(0,auto)_1fr] sm:flex-row sm:gap-x-2 sm:gap-y-0"
                  aria-label="Статус-бар мокапа"
                >
                  <span className="min-w-0 truncate text-center text-xs font-medium text-white/30 leading-tight sm:text-right" aria-hidden>
                    ссылка на анкету:
                  </span>
                  <div className="flex min-w-0 justify-center justify-self-center">
                    <div className="inline-flex max-w-[min(240px,72vw)] items-center gap-1.5 rounded-full border-2 border-[#d4af37]/40 bg-black/55 px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <span className="shrink-0 text-[10px] font-medium tracking-wide text-[#d4af37]/65">
                        slug
                      </span>
                      {slugEditing ? (
                        <input
                          id="edit-slug"
                          form="edit-model-form"
                          {...slugReg}
                          ref={(el) => {
                            slugReg.ref(el);
                            slugInputRef.current = el;
                          }}
                          onBlur={(e) => {
                            slugReg.onBlur(e);
                            setSlugEditing(false);
                          }}
                          className="min-w-0 max-w-[min(180px,50vw)] flex-1 border-0 bg-transparent py-0.5 font-mono text-[12px] text-white outline-none ring-0 placeholder:text-white/30 focus:ring-0"
                          placeholder="anna-moscow"
                          title="Публичный адрес"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSlugEditing(true)}
                          className="min-w-0 max-w-[min(180px,50vw)] truncate text-left font-mono text-[12px] font-semibold text-white hover:text-[#d4af37]/90"
                        >
                          {(slugVal || model.slug || '').trim() || '—'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 justify-self-end flex flex-col items-end gap-px">
                    <span className="font-body text-[10px] tabular-nums text-white/30">
                      {previewSlideCount > 0 ? `${previewPhotoIndex + 1}/${previewSlideCount}` : '—'}
                    </span>
                    {slugVal && (
                      <span className="text-[8px] text-white/20 truncate max-w-[90px]" title={`lovnge.ru/${slugVal}`}>
                        /{slugVal}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`relative w-full min-h-[min(280px,48dvh)] flex-1 overflow-hidden bg-black sm:min-h-[min(320px,52dvh)] ${previewSlides.length > 0 && previewPhotoIndex === 0 ? 'ring-2 ring-inset ring-[#d4af37]/40 ring-dashed' : ''}`}>
                  {previewSlides.length > 0 ? (
                    <>
                      <img
                        src={previewSlides[previewPhotoIndex]?.url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {previewSlideCount > 1 ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhotoIndex((i) => (i <= 0 ? previewSlideCount - 1 : i - 1));
                            }}
                            className="absolute left-1 top-1/2 z-[10] -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/75"
                            aria-label="Предыдущее фото"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhotoIndex((i) => (i >= previewSlideCount - 1 ? 0 : i + 1));
                            }}
                            className="absolute right-1 top-1/2 z-[10] -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/75"
                            aria-label="Следующее фото"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        disabled={uploadingCell !== null}
                        onClick={() => openMediaModal(previewPhotoIndex)}
                        className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0 disabled:cursor-wait disabled:opacity-60"
                        aria-label="Заменить это фото: загрузить или медиатека"
                        title="Загрузить новое или выбрать из медиатеки"
                      />
                      <button
                        type="button"
                        disabled={uploadingCell !== null}
                        onClick={(e) => {
                          e.stopPropagation();
                          openMediaModal(previewPhotoIndex);
                        }}
                        className={`absolute right-2 top-2 z-[11] flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium shadow-md backdrop-blur-md transition-colors disabled:opacity-50 ${
                          L
                            ? 'border-[#2271b1]/55 bg-white/95 text-[#1d2327] hover:bg-white'
                            : 'border-white/15 bg-black/70 text-white hover:bg-black/85'
                        }`}
                        title="Вставить медиафайл (загрузка или медиатека)"
                      >
                        <ImageIcon className="h-3 w-3 shrink-0 opacity-85" aria-hidden />
                        Изображение
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingCell !== null}
                      onClick={() => openMediaModal(0)}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-[#141414] m-3 rounded-lg border-2 border-dashed border-[#d4af37]/50 transition-colors hover:border-[#d4af37]/80 hover:bg-[#d4af37]/[0.04] disabled:cursor-wait disabled:opacity-60"
                    >
                      <Upload className="mb-2 h-8 w-8 text-[#d4af37]/50" />
                      <span className="text-[11px] font-medium text-[#d4af37]/70">Главная фотография</span>
                      <span className={`mt-1 text-[9px] ${L ? 'text-[#646970]' : 'text-gray-600'}`}>Нажмите или перетащите</span>
                    </button>
                  )}
                  <div
                    className="pointer-events-none absolute bottom-0 left-0 right-0 z-[8] bg-gradient-to-t from-black/80 to-transparent p-4 pt-12"
                    style={{ fontFamily: heroTy.fontFamily }}
                  >
                    <div className="pointer-events-auto">
                    {cardEdit === 'name' ? (
                      <input
                        autoFocus
                        form="edit-model-form"
                        {...register('displayName')}
                        onBlur={() => setCardEdit(null)}
                        className="mb-1 w-full rounded border border-white/25 bg-black/60 px-2 py-1.5 text-xl font-bold outline-none focus:border-[#d4af37]"
                        style={{ color: heroTy.textColor }}
                        placeholder="Имя"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCardEdit('name')}
                        className="block max-w-full truncate text-left text-xl font-bold drop-shadow-md hover:opacity-90"
                        style={{ color: heroTy.textColor }}
                      >
                        {formData.displayName?.trim() || 'Имя — нажмите'}
                      </button>
                    )}
                    <div
                      className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-body text-xs"
                      style={{ color: heroTy.metaColor }}
                    >
                      {cardEdit === 'age' ? (
                        <input
                          autoFocus
                          form="edit-model-form"
                          type="number"
                          min={18}
                          max={99}
                          {...register('physicalAttributes.age', { valueAsNumber: true })}
                          onBlur={() => setCardEdit(null)}
                          className="w-16 rounded border border-white/25 bg-black/50 px-1.5 py-0.5 text-[11px] outline-none focus:border-[#d4af37]"
                          style={{ color: heroTy.metaColor }}
                        />
                      ) : (
                        <button type="button" onClick={() => setCardEdit('age')} className="text-left hover:opacity-90">
                          Возраст:{' '}
                          <span className="opacity-90">
                            {formData.physicalAttributes?.age != null &&
                            Number(formData.physicalAttributes.age) > 0
                              ? formData.physicalAttributes.age
                              : '—'}
                          </span>
                        </button>
                      )}
                      {cardEdit === 'height' ? (
                        <input
                          autoFocus
                          form="edit-model-form"
                          type="number"
                          min={140}
                          max={220}
                          {...register('physicalAttributes.height', { valueAsNumber: true })}
                          onBlur={() => setCardEdit(null)}
                          className="w-16 rounded border border-white/25 bg-black/50 px-1.5 py-0.5 text-[11px] outline-none focus:border-[#d4af37]"
                          style={{ color: heroTy.metaColor }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCardEdit('height')}
                          className="inline-flex items-center gap-1 text-left hover:opacity-90"
                        >
                          <Ruler className="h-3 w-3 shrink-0 opacity-45" aria-hidden />
                          <span className="opacity-90">
                            {formData.physicalAttributes?.height || '—'} см
                          </span>
                        </button>
                      )}
                      {cardEdit === 'weight' ? (
                        <input
                          autoFocus
                          form="edit-model-form"
                          type="number"
                          min={35}
                          max={150}
                          {...register('physicalAttributes.weight', { valueAsNumber: true })}
                          onBlur={() => setCardEdit(null)}
                          className="w-16 rounded border border-white/25 bg-black/50 px-1.5 py-0.5 text-[11px] outline-none focus:border-[#d4af37]"
                          style={{ color: heroTy.metaColor }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCardEdit('weight')}
                          className="inline-flex items-center gap-1 text-left hover:opacity-90"
                        >
                          <Weight className="h-3 w-3 shrink-0 opacity-45" aria-hidden />
                          <span className="opacity-90">
                            {formData.physicalAttributes?.weight || '—'} кг
                          </span>
                        </button>
                      )}
                    </div>
                    </div>
                  </div>
                </div>

                {(formData.rateHourly || formData.rateOvernight) ? (
                  <div className="flex flex-shrink-0 items-center gap-4 border-t border-white/[0.06] bg-[#0a0a0a] px-3 py-2">
                    {formData.rateHourly ? (
                      <div>
                        <div className="font-body text-[10px] uppercase text-white/30">Час</div>
                        <div className="font-display text-base font-bold text-[#d4af37]">
                          {formData.rateHourly} ₽
                        </div>
                      </div>
                    ) : null}
                    {formData.rateOvernight ? (
                      <div>
                        <div className="font-body text-[10px] uppercase text-white/30">Ночь</div>
                        <div className="font-display text-base font-bold text-[#d4af37]">
                          {formData.rateOvernight} ₽
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={gallery.map((g) => g.id)} strategy={rectSortingStrategy}>
                  <div className={`shrink-0 border-t px-2 pb-2 pt-1.5 space-y-1.5 ${L ? 'border-[#dcdcde] bg-[#f6f7f7]' : 'border-white/[0.08] bg-[#0a0a0a]'}`}>
                    {/* Gallery */}
                    <div>
                      <div className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wider ${L ? 'text-[#50575e]' : 'text-white/30'}`}>Галерея</div>
                      <div className={`grid grid-cols-5 ${L ? 'gap-px bg-[#dcdcde]' : 'gap-px bg-white/[0.04]'}`}>
                        {gridCells.slice(0, 10).map((photo, i) => (
                          <PhotoCell key={photo?.id ?? `slot-${i}`} photo={photo} idx={i} isMain={photo ? photo.url === mainPhoto : false} isActive={previewPhotoIndex === i} uploadingCell={uploadingCell} L={L} t={t} openMediaModal={openMediaModal} deletePhoto={deletePhoto} onToggleVisibility={handleToggleVisibility} />
                        ))}
                      </div>
                    </div>
                    {/* Gallery 2 — accordion */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setGallery2Open((v) => !v)}
                        className={`mb-0.5 flex w-full items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${L ? 'text-[#50575e] hover:text-[#1d2327]' : 'text-white/30 hover:text-white/60'}`}
                      >
                        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${gallery2Open ? '' : '-rotate-90'}`} />
                        Галерея 2 (дополнительная)
                      </button>
                      {gallery2Open && (
                        <div className={`grid grid-cols-5 ${L ? 'gap-px bg-[#dcdcde]' : 'gap-px bg-white/[0.04]'}`}>
                          {gridCells.slice(10, 20).map((photo, i) => {
                            const idx = i + 10;
                            return <PhotoCell key={photo?.id ?? `slot-${idx}`} photo={photo} idx={idx} isMain={false} isActive={previewPhotoIndex === idx} uploadingCell={uploadingCell} L={L} t={t} openMediaModal={openMediaModal} deletePhoto={deletePhoto} onToggleVisibility={handleToggleVisibility} />;
                          })}
                        </div>
                      )}
                    </div>
                    {/* Gallery 3 — accordion */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setGallery3Open((v) => !v)}
                        className={`mb-0.5 flex w-full items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${L ? 'text-[#50575e] hover:text-[#1d2327]' : 'text-white/30 hover:text-white/60'}`}
                      >
                        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${gallery3Open ? '' : '-rotate-90'}`} />
                        Галерея 3
                      </button>
                      {gallery3Open && (
                        <div className={`grid grid-cols-5 ${L ? 'gap-px bg-[#dcdcde]' : 'gap-px bg-white/[0.04]'}`}>
                          {gridCells.slice(20, 30).map((photo, i) => {
                            const idx = i + 20;
                            return <PhotoCell key={photo?.id ?? `slot-${idx}`} photo={photo} idx={idx} isMain={false} isActive={previewPhotoIndex === idx} uploadingCell={uploadingCell} L={L} t={t} openMediaModal={openMediaModal} deletePhoto={deletePhoto} onToggleVisibility={handleToggleVisibility} />;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>

        <div className="order-2 min-h-0 min-w-0 overflow-y-auto xl:order-2 xl:col-span-2 xl:min-h-0">
          <form id="edit-model-form" onSubmit={handleSubmit((d) => saveModel(d))} className="space-y-4 pb-6">
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
              <div className="min-w-0 space-y-4">
                <section className={t.formSection}>
                  <h2
                    className={`mb-4 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`}
                    style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}
                  >
                    Биография
                  </h2>
                  <textarea {...register('biography')} rows={5} className={t.textareaXs} placeholder="Расскажите о себе, своих интересах и о том, как вам нравится проводить время с клиентами…" />
                </section>

                <section className={t.formSection}>
                  <h2
                    className={`mb-4 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`}
                    style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}
                  >
                    Информация
                  </h2>
                  <p className={`mb-3 text-[10px] leading-relaxed ${L ? 'text-[#646970]' : 'text-gray-600'}`}>
                    Имя, возраст, рост и вес — в мокапе телефона выше (на широком экране — слева).
                  </p>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Грудь</label>
                        <input {...register('physicalAttributes.bustSize')} type="number" className={t.inputXs} placeholder="2" />
                      </div>
                      <div>
                        <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Тип</label>
                        <select {...register('physicalAttributes.bustType')} className={t.inputXs}>
                          <option value="">-</option>
                          <option value="natural">Нат</option>
                          <option value="silicone">Сил</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Фигура</label>
                        <select {...register('physicalAttributes.bodyType')} className={t.inputXs}>
                          <option value="">-</option>
                          <option value="slim">Стройная</option>
                          <option value="fit">Спортивная</option>
                          <option value="curvy">Пышная</option>
                        </select>
                      </div>
                      <div>
                        <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Темперамент</label>
                        <select {...register('physicalAttributes.temperament')} className={t.inputXs}>
                          <option value="">-</option>
                          <option value="gentle">Нежный</option>
                          <option value="active">Активный</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Волосы</label>
                        <input {...register('physicalAttributes.hairColor')} className={t.inputXs} placeholder="Брюнет" />
                      </div>
                      <div>
                        <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Глаза</label>
                        <input {...register('physicalAttributes.eyeColor')} className={t.inputXs} placeholder="Карие" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section
                className={`${t.formSection} max-h-[min(520px,55vh)] overflow-y-auto xl:max-h-[calc(100dvh-8rem)]`}
                aria-label="Отзывы о модели"
              >
                <h2
                  className={`mb-3 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`}
                  style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}
                >
                  Отзывы
                  <span className={`ml-2 font-body text-[10px] font-normal normal-case ${L ? 'text-[#646970]' : 'text-gray-500'}`}>
                    ({modelReviews.length})
                  </span>
                </h2>
                {modelReviews.length === 0 ? (
                  <p className={`text-[11px] leading-relaxed ${L ? 'text-[#646970]' : 'text-gray-500'}`}>
                    {reviewsHint ?? 'Пока нет отзывов. Они появятся после первого завершённого бронирования.'}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {modelReviews.map((r) => (
                      <li
                        key={r.id}
                        className={`rounded-md border px-2 py-1.5 ${L ? 'border-[#dcdcde] bg-[#fcfcfc]' : 'border-white/[0.08] bg-black/25'}`}
                      >
                        <div className="mb-0.5 flex flex-wrap items-center justify-between gap-1">
                          <span className="text-[10px] tracking-tight" aria-hidden>
                            {Array.from({ length: 5 }, (_, i) => (
                              <span key={i} className={i < Math.min(5, Math.max(0, r.rating)) ? (L ? 'text-[#b8941f]' : 'text-[#d4af37]') : L ? 'text-[#c3c4c7]' : 'text-white/12'}>
                                ★
                              </span>
                            ))}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {r.moderationStatus ? (
                              <span
                                className={`rounded px-1 py-px font-body text-[8px] font-semibold uppercase ${
                                  r.moderationStatus === 'approved'
                                    ? L
                                      ? 'bg-[#edfaef] text-[#00a32a]'
                                      : 'bg-emerald-500/15 text-emerald-400'
                                    : r.moderationStatus === 'pending'
                                      ? L
                                        ? 'bg-[#fcf9e8] text-[#996800]'
                                        : 'bg-amber-500/15 text-amber-300'
                                      : L
                                        ? 'bg-[#fcf0f1] text-[#d63638]'
                                        : 'bg-red-500/15 text-red-400'
                                }`}
                              >
                                {r.moderationStatus === 'approved' ? 'ок' : r.moderationStatus === 'pending' ? 'ожид.' : 'откл.'}
                              </span>
                            ) : null}
                            <time className={`font-body text-[9px] tabular-nums ${L ? 'text-[#646970]' : 'text-gray-500'}`} dateTime={r.createdAt}>
                              {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </time>
                          </span>
                        </div>
                        {r.comment?.trim() ? (
                          <p className={`line-clamp-3 text-[11px] leading-snug ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>{r.comment.trim()}</p>
                        ) : (
                          <p className={`text-[10px] italic ${L ? 'text-[#a7aaad]' : 'text-gray-600'}`}>Без текста</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </form>
        </div>

        <div className="order-3 flex w-full shrink-0 flex-col gap-4 xl:order-3 xl:min-w-0 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
          <section className={t.publishBox}>
            <h2 className={t.sectionTitleBar} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>Публикация</h2>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className={`text-[10px] uppercase tracking-wide ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Статус</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  model.isPublished
                    ? L
                      ? 'bg-[#edfaef] text-[#00a32a]'
                      : 'bg-emerald-500/15 text-emerald-400'
                    : L
                      ? 'bg-[#fcf9e8] text-[#996800]'
                      : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {model.isPublished ? 'Опубликовано' : 'Черновик'}
              </span>
            </div>
            <p className={`mb-4 text-[10px] leading-relaxed ${L ? 'text-[#646970]' : 'text-gray-500'}`}>
              <span className={L ? 'text-[#50575e]' : 'text-gray-600'}>Изменено:</span> {updatedLabel}
            </p>
            <div className="flex flex-col gap-2">
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
            <h2 className={`mb-4 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>Расценки</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Час (₽)</label>
                <input {...register('rateHourly')} type="number" form="edit-model-form" className={t.inputXs} placeholder="5000" />
              </div>
              <div>
                <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Ночь (₽)</label>
                <input {...register('rateOvernight')} type="number" form="edit-model-form" className={t.inputXs} placeholder="25000" />
              </div>
            </div>
            <div className={`mt-3 flex items-center justify-between border-t pt-3 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
              <span className={`text-[9px] ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Итого:</span>
              <span className={`text-sm font-bold ${accent}`}>{(Number(formData.rateHourly) || 0) + (Number(formData.rateOvernight) || 0)} ₽</span>
            </div>
          </section>

          <section className={t.formSection}>
            <h2 className={`mb-4 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>Контакты (после оплаты)</h2>
            <p className={`mb-3 text-[9px] ${L ? 'text-[#646970]' : 'text-gray-500'}`}>Показываются клиенту только после успешной оплаты эскроу</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Telegram (@username или ссылка)</label>
                <input {...register('contactTelegram')} form="edit-model-form" className={t.inputXs} placeholder="@username" />
              </div>
              <div>
                <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>Телефон / WhatsApp</label>
                <input {...register('contactPhone')} form="edit-model-form" className={t.inputXs} placeholder="+7 900 000-00-00" />
              </div>
              <div>
                <label className={`mb-1.5 block text-[9px] font-medium uppercase ${L ? 'text-[#50575e]' : 'text-gray-400'}`}>WhatsApp (отдельный, если другой)</label>
                <input {...register('contactWhatsapp')} form="edit-model-form" className={t.inputXs} placeholder="+7 900 000-00-00" />
              </div>
            </div>
          </section>
        </div>
      </div>

      <ModelProfileMediaModal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        isWpAdmin={L}
        modelId={modelId}
        slotIndex={mediaModalSlot}
        busy={uploadingCell !== null}
        onUpload={handleModalUpload}
        onAssignFromLibrary={applyLibraryMediaToSlot}
      />
    </div>
  );
}

function PhotoCell({
  photo, idx, isMain, isActive, uploadingCell, L, t, openMediaModal, deletePhoto, onToggleVisibility, tall,
}: {
  photo: { id: string; url: string; isPublicVisible?: boolean; createdAt?: string } | null;
  idx: number;
  isMain: boolean;
  isActive: boolean;
  uploadingCell: number | null;
  L: boolean;
  t: any;
  openMediaModal: (idx: number) => void;
  deletePhoto: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  tall?: boolean;
}) {
  const sortable = useSortable({ id: photo?.id ?? `slot-${idx}`, disabled: !photo });
  const style = photo ? { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition } : undefined;

  const isHidden = photo?.isPublicVisible === false;

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const uploadedLabel = photo?.createdAt
    ? new Date(photo.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={`group relative ${t.phoneThumb} ${tall ? 'aspect-[3/4]' : ''} ${sortable.isDragging ? 'z-50 opacity-80 ring-2 ring-[#d4af37]' : ''}`}
      onMouseMove={photo ? (e) => setCursor({ x: e.clientX, y: e.clientY }) : undefined}
      onMouseLeave={photo ? () => setCursor(null) : undefined}
    >
      {photo ? (
        <>
          <button
            type="button"
            className="absolute inset-0 z-0 block h-full w-full overflow-hidden p-0"
            onClick={() => openMediaModal(idx)}
            aria-label={`Заменить фото ${idx + 1}`}
            title="Загрузить или из медиатеки"
          >
            <img src={photo.url} alt="" className={`h-full w-full object-cover transition-opacity ${isHidden ? 'opacity-40' : ''}`} />
          </button>
          {isActive && (
            <div className="pointer-events-none absolute inset-0 z-[1] border-2 border-[#d4af37]" aria-hidden />
          )}
          {isMain && (
            <div className={`absolute left-0.5 top-0.5 z-[2] rounded px-1 py-px text-[6px] font-bold uppercase ${L ? 'bg-[#2271b1] text-white' : 'bg-[#d4af37] text-black'}`}>
              Главн.
            </div>
          )}
          {/* drag handle */}
          <div
            {...sortable.attributes}
            {...sortable.listeners}
            className="absolute inset-0 z-[2] cursor-grab active:cursor-grabbing"
            onClick={(e) => e.preventDefault()}
          />
          {/* eye toggle */}
          {onToggleVisibility && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(photo.id); }}
              className={`absolute right-0.5 top-0.5 z-[4] rounded-full p-0.5 transition-all ${
                isHidden
                  ? 'bg-black/80 text-gray-400 opacity-100'
                  : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'
              }`}
              title={isHidden ? 'Показать на профиле' : 'Скрыть с профиля'}
            >
              {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {/* delete */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
            className="absolute right-0.5 bottom-0.5 z-[4] rounded-full bg-black/85 p-1 opacity-0 transition-opacity hover:bg-red-600/90 group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label="Удалить фото"
          >
            <Trash2 className="h-3 w-3 text-white" />
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={uploadingCell !== null}
          onClick={() => openMediaModal(idx)}
          className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-0.5 transition-colors disabled:cursor-wait disabled:opacity-60 ${
            L ? 'text-[#646970] hover:bg-[#f0f6fc] hover:text-[#2271b1]' : 'text-gray-500 hover:bg-white/[0.04] hover:text-[#d4af37]'
          }`}
          aria-label={idx === 0 ? 'Добавить главную фотографию' : `Слот ${idx}: добавить фото`}
        >
          {uploadingCell === idx ? (
            <div className={`h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${L ? 'border-[#2271b1]/30 border-t-[#2271b1]' : 'border-[#d4af37]/30 border-t-[#d4af37]'}`} />
          ) : (
            <>
              <Upload className="h-3 w-3 opacity-70" />
              {tall && <span className={`text-[7px] font-medium text-center leading-tight px-1 ${L ? 'text-[#50575e]' : 'text-gray-500'}`}>Главное фото</span>}
            </>
          )}
        </button>
      )}
      {cursor && photo && (
        <div
          className="pointer-events-none fixed z-[9999] w-72 overflow-hidden rounded-lg shadow-2xl border border-white/10"
          style={{ left: cursor.x + 14, top: cursor.y - 20 }}
        >
          <img src={photo.url} alt="" className="w-full aspect-[3/4] object-cover block" />
          {uploadedLabel && (
            <div className="bg-black/90 px-2 py-1.5">
              <p className="text-[9px] text-white/50 leading-tight">Загружено:</p>
              <p className="text-[10px] text-white/90 font-medium leading-tight">{uploadedLabel}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
