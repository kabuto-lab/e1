'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { HeroImageSlider } from '@/components/HeroImageSlider';
import { getHeroImages, setHeroImages, getHeroSlogan, setHeroSlogan, SLOGAN_MAX_LENGTH, type HeroSlogan } from '@/lib/hero-images';
import { useUnsavedWarning } from '@/lib/useUnsavedWarning';
import { Plus, X, GripVertical, ImageIcon, Save, RotateCcw, Type, Upload, Camera } from 'lucide-react';
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
  const [stripDropTarget, setStripDropTarget] = useState<
    null | 'add' | { type: 'thumb'; index: number; edge: 'left' | 'right' }
  >(null);
  const [stripDraggingIdx, setStripDraggingIdx] = useState<number | null>(null);
  const pickerFileInputRef = useRef<HTMLInputElement>(null);
  const thumbReplaceInputRef = useRef<HTMLInputElement>(null);
  const replaceSlideIndexRef = useRef<number | null>(null);
  const stripDragFrom = useRef<number | null>(null);
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';
  const panel = `${t.card} overflow-hidden`;
  const headRow = L
    ? 'flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-5 py-3'
    : 'flex items-center justify-between border-b border-white/[0.06] px-5 py-3';
  /** Шапка карточки главного слайдера: крупный заголовок как у «Главная страница» + «превью» мелко в той же строке */
  const sliderHeadRow = L
    ? 'flex flex-wrap items-center justify-between gap-3 border-b border-[#c3c4c7] bg-[#f6f7f7] px-5 py-4'
    : 'flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4';
  const sliderTitleClass = `font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`;
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
      const next = [...prev, src];
      setPreviewIdx(next.length - 1);
      return next;
    });
    setSaved(false);
  }, []);

  const removeImage = useCallback((idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviewIdx((p) => {
      if (idx < p) return p - 1;
      if (idx === p) return Math.max(0, p - 1);
      return p;
    });
    setSaved(false);
  }, []);

  /** `to` — целевой индекс в исходном массиве (0..length), length = в конец. */
  const reorderStrip = useCallback((from: number, to: number) => {
    if (from === to) return;
    setImages((prev) => {
      if (from < 0 || from >= prev.length) return prev;
      const selectedUrl = prev[previewIdx];
      const item = prev[from];
      const w = prev.filter((_, i) => i !== from);
      let insertAt: number;
      if (to >= prev.length) {
        insertAt = w.length;
      } else if (from < to) {
        insertAt = to - 1;
      } else {
        insertAt = to;
      }
      const next = [...w];
      next.splice(insertAt, 0, item);
      const ni = Math.max(0, next.indexOf(selectedUrl));
      Promise.resolve().then(() => setPreviewIdx(ni));
      setSaved(false);
      return next;
    });
  }, [previewIdx]);

  const handleStripDragStart = (idx: number) => {
    stripDragFrom.current = idx;
    setStripDraggingIdx(idx);
  };

  const handleStripDragEnd = () => {
    stripDragFrom.current = null;
    setStripDraggingIdx(null);
    setStripDropTarget(null);
  };

  /**
   * Ближняя к исходному слайду половина миниатюры — без перемещения.
   * Дальняя — реальный reorder: to в исходном массиве = вставка перед i (слева) или после i (справа).
   */
  const thumbDropEffectiveTo = (clientX: number, thumbEl: HTMLElement, from: number, i: number): number | null => {
    if (from === i) return null;
    const rect = thumbEl.getBoundingClientRect();
    const isRightHalf = clientX >= rect.left + rect.width / 2;
    if (i > from) {
      if (!isRightHalf) return null;
      return i + 1;
    }
    if (!isRightHalf) return i;
    return null;
  };

  /** Drop on thumb at index `i` (0..length-1). */
  const handleStripDropOnThumb = (e: React.DragEvent<HTMLElement>, i: number) => {
    const from = stripDragFrom.current;
    if (from === null) return;
    const to = thumbDropEffectiveTo(e.clientX, e.currentTarget, from, i);
    if (to === null) return;
    reorderStrip(from, to);
    stripDragFrom.current = null;
  };

  /** Drop on «+» zone — в конец списка. */
  const handleStripDropOnAdd = () => {
    const from = stripDragFrom.current;
    stripDragFrom.current = null;
    if (from === null) return;
    setImages((prev) => {
      if (from < 0 || from >= prev.length || from === prev.length - 1) return prev;
      const selectedUrl = prev[previewIdx];
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.push(item);
      const ni = Math.max(0, next.indexOf(selectedUrl));
      Promise.resolve().then(() => setPreviewIdx(ni));
      setSaved(false);
      return next;
    });
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

  const handleThumbReplaceFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const idx = replaceSlideIndexRef.current;
    replaceSlideIndexRef.current = null;
    if (!file || idx === null) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;
      setExtraAvailable((prev) => (prev.includes(dataUrl) ? prev : [...prev, dataUrl]));
      setImages((prev) => {
        if (idx < 0 || idx >= prev.length) return prev;
        const next = [...prev];
        next[idx] = dataUrl;
        return next;
      });
      setPreviewIdx(idx);
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const openReplaceSlideFile = useCallback((index: number) => {
    replaceSlideIndexRef.current = index;
    thumbReplaceInputRef.current?.click();
  }, []);

  const thumbKey = (src: string, i: number) => `${i}-${src.length > 64 ? src.slice(0, 64) : src}`;

  return (
    <div className={`space-y-6 ${t.page}`}>
      <input
        id="dashboard-hero-file"
        ref={pickerFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-hidden
        onChange={handlePickerFileChange}
      />
      <input
        ref={thumbReplaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleThumbReplaceFileChange}
      />

      <div className={panel}>
        <div className={sliderHeadRow}>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className={sliderTitleClass}>Главный слайдер</span>
            <span className={`font-body text-xs font-normal lowercase ${L ? 'text-[#646970]' : 'text-white/35'}`}>
              превью
            </span>
          </div>
          <span className={`shrink-0 ${headMeta}`}>{images.length} фото</span>
        </div>
        <div className="aspect-[21/9] relative">
          {images.length > 0 ? (
            <HeroImageSlider images={images} currentIndex={previewIdx} overlayRenderer={overlayRenderer} />
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center ${L ? 'bg-[#f6f7f7] text-[#a7aaad]' : 'text-white/20'}`}>
              <div className="text-center">
                <ImageIcon className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p className="font-body text-sm">Добавьте изображения</p>
              </div>
            </div>
          )}
        </div>
        {/* Миниатюры: перетаскивание только с области картинки; подсветка цели drop */}
        <div
          className={`flex items-end gap-2.5 overflow-x-auto border-t px-4 py-3 scrollbar-hide ${
            L ? 'border-[#c3c4c7] bg-[#fcfcfc]' : 'border-white/[0.08] bg-black/30'
          }`}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setStripDropTarget(null);
          }}
        >
          {images.map((src, i) => {
            const st = stripDropTarget;
            const farHighlight =
              st && typeof st === 'object' && st.type === 'thumb' && st.index === i ? st.edge : null;
            const dropAccent = L ? 'border-[#2271b1]' : 'border-[#22d3ee]';
            const dropGlow = L ? 'shadow-[0_0_14px_rgba(34,113,177,0.45)]' : 'shadow-[0_0_12px_rgba(34,211,238,0.35)]';
            return (
              <div
                key={thumbKey(src, i)}
                className="group relative flex flex-shrink-0 flex-col items-stretch rounded-lg transition-all"
              >
                <div
                  className={`relative h-[4.5rem] w-[5.5rem] flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    i === previewIdx
                      ? L
                        ? 'border-[#2271b1] ring-2 ring-[#2271b1]/25'
                        : 'border-[#d4af37] shadow-[0_0_0_1px_rgba(212,175,55,0.35)]'
                      : L
                        ? 'border-[#dcdcde] group-hover:border-[#2271b1]/50'
                        : 'border-[#d4af37]/35 group-hover:border-[#d4af37]/65'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const dragFrom = stripDragFrom.current;
                    if (dragFrom === null || dragFrom === i) {
                      e.dataTransfer.dropEffect = 'none';
                      setStripDropTarget(null);
                      return;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    const isRightHalf = e.clientX >= rect.left + rect.width / 2;
                    const isFar = i > dragFrom ? isRightHalf : !isRightHalf;
                    if (!isFar) {
                      e.dataTransfer.dropEffect = 'none';
                      setStripDropTarget(null);
                      return;
                    }
                    e.dataTransfer.dropEffect = 'move';
                    setStripDropTarget({
                      type: 'thumb',
                      index: i,
                      edge: i > dragFrom ? 'right' : 'left',
                    });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStripDropOnThumb(e, i);
                    setStripDropTarget(null);
                  }}
                >
                  {farHighlight === 'left' ? (
                    <div
                      className={`pointer-events-none absolute inset-y-0 left-0 z-[3] w-1/2 rounded-l-md border-b-2 border-l-2 border-t-2 ${dropAccent} ${dropGlow}`}
                      aria-hidden
                    />
                  ) : null}
                  {farHighlight === 'right' ? (
                    <div
                      className={`pointer-events-none absolute inset-y-0 right-0 z-[3] w-1/2 rounded-r-md border-b-2 border-r-2 border-t-2 ${dropAccent} ${dropGlow}`}
                      aria-hidden
                    />
                  ) : null}
                  <div
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                      handleStripDragStart(i);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(i));
                    }}
                    onDragEnd={handleStripDragEnd}
                    onClick={() => setPreviewIdx(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPreviewIdx(i);
                      }
                    }}
                    className={`relative z-0 h-full w-full cursor-grab overflow-hidden active:cursor-grabbing ${
                      stripDraggingIdx === i ? 'opacity-55' : ''
                    }`}
                    aria-label={`Слайд ${i + 1}: перетащить для порядка или нажать для превью`}
                  >
                    <img src={src} alt="" className="pointer-events-none h-full w-full object-cover select-none" draggable={false} />
                  </div>
                  <div
                    className={`pointer-events-none absolute left-0.5 top-0.5 z-[1] rounded bg-black/55 px-0.5 ${L ? 'text-[#a7aaad]' : 'text-[#d4af37]/90'}`}
                    aria-hidden
                  >
                    <GripVertical className="h-3 w-3" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(i);
                    }}
                    className={`absolute right-0.5 top-0.5 z-[2] rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
                      L ? 'bg-white/95 text-[#d63638] hover:bg-[#fcf0f1]' : 'bg-black/80 text-red-300 hover:bg-red-500/30'
                    }`}
                    aria-label="Убрать слайд"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openReplaceSlideFile(i);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`absolute bottom-0.5 right-0.5 z-[4] flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 ${
                      L
                        ? 'bg-white text-[#2271b1] ring-1 ring-[#c3c4c7] hover:bg-[#f0f6fc]'
                        : 'bg-black/85 text-[#d4af37] ring-1 ring-[#d4af37]/45 hover:bg-black'
                    }`}
                    title="Другое фото"
                    aria-label={`Заменить фото слайда ${i + 1}`}
                  >
                    <Camera className="h-3 w-3" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => pickerFileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setStripDropTarget('add');
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setStripDropTarget(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleStripDropOnAdd();
              setStripDropTarget(null);
            }}
            className={`flex h-[4.5rem] min-w-[5.5rem] flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed transition-all ${
              stripDropTarget === 'add'
                ? L
                  ? 'border-[#2271b1] bg-[#2271b1]/15 ring-2 ring-[#2271b1]/50 ring-offset-2 ring-offset-[#fcfcfc]'
                  : 'border-[#d4af37] bg-[#d4af37]/20 ring-2 ring-[#d4af37]/55 ring-offset-2 ring-offset-black/40'
                : L
                  ? 'border-[#2271b1]/45 bg-[#f0f6fc]/80 text-[#2271b1] hover:border-[#2271b1] hover:bg-[#f0f6fc]'
                  : 'border-[#d4af37]/50 bg-[#d4af37]/[0.07] text-[#d4af37] hover:border-[#d4af37] hover:bg-[#d4af37]/12'
            }`}
            aria-label="Добавить слайд"
          >
            <Plus className="h-6 w-6" strokeWidth={2.2} />
            <span className="font-body text-[9px] font-medium uppercase tracking-wide opacity-80">Добавить</span>
          </button>
        </div>
      </div>

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
          <p className={`font-body text-sm leading-relaxed ${headMeta}`}>
            Порядок слайдов и миниатюры — в полосе под превью: перетаскивайте карточки, «+» справа — загрузка с
            устройства. Здесь — готовые кадры из набора сайта.
          </p>
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
              htmlFor="dashboard-hero-file"
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 transition-all ${
                L
                  ? 'border-[#c3c4c7] bg-[#f6f7f7] hover:border-[#2271b1] hover:bg-[#f0f6fc]'
                  : 'border-white/[0.12] bg-white/[0.02] hover:border-[#d4af37]/35 hover:bg-[#d4af37]/5'
              }`}
            >
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
