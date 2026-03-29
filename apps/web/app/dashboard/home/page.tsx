'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WaterSurface } from '@/components/WaterSurface';
import { getHeroImages, setHeroImages, getHeroSlogan, setHeroSlogan, SLOGAN_MAX_LENGTH, type HeroSlogan } from '@/lib/hero-images';
import { useUnsavedWarning } from '@/lib/useUnsavedWarning';
import { Plus, X, GripVertical, ImageIcon, Save, RotateCcw, Type, Upload } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';

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
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';
  const panel = `${t.card} overflow-hidden`;
  const headRow = L
    ? 'flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-5 py-3'
    : 'flex items-center justify-between border-b border-white/[0.06] px-5 py-3';
  const headMuted = L
    ? 'font-body text-xs uppercase tracking-wider text-[#646970]'
    : 'font-body text-xs uppercase tracking-wider text-white/30';
  const headMeta = L ? 'font-body text-xs text-[#646970]' : 'font-body text-xs text-white/20';

  useUnsavedWarning(!saved);

  useEffect(() => {
    setImages(getHeroImages());
    setSlogan(getHeroSlogan());
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
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;
      setExtraAvailable((prev) => (prev.includes(dataUrl) ? prev : [...prev, dataUrl]));
      addImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [addImage]);

  return (
    <div className={`space-y-6 ${t.page}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
            Главная страница
          </h1>
          <p className={`font-body mt-1 text-sm ${headMeta}`}>Управление слайдером на главной</p>
        </div>
        <div className="flex items-center gap-3">
          {!saved && (
            <button type="button" onClick={handleReset} className={t.btnSecondary}>
              <RotateCcw className="h-4 w-4" />
              Отменить
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className={`flex items-center gap-2 rounded px-5 py-2 text-sm font-medium transition-all ${
              saved
                ? L
                  ? 'cursor-default border border-[#c3c4c7] bg-[#f6f7f7] text-[#a7aaad]'
                  : 'cursor-default bg-white/5 text-white/20'
                : L
                  ? 'border border-[#2271b1] bg-[#2271b1] text-white hover:bg-[#135e96]'
                  : 'bg-[#d4af37] text-black hover:bg-[#c4a030]'
            }`}
          >
            <Save className="h-4 w-4" />
            {saved ? 'Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className={panel}>
        <div className={headRow}>
          <span className={headMuted}>Превью слайдера</span>
          <span className={headMeta}>{images.length} фото</span>
        </div>
        <div className="aspect-[21/9] relative">
          {images.length > 0 ? (
            <WaterSurface images={images} currentIndex={previewIdx} overlayRenderer={overlayRenderer} />
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center ${L ? 'bg-[#f6f7f7] text-[#a7aaad]' : 'text-white/20'}`}>
              <div className="text-center">
                <ImageIcon className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p className="font-body text-sm">Добавьте изображения</p>
              </div>
            </div>
          )}
        </div>
        {/* Preview thumbnails */}
        {images.length > 1 && (
          <div
            className={`flex items-center gap-2 overflow-x-auto border-t px-4 py-3 scrollbar-hide ${
              L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.06]'
            }`}
          >
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setPreviewIdx(i)}
                className={`h-10 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                  i === previewIdx
                    ? L
                      ? 'border-[#2271b1]'
                      : 'border-[#d4af37]'
                    : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={panel}>
        <div
          className={
            L
              ? 'flex items-center gap-2 border-b border-[#c3c4c7] bg-[#f6f7f7] px-5 py-3'
              : 'flex items-center gap-2 border-b border-white/[0.06] px-5 py-3'
          }
        >
          <Type className={`h-4 w-4 ${L ? 'text-[#646970]' : 'text-white/30'}`} />
          <span className={headMuted}>Текст героя</span>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={`mb-1.5 block text-xs font-medium ${L ? 'text-[#50575e]' : 'text-white/40'}`}>
                Строка 1{' '}
                <span className={L ? 'text-[#a7aaad]' : 'text-white/20'}>
                  ({slogan.line1.length}/{SLOGAN_MAX_LENGTH})
                </span>
              </label>
              <input
                type="text"
                value={slogan.line1}
                maxLength={SLOGAN_MAX_LENGTH}
                onChange={(e) => {
                  setSlogan((s) => ({ ...s, line1: e.target.value }));
                  setSaved(false);
                }}
                placeholder="Элитное"
                className={`${t.input} font-display font-extrabold`}
              />
            </div>
            <div>
              <label className={`mb-1.5 block text-xs font-medium ${L ? 'text-[#50575e]' : 'text-white/40'}`}>
                Строка 2{' '}
                <span className={L ? 'text-[#2271b1]' : 'text-[#d4af37]/50'}>акцент</span>{' '}
                <span className={L ? 'text-[#a7aaad]' : 'text-white/20'}>({slogan.line2.length}/{SLOGAN_MAX_LENGTH})</span>
              </label>
              <input
                type="text"
                value={slogan.line2}
                maxLength={SLOGAN_MAX_LENGTH}
                onChange={(e) => {
                  setSlogan((s) => ({ ...s, line2: e.target.value }));
                  setSaved(false);
                }}
                placeholder="сопровождение"
                className={`${t.input} font-display font-extrabold ${L ? 'text-[#2271b1]' : 'text-[#d4af37]'}`}
              />
            </div>
          </div>
          <div>
            <label className={`mb-1.5 block text-xs font-medium ${L ? 'text-[#50575e]' : 'text-white/40'}`}>Подзаголовок</label>
            <input
              type="text"
              value={slogan.subtitle}
              onChange={(e) => {
                setSlogan((s) => ({ ...s, subtitle: e.target.value }));
                setSaved(false);
              }}
              placeholder="Приватная платформа..."
              className={`${t.input} ${L ? 'text-[#646970]' : 'text-white/40'}`}
            />
          </div>
        </div>
      </div>

      <div className={panel}>
        <div className={headRow}>
          <span className={headMuted}>Изображения слайдера</span>
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className={
              L
                ? 'flex items-center gap-1.5 rounded border border-[#2271b1] bg-[#f0f6fc] px-3 py-1.5 text-xs font-medium text-[#2271b1] hover:bg-white'
                : 'flex items-center gap-1.5 rounded-lg bg-[#d4af37]/10 px-3 py-1.5 text-xs font-medium text-[#d4af37] transition-all hover:bg-[#d4af37]/20'
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </button>
        </div>

        <div className="p-4">
          {images.length === 0 ? (
            <p className={`py-8 text-center font-body text-sm ${headMeta}`}>
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
                  className={`group flex cursor-grab items-center gap-3 rounded-xl border p-2 transition-all active:cursor-grabbing ${
                    L
                      ? 'border-[#dcdcde] bg-[#f6f7f7] hover:border-[#c3c4c7]'
                      : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]'
                  }`}
                >
                  <GripVertical
                    className={`h-4 w-4 flex-shrink-0 ${L ? 'text-[#a7aaad] group-hover:text-[#646970]' : 'text-white/15 group-hover:text-white/30'}`}
                  />
                  <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-body text-xs ${L ? 'text-[#50575e]' : 'text-white/40'}`}>{src}</p>
                    <p className={`mt-0.5 font-body text-[10px] ${L ? 'text-[#a7aaad]' : 'text-white/15'}`}>Позиция {idx + 1}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewIdx(idx)}
                    className={`rounded px-2 py-1 text-[10px] transition-all ${
                      L ? 'text-[#2271b1] hover:bg-[#f0f6fc]' : 'text-white/20 hover:bg-white/5 hover:text-white/50'
                    }`}
                  >
                    Превью
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className={`rounded-lg p-1.5 transition-all ${
                      L ? 'text-[#a7aaad] hover:bg-[#fcf0f1] hover:text-[#d63638]' : 'text-white/15 hover:bg-red-500/10 hover:text-red-400'
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPicker && (
        <div className={L ? `${t.card} overflow-hidden border-[#2271b1]/30` : 'rounded-2xl border border-[#d4af37]/20 bg-[#141414]'}>
          <div className={headRow}>
            <span className={headMuted}>Доступные изображения</span>
            <button type="button" onClick={() => setShowPicker(false)} className={`transition-colors ${L ? 'text-[#646970] hover:text-[#1d2327]' : 'text-white/20 hover:text-white/50'}`}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4 p-4">
            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 transition-all ${
                L
                  ? 'border-[#c3c4c7] bg-[#f6f7f7] hover:border-[#2271b1] hover:bg-[#f0f6fc]'
                  : 'border-white/[0.12] bg-white/[0.02] hover:border-[#d4af37]/35 hover:bg-[#d4af37]/5'
              }`}
            >
              <input ref={pickerFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handlePickerFileChange} />
              <Upload className={`h-6 w-6 ${L ? 'text-[#2271b1]' : 'text-[#d4af37]/80'}`} />
              <span className={`font-body text-sm ${L ? 'text-[#50575e]' : 'text-white/50'}`}>Загрузить новое фото</span>
              <span className={`font-body text-[10px] ${L ? 'text-[#646970]' : 'text-white/25'}`}>JPEG, PNG или WebP</span>
            </label>
            {notSelected.length === 0 ? (
              <p className={`py-6 text-center font-body text-sm ${headMeta}`}>Все изображения уже добавлены</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {notSelected.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => addImage(src)}
                    className={`group relative aspect-[3/4] overflow-hidden rounded-xl border transition-all ${
                      L ? 'border-[#c3c4c7] hover:border-[#2271b1]' : 'border-white/[0.06] hover:border-[#d4af37]/40'
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Plus className={`h-8 w-8 ${accent}`} />
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
