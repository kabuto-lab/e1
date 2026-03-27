/**
 * Edit Model Profile Page
 * Phone mockup + 3x3 upload grid + form fields
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProfileSchema, type CreateProfileInput } from '@/lib/validations';
import { ArrowLeft, Upload, X, Check, AlertCircle, Ruler, Weight, User, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useUnsavedWarning } from '@/lib/useUnsavedWarning';
import { api } from '@/lib/api-client';
import { apiUrl } from '@/lib/api-url';

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
  mainPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface GalleryPhoto { id: string; url: string; }

export default function EditModelPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [model, setModel] = useState<ModelProfile | null>(null);
  const [mainPhoto, setMainPhoto] = useState('');
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [uploadingCell, setUploadingCell] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isDirty },
  } = useForm<CreateProfileInput>({
    mode: 'onSubmit',
    resolver: zodResolver(createProfileSchema) as any,
  });

  useUnsavedWarning(isDirty);
  const formData = watch();

  useEffect(() => { loadModel(); }, [modelId]);

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

      if (data.mainPhotoUrl) setMainPhoto(data.mainPhotoUrl);
      await loadMedia();
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить модель');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMedia = async () => {
    try {
      const media = await api.getProfileMedia(modelId);
      setGallery(media.filter((m: any) => m.cdnUrl).map((m: any) => ({ id: m.id, url: m.cdnUrl })));
    } catch { /* non-critical */ }
  };

  const uploadPhoto = useCallback(async (file: File, cellIndex: number) => {
    setUploadingCell(cellIndex);
    setError(null);
    try {
      const { uploadUrl, cdnUrl, mediaId } = await api.generatePresignedUrl({
        fileName: file.name,
        mimeType: file.type as any,
        fileSize: file.size,
        modelId,
      });
      await api.uploadToMinIO(uploadUrl, file);
      await api.confirmUpload(mediaId, { cdnUrl, modelId, metadata: { originalName: file.name } });

      if (gallery.length === 0 && !mainPhoto) {
        await api.setMainPhoto(mediaId, modelId);
        setMainPhoto(cdnUrl);
      }
      await loadMedia();
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setUploadingCell(null);
    }
  }, [modelId, gallery.length, mainPhoto]);

  const deletePhoto = useCallback(async (mediaId: string) => {
    try {
      await api.deleteMedia(mediaId);
      await loadMedia();
      const resp = await fetch(apiUrl(`/models/id/${modelId}`));
      if (resp.ok) {
        const fresh = await resp.json();
        setMainPhoto(fresh?.mainPhotoUrl || '');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления');
    }
  }, [modelId]);

  const saveModel = async (data: CreateProfileInput) => {
    setIsSaving(true); setError(null); setSuccess(null);
    try {
      const cleanedData: any = { displayName: data.displayName?.trim() || '' };
      if (data.slug?.trim()) cleanedData.slug = data.slug.trim();
      if (data.biography?.trim()) cleanedData.biography = data.biography.trim();
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

      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token.replace(/^"|"$/g, '')}`;
      const response = await fetch(apiUrl(`/models/${modelId}`), {
        method: 'PUT', headers, body: JSON.stringify(cleanedData),
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.message || 'Ошибка'); }
      setSuccess('Изменения сохранены');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Не удалось сохранить');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center font-body">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex-1 flex items-center justify-center font-body">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Модель не найдена</h2>
          <Link href="/dashboard/models" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg">
            <ArrowLeft className="w-4 h-4" /> К списку
          </Link>
        </div>
      </div>
    );
  }

  const GRID_SLOTS = 9;
  const gridCells = Array.from({ length: GRID_SLOTS }, (_, i) => gallery[i] || null);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden font-body -m-4 lg:-m-6 lg:-mr-8">
      {/* Top Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-white/[0.06] flex-shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/models/list" className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <h1 className="text-lg font-bold text-white font-display">{model.displayName}</h1>
          <span className="text-xs text-gray-500">@{model.slug}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/models/${model.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 border border-white/[0.06] rounded-lg hover:border-[#d4af37]/50 transition-colors flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Предпросмотр
          </a>
          <button
            onClick={handleSubmit((d) => saveModel(d))}
            disabled={isSaving}
            className="px-4 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs"
          >
            {isSaving ? (
              <><div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Сохранение</>
            ) : (
              <><Check className="w-3.5 h-3.5" /> Сохранить</>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 flex items-center gap-2 mx-6 mt-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-red-400 text-xs">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500/50 hover:text-red-400"><X className="w-3 h-3" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2.5 flex items-center gap-2 mx-6 mt-2 flex-shrink-0">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-green-400 text-xs">{success}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-6 flex-1 overflow-hidden min-h-0 px-6 pt-4">
        {/* LEFT — Phone Mockup */}
        <div className="w-[360px] flex-shrink-0 overflow-hidden">
          <div className="relative mx-auto border-[3px] border-white/[0.08] rounded-[2.5rem] overflow-hidden bg-[#0a0a0a] shadow-2xl h-full">
            <div className="h-full overflow-y-auto">
              {/* Main Photo */}
              <div className="relative aspect-[3/4] bg-[#141414]">
                {mainPhoto ? (
                  <img src={mainPhoto} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <User className="w-12 h-12 text-gray-600 mb-2" />
                    <span className="text-gray-500 text-xs">Нет фото</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/80 rounded-full">
                  <div className={`w-1.5 h-1.5 rounded-full ${model.availabilityStatus === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-white text-[8px]">{model.availabilityStatus === 'online' ? 'Свободна' : 'Оффлайн'}</span>
                </div>
              </div>

              {/* Info inside phone */}
              <div className="p-4 bg-[#141414] space-y-2">
                <div className="font-display text-base font-bold text-white">{formData.displayName || 'Имя'}</div>
                <div className="flex items-center gap-3 text-[9px] text-gray-500">
                  <span><Ruler className="w-2.5 h-2.5 inline" /> {formData.physicalAttributes?.height || '---'} см</span>
                  <span><Weight className="w-2.5 h-2.5 inline" /> {formData.physicalAttributes?.weight || '---'} кг</span>
                </div>
                {(formData.rateHourly || formData.rateOvernight) && (
                  <div className="flex gap-4 pt-2 border-t border-white/[0.06]">
                    {formData.rateHourly && <div><div className="text-[8px] text-gray-500">Час</div><div className="text-xs text-[#d4af37] font-bold">{formData.rateHourly} ₽</div></div>}
                    {formData.rateOvernight && <div><div className="text-[8px] text-gray-500">Ночь</div><div className="text-xs text-[#d4af37] font-bold">{formData.rateOvernight} ₽</div></div>}
                  </div>
                )}
              </div>

              {/* Gallery in phone */}
              {gallery.length > 0 && (
                <div className="grid grid-cols-3 gap-px bg-white/[0.04]">
                  {gallery.map((p) => (
                    <div key={p.id} className="aspect-square">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE — 3x3 Grid + Basic Info */}
        <div className="w-[420px] flex-shrink-0 overflow-y-auto">
          <form id="edit-model-form" onSubmit={handleSubmit((d) => saveModel(d))} className="space-y-4 pb-8">
            {/* 3x3 Upload Grid */}
            <section className="bg-[#141414] border border-white/[0.06] rounded-xl p-5">
              <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wide flex items-center gap-2" style={{ fontFamily: 'Unbounded' }}>
                <Upload className="w-4 h-4" /> Фотографии ({gallery.length})
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {gridCells.map((photo, idx) => (
                  <div key={photo?.id || `empty-${idx}`} className="relative aspect-square bg-[#0a0a0a] border border-white/[0.06] rounded-lg overflow-hidden group">
                    {photo ? (
                      <>
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        {photo.url === mainPhoto && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#d4af37] text-black text-[7px] font-bold rounded">ГЛАВНАЯ</div>
                        )}
                        <button
                          type="button"
                          onClick={() => deletePhoto(photo.id)}
                          className="absolute top-1 right-1 p-1 bg-black/80 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:border-[#d4af37]/50 text-gray-600 hover:text-[#d4af37]/70 transition-colors">
                        {uploadingCell === idx ? (
                          <div className="w-6 h-6 border-2 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 mb-1" />
                            <span className="text-[9px]">Фото {idx + 1}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          ref={(el) => { fileRefs.current[idx] = el; }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadPhoto(f, idx);
                            e.target.value = '';
                          }}
                          disabled={uploadingCell !== null}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Basic Info */}
            <section className="bg-[#141414] border border-white/[0.06] rounded-xl p-5">
              <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wide" style={{ fontFamily: 'Unbounded' }}>Основное</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Имя *</label>
                  <input {...register('displayName')} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="Юлианна" />
                </div>
                <div>
                  <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Slug</label>
                  <input {...register('slug')} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="yulianna" />
                </div>
                <div>
                  <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Биография</label>
                  <textarea {...register('biography')} rows={5} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none resize-none" placeholder="Расскажите о себе..." />
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* RIGHT — Parameters + Rates */}
        <div className="flex-1 overflow-y-auto pb-8">
          <div className="space-y-4">
            <section className="bg-[#141414] border border-white/[0.06] rounded-xl p-5">
              <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wide" style={{ fontFamily: 'Unbounded' }}>Параметры</h2>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Рост</label><input {...register('physicalAttributes.height')} type="number" className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="168" /></div>
                  <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Вес</label><input {...register('physicalAttributes.weight')} type="number" className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="52" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Грудь</label><input {...register('physicalAttributes.bustSize')} type="number" className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="2" /></div>
                  <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Тип</label>
                    <select {...register('physicalAttributes.bustType')} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none">
                      <option value="">-</option><option value="natural">Нат</option><option value="silicone">Сил</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Фигура</label>
                    <select {...register('physicalAttributes.bodyType')} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none">
                      <option value="">-</option><option value="slim">Стройная</option><option value="fit">Спортивная</option><option value="curvy">Пышная</option>
                    </select>
                  </div>
                  <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Темперамент</label>
                    <select {...register('physicalAttributes.temperament')} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none">
                      <option value="">-</option><option value="gentle">Нежный</option><option value="active">Активный</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Волосы</label><input {...register('physicalAttributes.hairColor')} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="Брюнет" /></div>
                  <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Глаза</label><input {...register('physicalAttributes.eyeColor')} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="Карие" /></div>
                </div>
              </div>
            </section>

            <section className="bg-[#141414] border border-white/[0.06] rounded-xl p-5">
              <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wide" style={{ fontFamily: 'Unbounded' }}>Расценки</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Час (₽)</label><input {...register('rateHourly')} type="number" className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="5000" /></div>
                <div><label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Ночь (₽)</label><input {...register('rateOvernight')} type="number" className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="25000" /></div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between items-center">
                <span className="text-[9px] text-gray-500">Итого:</span>
                <span className="text-[#d4af37] font-bold text-sm">{(Number(formData.rateHourly) || 0) + (Number(formData.rateOvernight) || 0)} ₽</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
