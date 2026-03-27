'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WaterSurface } from '@/components/WaterSurface';
import { getHeroImages, setHeroImages, getHeroSlogan, setHeroSlogan, SLOGAN_MAX_LENGTH, type HeroSlogan } from '@/lib/hero-images';
import { useUnsavedWarning } from '@/lib/useUnsavedWarning';
import { Plus, X, GripVertical, ImageIcon, Save, RotateCcw, Type, Upload } from 'lucide-react';

const ALL_AVAILABLE = [
  '/slider/s01.jpg',
  '/slider/s02.jpg',
  '/slider/s03.jpg',
  '/slider/s04.jpg',
  '/slider/s05.jpg',
  '/slider/s06.jpg',
  '/slider/s07.jpg',
  '/slider/s08.jpg',
  '/slider/s09.jpg',
  '/slider/s10.jpg',
];

function buildOverlayRenderer(slogan: HeroSlogan) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
    const padX = 24 * dpr;
    const titleSize = Math.round(28 * dpr);
    const lineH = Math.round(34 * dpr);
    const subSize = Math.round(11 * dpr);
    const baseY = h - lineH * 2 - 16 * dpr - subSize - 24 * dpr;

    const shOx = -82 * dpr;
    const shOy = 2 * dpr;

    const shScale = 1.3;
    const shTitleSize = Math.round(titleSize * shScale);
    const shLineH = Math.round(lineH * shScale);
    const shSubSize = Math.round(subSize * shScale);

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.filter = `blur(${Math.round(4 * dpr)}px)`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.font = `800 ${shTitleSize}px Unbounded, sans-serif`;
    ctx.fillText(slogan.line1, padX + shOx, baseY + shOy);
    ctx.fillText(slogan.line2, padX + shOx, baseY + shLineH + shOy);
    ctx.font = `400 ${shSubSize}px Inter, sans-serif`;
    ctx.fillText(slogan.subtitle, padX + shOx, baseY + shLineH * 2 + 12 * dpr + shOy);
    ctx.restore();

    ctx.save();
    ctx.font = `800 ${titleSize}px Unbounded, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowOffsetX = dpr;
    ctx.shadowOffsetY = dpr;
    ctx.textBaseline = 'top';
    ctx.fillText(slogan.line1, padX, baseY);
    ctx.restore();

    ctx.save();
    ctx.font = `800 ${titleSize}px Unbounded, sans-serif`;
    const metrics = ctx.measureText(slogan.line2);
    const grad = ctx.createLinearGradient(padX, 0, padX + metrics.width, 0);
    grad.addColorStop(0, '#d4af37');
    grad.addColorStop(1, '#f5d76e');
    ctx.fillStyle = grad;
    ctx.textBaseline = 'top';
    ctx.fillText(slogan.line2, padX, baseY + lineH);
    ctx.restore();

    ctx.save();
    ctx.font = `400 ${subSize}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textBaseline = 'top';
    ctx.fillText(slogan.subtitle, padX, baseY + lineH * 2 + 12 * dpr);
    ctx.restore();
  };
}

export default function DashboardHomePage() {
  const [images, setImages] = useState<string[]>([]);
  const [slogan, setSlogan] = useState<HeroSlogan>({ line1: '', line2: '', subtitle: '' });
  const [saved, setSaved] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [extraAvailable, setExtraAvailable] = useState<string[]>([]);
  const pickerFileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  useUnsavedWarning(!saved);

  useEffect(() => {
    setImages(getHeroImages());
    setSlogan(getHeroSlogan());
  }, []);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current.clear();
    };
  }, []);

  const overlayRenderer = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
      buildOverlayRenderer(slogan)(ctx, w, h, dpr);
    },
    [slogan],
  );

  const handleSave = useCallback(() => {
    setHeroImages(images);
    setHeroSlogan(slogan);
    setSaved(true);
  }, [images, slogan]);

  const handleReset = useCallback(() => {
    setImages(getHeroImages());
    setSlogan(getHeroSlogan());
    setSaved(true);
  }, []);

  const addImage = useCallback((src: string) => {
    setImages((prev) => {
      if (prev.includes(src)) return prev;
      return [...prev, src];
    });
    setSaved(false);
  }, []);

  const removeImage = useCallback((idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setSaved(false);
  }, []);

  const handleDragStart = (idx: number) => { dragItem.current = idx; };
  const handleDragEnter = (idx: number) => { dragOver.current = idx; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    setImages((prev) => {
      const copy = [...prev];
      const item = copy.splice(dragItem.current!, 1)[0];
      copy.splice(dragOver.current!, 0, item);
      return copy;
    });
    dragItem.current = null;
    dragOver.current = null;
    setSaved(false);
  };

  const mergedAvailable = [...ALL_AVAILABLE, ...extraAvailable];
  const notSelected = mergedAvailable.filter((src) => !images.includes(src));

  const handlePickerFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.add(url);
    setExtraAvailable((prev) => (prev.includes(url) ? prev : [...prev, url]));
    addImage(url);
  }, [addImage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Главная страница</h1>
          <p className="font-body text-sm text-white/30 mt-1">
            Управление слайдером на главной
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!saved && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Отменить
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              saved
                ? 'bg-white/5 text-white/20 cursor-default'
                : 'bg-[#d4af37] text-black hover:bg-[#c4a030]'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-[#141414]">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="font-body text-xs text-white/30 uppercase tracking-wider">Превью слайдера</span>
          <span className="font-body text-xs text-white/20">{images.length} фото</span>
        </div>
        <div className="aspect-[21/9] relative">
          {images.length > 0 ? (
            <WaterSurface images={images} currentIndex={previewIdx} overlayRenderer={overlayRenderer} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-body text-sm">Добавьте изображения</p>
              </div>
            </div>
          )}
        </div>
        {/* Preview thumbnails */}
        {images.length > 1 && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {images.map((src, i) => (
              <button
                key={src}
                onClick={() => setPreviewIdx(i)}
                className={`flex-shrink-0 w-16 h-10 rounded-md overflow-hidden border-2 transition-all ${
                  i === previewIdx ? 'border-[#d4af37]' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Slogan editor */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#141414]">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Type className="w-4 h-4 text-white/30" />
          <span className="font-body text-xs text-white/30 uppercase tracking-wider">Текст героя</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1.5">
                Строка 1 <span className="text-white/20">({slogan.line1.length}/{SLOGAN_MAX_LENGTH})</span>
              </label>
              <input
                type="text"
                value={slogan.line1}
                maxLength={SLOGAN_MAX_LENGTH}
                onChange={(e) => { setSlogan((s) => ({ ...s, line1: e.target.value })); setSaved(false); }}
                placeholder="Элитное"
                className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all font-display font-extrabold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1.5">
                Строка 2 <span className="text-[#d4af37]/50">золотая</span> <span className="text-white/20">({slogan.line2.length}/{SLOGAN_MAX_LENGTH})</span>
              </label>
              <input
                type="text"
                value={slogan.line2}
                maxLength={SLOGAN_MAX_LENGTH}
                onChange={(e) => { setSlogan((s) => ({ ...s, line2: e.target.value })); setSaved(false); }}
                placeholder="сопровождение"
                className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-[#d4af37] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all font-display font-extrabold"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">
              Подзаголовок
            </label>
            <input
              type="text"
              value={slogan.subtitle}
              onChange={(e) => { setSlogan((s) => ({ ...s, subtitle: e.target.value })); setSaved(false); }}
              placeholder="Приватная платформа..."
              className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white/40 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Selected images — reorderable */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#141414]">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="font-body text-xs text-white/30 uppercase tracking-wider">
            Изображения слайдера
          </span>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 transition-all text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить
          </button>
        </div>

        <div className="p-4">
          {images.length === 0 ? (
            <p className="text-center py-8 font-body text-sm text-white/20">
              Нет изображений. Нажмите «Добавить» чтобы выбрать.
            </p>
          ) : (
            <div className="space-y-2">
              {images.map((src, idx) => (
                <div
                  key={src}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all group cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-4 h-4 text-white/15 group-hover:text-white/30 flex-shrink-0" />
                  <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs text-white/40 truncate">{src}</p>
                    <p className="font-body text-[10px] text-white/15 mt-0.5">
                      Позиция {idx + 1}
                    </p>
                  </div>
                  <button
                    onClick={() => setPreviewIdx(idx)}
                    className="px-2 py-1 rounded text-[10px] text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
                  >
                    Превью
                  </button>
                  <button
                    onClick={() => removeImage(idx)}
                    className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image picker */}
      {showPicker && (
        <div className="rounded-2xl border border-[#d4af37]/20 bg-[#141414]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="font-body text-xs text-white/30 uppercase tracking-wider">
              Доступные изображения
            </span>
            <button
              onClick={() => setShowPicker(false)}
              className="text-white/20 hover:text-white/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-6 cursor-pointer hover:border-[#d4af37]/35 hover:bg-[#d4af37]/5 transition-all">
              <input
                ref={pickerFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handlePickerFileChange}
              />
              <Upload className="w-6 h-6 text-[#d4af37]/80" />
              <span className="font-body text-sm text-white/50">Загрузить новое фото</span>
              <span className="font-body text-[10px] text-white/25">JPEG, PNG или WebP</span>
            </label>
            {notSelected.length === 0 ? (
              <p className="text-center py-6 font-body text-sm text-white/20">
                Все изображения уже добавлены
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {notSelected.map((src) => (
                  <button
                    key={src}
                    onClick={() => addImage(src)}
                    className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.06] hover:border-[#d4af37]/40 transition-all"
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Plus className="w-8 h-8 text-[#d4af37]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
