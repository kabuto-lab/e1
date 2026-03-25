/**
 * Edit Model Profile Page
 * Identical layout to create page with live preview
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProfileSchema, type CreateProfileInput } from '@/lib/validations';
import { ArrowLeft, Upload, X, Check, AlertCircle, Ruler, Weight, Smartphone, User, MapPin, Star } from 'lucide-react';
import Link from 'next/link';

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
  };
  rateHourly?: number;
  rateOvernight?: number;
  mainPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditModelPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [model, setModel] = useState<ModelProfile | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateProfileInput>({
    mode: 'onSubmit',
  });

  const formData = watch();

  useEffect(() => {
    loadModel();
  }, [modelId]);

  const loadModel = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models/id/${modelId}`);
      
      if (!response.ok) {
        throw new Error('Модель не найдена');
      }
      
      const data = await response.json();
      if (!data) {
        throw new Error('Модель не найдена');
      }
      
      setModel(data);
      
      // Populate ALL form fields with proper defaults
      const attrs = data.physicalAttributes || {};
      
      // Reset form with ALL values - use setValue for each field individually
      setValue('displayName', data.displayName || '');
      setValue('slug', data.slug || '');
      setValue('biography', data.biography || '');
      
      // Physical attributes
      if (attrs.age) setValue('physicalAttributes.age', attrs.age);
      if (attrs.height) setValue('physicalAttributes.height', attrs.height);
      if (attrs.weight) setValue('physicalAttributes.weight', attrs.weight);
      if (attrs.bustSize) setValue('physicalAttributes.bustSize', attrs.bustSize);
      if (attrs.bustType) setValue('physicalAttributes.bustType', attrs.bustType);
      if (attrs.bodyType) setValue('physicalAttributes.bodyType', attrs.bodyType);
      if (attrs.temperament) setValue('physicalAttributes.temperament', attrs.temperament);
      if (attrs.sexuality) setValue('physicalAttributes.sexuality', attrs.sexuality);
      if (attrs.hairColor) setValue('physicalAttributes.hairColor', attrs.hairColor);
      if (attrs.eyeColor) setValue('physicalAttributes.eyeColor', attrs.eyeColor);
      
      // Rates
      if (data.rateHourly) setValue('rateHourly', data.rateHourly);
      if (data.rateOvernight) setValue('rateOvernight', data.rateOvernight);
      
      // Load main photo
      if (data.mainPhotoUrl) {
        setUploadedImages([data.mainPhotoUrl]);
      }
    } catch (err: any) {
      console.error('Failed to load model:', err);
      setError(err.message || 'Не удалось загрузить модель');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = handleSubmit((data) => {
    saveModel(data);
  });

  const saveModel = async (data: CreateProfileInput) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const cleanedData: any = {
        displayName: data.displayName?.trim() || '',
      };

      if (data.slug?.trim()) cleanedData.slug = data.slug.trim();
      if (data.biography?.trim()) cleanedData.biography = data.biography.trim();

      const attrs: any = {};
      if (data.physicalAttributes) {
        const { age, height, weight, bustSize, bustType, bodyType, temperament, hairColor, eyeColor } = data.physicalAttributes;
        if (age && age > 0) attrs.age = age;
        if (height && height > 0) attrs.height = height;
        if (weight && weight > 0) attrs.weight = weight;
        if (bustSize && bustSize > 0) attrs.bustSize = bustSize;
        if (bustType) attrs.bustType = bustType;
        if (bodyType) attrs.bodyType = bodyType;
        if (temperament) attrs.temperament = temperament;
        if (hairColor?.trim()) attrs.hairColor = hairColor.trim();
        if (eyeColor?.trim()) attrs.eyeColor = eyeColor.trim();
      }

      if (Object.keys(attrs).length > 0) cleanedData.physicalAttributes = attrs;
      if (data.rateHourly && data.rateHourly > 0) cleanedData.rateHourly = data.rateHourly;
      if (data.rateOvernight && data.rateOvernight > 0) cleanedData.rateOvernight = data.rateOvernight;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Не удалось сохранить изменения');
      }

      setSuccess('Изменения успешно сохранены');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to update model:', err);
      setError(err.message || 'Не удалось сохранить изменения');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => setUploadedImages(prev => prev.filter((_, i) => i !== idx));

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      online: 'bg-green-500',
      offline: 'bg-gray-500',
      in_shift: 'bg-yellow-500',
      busy: 'bg-red-500',
    };
    const labels: Record<string, string> = {
      online: 'Свободна',
      offline: 'Оффлайн',
      in_shift: 'В смене',
      busy: 'Занята',
    };
    return (
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/80 rounded-full">
        <div className={`w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-gray-500'}`} />
        <span className="text-white text-[8px]">{labels[status] || 'Оффлайн'}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загрузка модели...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Модель не найдена</h2>
          <p className="text-gray-400 mb-4">Запрошенная модель не существует</p>
          <Link href="/dashboard/models" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg transition-all">
            <ArrowLeft className="w-4 h-4" />
            Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ fontFamily: 'Inter' }}>
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 px-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/models" className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Unbounded' }}>Редактирование</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/models/${modelId}/photos`}
            className="px-5 py-2 bg-[#1a1a1a] border border-[#333] text-white font-semibold rounded-lg hover:border-[#d4af37]/30 transition-all flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Фото
          </Link>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className="px-5 py-2 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {isSaving ? (
              <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Сохранение...</>
            ) : (
              <><Check className="w-4 h-4" /> Сохранить</>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3 mb-4 flex-shrink-0 mx-6">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div><div className="text-red-500 font-medium text-sm">Ошибка</div><div className="text-red-400 text-xs">{error}</div></div>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-start gap-3 mb-4 flex-shrink-0 mx-6">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <div><div className="text-green-500 font-medium text-sm">Успешно</div><div className="text-green-400 text-xs">{success}</div></div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-6 flex-1 overflow-hidden min-h-0 px-6">
        {/* LEFT - Sticky Mobile Preview (LARGER - 95vh) */}
        <div className="w-[420px] flex-shrink-0">
          <div className="sticky top-0">
            {/* Mobile Frame - 95vh height */}
            <div className="relative mx-auto border-4 border-[#333] rounded-[3rem] overflow-hidden bg-[#0a0a0a] shadow-2xl" style={{ height: '95vh' }}>
              {/* Status Bar */}
              <div className="h-8 bg-[#1a1a1a] flex items-center justify-between px-4">
                <span className="text-[10px] text-gray-500 font-medium">9:41</span>
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-700" /><div className="w-2.5 h-2.5 rounded-full bg-gray-700" /></div>
              </div>

              {/* Content */}
              <div className="h-[calc(95vh-32px)] overflow-y-auto">
                {/* Photo - Larger */}
                <div className="relative">
                  <label className="block cursor-pointer">
                    <div className="relative aspect-[3/4] bg-[#1a1a1a] group">
                      {uploadedImages.length > 0 ? (
                        <><img src={uploadedImages[0]} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Upload className="w-8 h-8 text-white" /></div></>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center border-4 border-dashed border-[#333] group-hover:border-[#d4af37]/50"><Upload className="w-10 h-10 text-gray-600 mb-2" /><span className="text-gray-500 text-[11px] text-center font-medium">Загрузить фото</span></div>
                      )}
                    </div>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  </label>
                  <StatusBadge status={model.availabilityStatus || 'online'} />
                </div>

                {/* Form Fields INSIDE mockup */}
                <div className="p-4 bg-[#1a1a1a]">
                  {/* Name */}
                  <div className="mb-3">
                    <label className="block text-[9px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Имя</label>
                    <input {...register('displayName')} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="Юлианна" />
                    {errors.displayName && <p className="text-red-500 text-[8px] mt-1">{errors.displayName.message}</p>}
                  </div>

                  {/* Age & City */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="block text-[9px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Возраст</label>
                      <input {...register('physicalAttributes.age', { valueAsNumber: true })} type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="22" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Город</label>
                      <input {...register('physicalAttributes.hairColor')} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="Москва" />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 mb-3 pb-3 border-b border-[#333]">
                    <span className="flex items-center gap-1"><Ruler className="w-2.5 h-2.5" /> {formData.physicalAttributes?.height || '---'} см</span>
                    <span className="flex items-center gap-1"><Weight className="w-2.5 h-2.5" /> {formData.physicalAttributes?.weight || '---'} кг</span>
                  </div>

                  {/* Rates */}
                  {(formData.rateHourly || formData.rateOvernight) && (
                    <div className="pt-3">
                      <div className="flex justify-between text-[9px] mb-1.5"><span className="text-gray-500">Час:</span><span className="text-[#d4af37] font-semibold">{formData.rateHourly || '---'} ₽</span></div>
                      <div className="flex justify-between text-[9px]"><span className="text-gray-500">Ночь:</span><span className="text-[#d4af37] font-semibold">{formData.rateOvernight || '---'} ₽</span></div>
                    </div>
                  )}
                </div>

                {/* Additional Photos */}
                {uploadedImages.length > 1 && (
                  <div className="p-4 bg-[#1a1a1a] border-t border-[#333]">
                    <h3 className="text-[9px] font-medium text-gray-500 mb-2.5 uppercase tracking-wide">Фото ({uploadedImages.length})</h3>
                    <div className="grid grid-cols-3 gap-1">
                      {uploadedImages.slice(1).map((img, idx) => (
                        <div key={idx} className="relative aspect-square">
                          <img src={img} alt="" className="w-full h-full object-cover rounded" />
                          <button onClick={() => removeImage(idx + 1)} className="absolute top-1 right-1 p-1 bg-black/80 rounded-full hover:bg-red-500/80"><X className="w-2 h-2 text-white" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <div className="mt-3">
              <label className="block">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                <div className="w-full py-3 bg-[#0a0a0a] border-2 border-dashed border-[#333] rounded-xl flex items-center justify-center cursor-pointer hover:border-[#d4af37]/50 transition-colors"><Upload className="w-4 h-4 text-gray-600 mr-2" /><span className="text-gray-500 text-[11px] font-medium">Добавить ещё фото</span></div>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT - Compact Combined Form (2 columns merged into 1) */}
        <div className="flex-1 overflow-y-auto">
          <form id="edit-model-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 2 Column Grid - More Compact */}
            <div className="grid grid-cols-2 gap-4">

              {/* Column 1: Basic Info */}
              <div>
                <section className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
                  <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wide" style={{ fontFamily: 'Unbounded' }}>📋 Основное</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Имя *</label>
                      <input {...register('displayName')} id="displayName" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="Юлианна" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Slug</label>
                      <input {...register('slug')} id="slug" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="yulianna" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Биография</label>
                      <textarea {...register('biography')} id="biography" rows={5} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none resize-none transition-colors" placeholder="Расскажите о себе..." />
                    </div>
                  </div>
                </section>
              </div>

              {/* Column 2: Physical + Rates Combined */}
              <div className="space-y-4">
                <section className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
                  <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wide" style={{ fontFamily: 'Unbounded' }}>📊 Параметры</h2>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Рост</label>
                        <input {...register('physicalAttributes.height', { valueAsNumber: true })} id="height" type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="168" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Вес</label>
                        <input {...register('physicalAttributes.weight', { valueAsNumber: true })} id="weight" type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="52" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Грудь</label>
                        <input {...register('physicalAttributes.bustSize', { valueAsNumber: true })} id="bustSize" type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="2" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Тип</label>
                        <select {...register('physicalAttributes.bustType')} id="bustType" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors">
                          <option value="">-</option>
                          <option value="natural">Нат</option>
                          <option value="silicone">Сил</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Фигура</label>
                        <select {...register('physicalAttributes.bodyType')} id="bodyType" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors">
                          <option value="">-</option>
                          <option value="slim">Стройная</option>
                          <option value="fit">Спортивная</option>
                          <option value="curvy">Пышная</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Темперамент</label>
                        <select {...register('physicalAttributes.temperament')} id="temperament" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors">
                          <option value="">-</option>
                          <option value="gentle">Нежный</option>
                          <option value="active">Активный</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Волосы</label>
                        <input {...register('physicalAttributes.hairColor')} id="hairColor" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="Брюнет" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Глаза</label>
                        <input {...register('physicalAttributes.eyeColor')} id="eyeColor" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="Карие" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Rates - Combined below Physical */}
                <section className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
                  <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wide" style={{ fontFamily: 'Unbounded' }}>💰 Расценки</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Час (₽)</label>
                      <input {...register('rateHourly', { valueAsNumber: true })} id="rateHourly" type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="5000" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Ночь (₽)</label>
                      <input {...register('rateOvernight', { valueAsNumber: true })} id="rateOvernight" type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:border-[#d4af37] outline-none transition-colors" placeholder="25000" />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#333]">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-gray-500">Итого:</span>
                      <span className="text-[#d4af37] font-bold text-sm">{(formData.rateHourly || 0) + (formData.rateOvernight || 0)} ₽</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
