/**
 * Create Model Profile Page
 * Identical layout to edit page — stays on same page after creation
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProfileSchema, type CreateProfileInput } from '@/lib/validations';
import { ArrowLeft, Upload, Check, AlertCircle, Ruler, Weight, User, X, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

interface GalleryPhoto { id: string; url: string; }

export default function CreateModelPage() {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mainPhoto, setMainPhoto] = useState('');
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [uploadingCell, setUploadingCell] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<CreateProfileInput>({
    resolver: zodResolver(createProfileSchema) as any,
    defaultValues: {
      displayName: 'Новая модель',
      slug: '',
      biography: '',
      physicalAttributes: { age: 22, height: 168, weight: 52, bustSize: 2, bustType: 'natural', bodyType: 'slim', temperament: 'gentle', city: 'Москва' },
    },
  });

  const formData = watch();

  const loadMedia = useCallback(async () => {
    if (!createdId) return;
    try {
      const media = await api.getProfileMedia(createdId);
      setGallery(media.filter((m: any) => m.cdnUrl).map((m: any) => ({ id: m.id, url: m.cdnUrl })));
    } catch { /* non-critical */ }
  }, [createdId]);

  const uploadPhoto = useCallback(async (file: File, cellIndex: number) => {
    if (!createdId) return;
    setUploadingCell(cellIndex);
    setError(null);
    try {
      const { uploadUrl, cdnUrl, mediaId } = await api.generatePresignedUrl({
        fileName: file.name, mimeType: file.type as any, fileSize: file.size, modelId: createdId,
      });
      await api.uploadToMinIO(uploadUrl, file);
      await api.confirmUpload(mediaId, { cdnUrl, modelId: createdId, metadata: { originalName: file.name } });

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
  }, [createdId, gallery.length, mainPhoto, loadMedia]);

  const deletePhoto = useCallback(async (mediaId: string) => {
    try {
      await api.deleteMedia(mediaId);
      await loadMedia();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления');
    }
  }, [loadMedia]);

  const saveModel = async (data: CreateProfileInput) => {
    setIsSaving(true); setError(null); setSuccess(null);
    try {
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
      if (data.rateHourly) payload.rateHourly = Number(data.rateHourly);
      if (data.rateOvernight) payload.rateOvernight = Number(data.rateOvernight);

      if (createdId) {
        const token = localStorage.getItem('accessToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token.replace(/^"|"$/g, '')}`;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models/${createdId}`, {
          method: 'PUT', headers, body: JSON.stringify(payload),
        });
        if (!response.ok) { const e = await response.json(); throw new Error(e.message || 'Ошибка'); }
        setSuccess('Изменения сохранены');
      } else {
        const profile = await api.createProfile(payload);
        setCreatedId(profile.id);
        setCreatedSlug(profile.slug);
        setSuccess('Модель создана! Теперь загрузите фото.');
      }
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Ошибка');
    } finally {
      setIsSaving(false);
    }
  };

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
          <h1 className="text-lg font-bold text-white font-display">{createdId ? 'Редактирование' : 'Новая модель'}</h1>
          {createdSlug && <span className="text-xs text-gray-500">@{createdSlug}</span>}
        </div>
        <button
          onClick={handleSubmit((d) => saveModel(d))}
          disabled={isSaving}
          className="px-4 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs"
        >
          {isSaving ? (
            <><div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> {createdId ? 'Сохранение' : 'Создание'}</>
          ) : (
            <><Check className="w-3.5 h-3.5" /> {createdId ? 'Сохранить' : 'Создать'}</>
          )}
        </button>
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
              <div className="relative aspect-[3/4] bg-[#141414]">
                {mainPhoto ? (
                  <img src={mainPhoto} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <User className="w-12 h-12 text-gray-600 mb-2" />
                    <span className="text-gray-500 text-xs">Нет фото</span>
                  </div>
                )}
              </div>
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
          <form id="create-model-form" onSubmit={handleSubmit((d) => saveModel(d))} className="space-y-4 pb-8">
            {/* 3x3 Upload Grid */}
            <section className="bg-[#141414] border border-white/[0.06] rounded-xl p-5">
              <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wide flex items-center gap-2" style={{ fontFamily: 'Unbounded' }}>
                <Upload className="w-4 h-4" /> Фотографии ({gallery.length})
              </h2>
              {!createdId && (
                <p className="text-[10px] text-gray-500 mb-3">Сначала создайте модель, затем загрузите фото</p>
              )}
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
                      <label className={`w-full h-full flex flex-col items-center justify-center transition-colors ${
                        createdId ? 'cursor-pointer hover:border-[#d4af37]/50 text-gray-600 hover:text-[#d4af37]/70' : 'cursor-not-allowed text-gray-700'
                      }`}>
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
                          disabled={!createdId || uploadingCell !== null}
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
                  <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Имя *</label>
                  <input {...register('displayName')} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="Юлианна" />
                  {errors.displayName && <p className="text-red-500 text-[7px] mt-0.5">{errors.displayName.message}</p>}
                </div>
                <div>
                  <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Slug</label>
                  <input {...register('slug')} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="yulianna" />
                </div>
                <div>
                  <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase">Биография</label>
                  <textarea {...register('biography')} rows={4} className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none resize-none" placeholder="О себе..." />
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
