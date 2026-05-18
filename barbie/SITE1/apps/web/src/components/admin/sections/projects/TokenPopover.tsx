'use client';

import { useEffect, useRef, useState } from 'react';
import { TOKEN_FONTS } from '@/lib/projects-data';

export type PopoverRole = 'bg' | 'head' | 'acc' | 'body';

interface PopoverConfig {
  title: string;
  hasFont: boolean;
  sample?: string;
}

const ROLE_CFG: Record<PopoverRole, PopoverConfig> = {
  bg:   { title: 'Фон',                   hasFont: false },
  head: { title: 'Заголовок',             hasFont: true, sample: 'PENTAGON' },
  acc:  { title: 'Подзаголовок (акцент)', hasFont: true, sample: 'спа · массаж' },
  body: { title: 'Контакты (текст)',      hasFont: true, sample: '+7 (495) 123-45-67' },
};

interface Props {
  /** anchor element (the clicked text in a card) */
  anchor: HTMLElement | null;
  role: PopoverRole;
  color: string;
  font?: string;
  bgPreview?: string;
  onColorChange: (hex: string) => void;
  onFontChange: (font: string) => void;
  onClose: () => void;
}

/**
 * Color + font picker. Открывается под anchor'ом, ловит outside-click
 * → закрытие. Color updates — синхронные (`input` event), font — `change`.
 *
 * Реплика поведения dashboard-2077.html `#tokPop`.
 */
export function TokenPopover({
  anchor,
  role,
  color,
  font,
  bgPreview,
  onColorChange,
  onFontChange,
  onClose,
}: Props) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const cfg = ROLE_CFG[role];

  // Position under anchor; flip up if it overflows viewport.
  useEffect(() => {
    if (!anchor || !popRef.current) return;
    const ar = anchor.getBoundingClientRect();
    const pr = popRef.current.getBoundingClientRect();
    let top = ar.bottom + 8;
    let left = ar.left;
    if (left + pr.width > window.innerWidth - 12) left = window.innerWidth - pr.width - 12;
    if (left < 12) left = 12;
    if (top + pr.height > window.innerHeight - 12) top = ar.top - pr.height - 8;
    setPos({ top, left });
  }, [anchor]);

  // Outside click → close.
  useEffect(() => {
    function onDoc(e: MouseEvent): void {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target as Node)) return;
      if (anchor && anchor.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [anchor, onClose]);

  // Esc → close.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!anchor) return null;

  const previewBg = role === 'bg' ? color : (bgPreview ?? '#1a1b1f');
  const previewColor = role === 'bg' ? '#fff' : color;
  const previewFont = cfg.hasFont && font ? font : 'JetBrains Mono';
  const previewText = role === 'bg' ? color.toUpperCase() : (cfg.sample ?? 'Aa');

  return (
    <div
      ref={popRef}
      className="fixed z-[100] min-w-[260px] rounded-md border border-line-strong bg-surface-2 shadow-2xl"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
      role="dialog"
      aria-label={cfg.title}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-xs font-mono uppercase tracking-widest text-text-dim">
          {cfg.title}
        </span>
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="text-text-mute hover:text-text transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3 py-2.5 flex items-center gap-2.5">
        <span className="text-[11px] font-mono text-text-mute w-12">Цвет</span>
        <label className="relative inline-block w-7 h-7 rounded-md cursor-pointer border border-line" style={{ background: color }}>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
        <span className="text-[11px] font-mono text-text-dim ml-auto">{color.toUpperCase()}</span>
      </div>

      {cfg.hasFont && (
        <div className="px-3 py-2 flex items-center gap-2.5 border-t border-line">
          <span className="text-[11px] font-mono text-text-mute w-12">Шрифт</span>
          <select
            value={font ?? ''}
            onChange={(e) => onFontChange(e.target.value)}
            className="flex-1 bg-bg border border-line rounded-md px-2 py-1 text-xs text-text"
          >
            {TOKEN_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className="m-2 mt-1 rounded-md p-3 text-center text-base border border-line"
        style={{
          background: previewBg,
          color: previewColor,
          fontFamily: `'${previewFont}', sans-serif`,
        }}
      >
        {previewText}
      </div>
    </div>
  );
}
