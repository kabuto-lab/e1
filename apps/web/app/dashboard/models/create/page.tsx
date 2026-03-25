/**
 * Create Model Profile Page
 * Compact layout with sticky mobile preview
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProfileSchema, type CreateProfileInput } from '@/lib/validations';
import { api } from '@/lib/api-client';
import { ArrowLeft, Upload, X, Check, AlertCircle, Ruler, Weight, User, DollarSign, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CreateModelPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [slugError, setSlugError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateProfileInput>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      displayName: '',
      slug: '',
      biography: '',
      physicalAttributes: {},
      rateHourly: undefined,
      rateOvernight: undefined,
    },
  });

  const formData = watch();

  const onSubmit = async (data: CreateProfileInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate displayName before sending
      const displayName = data.displayName?.trim();
      if (!displayName || displayName.length === 0) {
        throw new Error('Имя обязательно для заполнения');
      }

      const cleanedData: any = { displayName };
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

      console.log('Creating profile with data:', JSON.stringify(cleanedData));

      const profile = await api.createProfile(cleanedData);
      setCreatedProfileId(profile.id);
      router.push(`/dashboard/models/${profile.id}/photos`);
    } catch (err: any) {
      console.error('Create profile error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ fontFamily: 'Inter' }}>
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 px-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/models" className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Unbounded' }}>Новая модель</h1>
        </div>
        <button
          type="submit"
          form="create-model-form"
          disabled={isLoading || !!slugError}
          className="px-5 py-2 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
          style={{ fontFamily: 'Inter' }}
        >
          {isLoading ? (
            <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Создание...</>
          ) : (
            <><Check className="w-4 h-4" /> Создать и продолжить</>
          )}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3 mb-4 flex-shrink-0 mx-6">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div><div className="text-red-500 font-medium text-sm">Ошибка</div><div className="text-red-400 text-xs">{error}</div></div>
        </div>
      )}

      {slugError && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-3 mb-4 flex-shrink-0 mx-6">
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div><div className="text-yellow-500 font-medium text-sm">URL занят</div><div className="text-yellow-400 text-xs">{slugError}</div></div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-4 flex-1 overflow-hidden min-h-0 px-6">
        {/* LEFT - Sticky Mobile Preview */}
        <div className="w-[320px] flex-shrink-0">
          <div className="sticky top-0">
            {/* Mobile Frame */}
            <div className="relative mx-auto border-2 border-[#333] rounded-3xl overflow-hidden bg-[#0a0a0a]">
              {/* Status Bar */}
              <div className="h-6 bg-[#1a1a1a] flex items-center justify-between px-3">
                <span className="text-[9px] text-gray-500" style={{ fontFamily: 'Inter' }}>9:41</span>
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-gray-700" /><div className="w-2 h-2 rounded-full bg-gray-700" /></div>
              </div>

              {/* Content */}
              <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
                {/* Photo Upload */}
                <div className="relative">
                  <label className="block cursor-pointer">
                    <div className="relative aspect-[3/4] bg-[#1a1a1a] group">
                      {uploadedImages.length > 0 ? (
                        <><img src={uploadedImages[0]} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Upload className="w-6 h-6 text-white" /></div></>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-[#333] group-hover:border-[#d4af37]/50"><Upload className="w-8 h-8 text-gray-600 mb-2" /><span className="text-gray-500 text-[9px] text-center">Загрузить фото</span></div>
                      )}
                    </div>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  </label>
                  {/* Status */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/80 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /><span className="text-white text-[8px]">Свободна</span></div>
                </div>

                {/* Form Fields INSIDE mockup */}
                <div className="p-3 bg-[#1a1a1a]">
                  {/* Name */}
                  <div className="mb-2">
                    <label className="block text-[8px] font-medium text-gray-500 mb-1 uppercase">Имя</label>
                    <input {...register('displayName')} className="w-full bg-[#0a0a0a] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="Юлианна" style={{ fontFamily: 'Inter' }} />
                    {errors.displayName && <p className="text-red-500 text-[7px] mt-0.5">{errors.displayName.message}</p>}
                  </div>

                  {/* Age & City */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    <div>
                      <label className="block text-[8px] font-medium text-gray-500 mb-1 uppercase">Возраст</label>
                      <input {...register('physicalAttributes.age', { valueAsNumber: true })} type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="22" style={{ fontFamily: 'Inter' }} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-medium text-gray-500 mb-1 uppercase">Город</label>
                      <input {...register('physicalAttributes.hairColor')} className="w-full bg-[#0a0a0a] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="Москва" style={{ fontFamily: 'Inter' }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2 text-[8px] text-gray-500 mb-2">
                    <span><Ruler className="w-2 h-2 inline" /> {formData.physicalAttributes?.height || '---'} см</span>
                    <span><Weight className="w-2 h-2 inline" /> {formData.physicalAttributes?.weight || '---'} кг</span>
                  </div>

                  {/* Rates */}
                  {(formData.rateHourly || formData.rateOvernight) && (
                    <div className="pt-2 border-t border-[#333]">
                      <div className="flex justify-between text-[7px]"><span className="text-gray-500">Час:</span><span className="text-[#d4af37]">{formData.rateHourly || '---'} ₽</span></div>
                      <div className="flex justify-between text-[7px]"><span className="text-gray-500">Ночь:</span><span className="text-[#d4af37]">{formData.rateOvernight || '---'} ₽</span></div>
                    </div>
                  )}
                </div>

                {/* Additional Photos */}
                {uploadedImages.length > 1 && (
                  <div className="p-3 bg-[#1a1a1a] border-t border-[#333]">
                    <h3 className="text-[8px] font-medium text-gray-500 mb-2 uppercase">Фото ({uploadedImages.length})</h3>
                    <div className="grid grid-cols-3 gap-0.5">
                      {uploadedImages.slice(1).map((img, idx) => (
                        <div key={idx} className="relative aspect-square">
                          <img src={img} alt="" className="w-full h-full object-cover rounded" />
                          <button onClick={() => removeImage(idx + 1)} className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 rounded-full hover:bg-red-500/70"><X className="w-1.5 h-1.5 text-white" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <div className="mt-2">
              <label className="block">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                <div className="w-full py-2 bg-[#0a0a0a] border-2 border-dashed border-[#333] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#d4af37]/50"><Upload className="w-3.5 h-3.5 text-gray-600 mr-1.5" /><span className="text-gray-500 text-[10px]">Ещё фото</span></div>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT - Compact Form (3 columns) */}
        <div className="flex-1 overflow-y-auto">
          <form id="create-model-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* 3 Column Grid */}
            <div className="grid grid-cols-3 gap-3">
              
              {/* Column 1: Basic Info */}
              <div className="space-y-3">
                <section className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 h-full">
                  <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Основное
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Имя *</label>
                      <input {...register('displayName')} className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="Юлианна" />
                      {errors.displayName && <p className="text-red-500 text-[7px] mt-0.5">{errors.displayName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Slug</label>
                      <input {...register('slug')} className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="yulianna" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Биография</label>
                      <textarea {...register('biography')} rows={4} className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none resize-none" placeholder="О себе..." />
                    </div>
                  </div>
                </section>
              </div>

              {/* Column 2: Physical */}
              <div className="space-y-3">
                <section className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 h-full">
                  <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase flex items-center gap-2">
                    <User className="w-3 h-3" /> Параметры
                  </h2>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Рост</label>
                        <input {...register('physicalAttributes.height', { valueAsNumber: true })} type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="168" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Вес</label>
                        <input {...register('physicalAttributes.weight', { valueAsNumber: true })} type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="52" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Грудь</label>
                        <input {...register('physicalAttributes.bustSize', { valueAsNumber: true })} type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="2" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Тип</label>
                        <select {...register('physicalAttributes.bustType')} className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none">
                          <option value="">-</option>
                          <option value="natural">Нат</option>
                          <option value="silicone">Сил</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Фигура</label>
                      <select {...register('physicalAttributes.bodyType')} className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none">
                        <option value="">-</option>
                        <option value="slim">Стройная</option>
                        <option value="fit">Спортивная</option>
                        <option value="curvy">Пышная</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Темперамент</label>
                      <select {...register('physicalAttributes.temperament')} className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none">
                        <option value="">-</option>
                        <option value="gentle">Нежный</option>
                        <option value="active">Активный</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Волосы</label>
                        <input {...register('physicalAttributes.hairColor')} className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="Брюнет" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Глаза</label>
                        <input {...register('physicalAttributes.eyeColor')} className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="Карие" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Column 3: Rates */}
              <div className="space-y-3">
                <section className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 h-full">
                  <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> Расценки
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Час (₽)</label>
                      <input {...register('rateHourly', { valueAsNumber: true })} type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="5000" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-gray-400 mb-1 uppercase">Ночь (₽)</label>
                      <input {...register('rateOvernight', { valueAsNumber: true })} type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white focus:border-[#d4af37] outline-none" placeholder="25000" />
                    </div>
                    <div className="pt-3 border-t border-[#333]">
                      <div className="flex justify-between text-[8px] mb-1">
                        <span className="text-gray-500">Итого:</span>
                        <span className="text-[#d4af37]">
                          {(formData.rateHourly || 0) + (formData.rateOvernight || 0)} ₽
                        </span>
                      </div>
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
