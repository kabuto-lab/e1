'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * LangSwitcher — единый переключатель языков для всех публичных шаблонов
 * (vanilia / salonmassage / nebesa / roxy / pentagon / barbiespa).
 *
 * 7 языков: ru · zh · en · fr · es · ar · de. Выбор хранится в localStorage
 * ('site-lang'), выставляет <html lang> и dir=rtl для арабского.
 *
 * Самостоятельный (inline-стили + цвет наследуется от шапки), чтобы вставляться
 * в любой шаблон без правки его CSS. accent — подсветка активного языка.
 *
 * NB: это контрол + плумбинг языка. Контентные словари (реальный перевод копий)
 * — отдельный слой; здесь UI/состояние/persist/lang/dir.
 */

export interface Lang {
  code: string;
  short: string;
  label: string;
}

const LANGS: Lang[] = [
  { code: 'ru', short: 'RU', label: 'Русский' },
  { code: 'zh', short: 'ZH', label: '中文' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'fr', short: 'FR', label: 'Français' },
  { code: 'es', short: 'ES', label: 'Español' },
  { code: 'ar', short: 'AR', label: 'العربية' },
  { code: 'de', short: 'DE', label: 'Deutsch' },
];

const STORAGE_KEY = 'site-lang';

function applyLang(code: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
}

export function LangSwitcher({ accent = '#c8a96a' }: { accent?: string }) {
  const [code, setCode] = useState('ru');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let saved = 'ru';
    try {
      saved = localStorage.getItem(STORAGE_KEY) || 'ru';
    } catch {
      /* ignore */
    }
    if (!LANGS.some((l) => l.code === saved)) saved = 'ru';
    setCode(saved);
    applyLang(saved);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(c: string) {
    setCode(c);
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
    applyLang(c);
  }

  const cur = LANGS.find((l) => l.code === code) ?? LANGS[0];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Язык / Language"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: 'none',
          border: 'none',
          font: 'inherit',
          fontWeight: 600,
          color: 'inherit',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
        }}
      >
        {cur.short}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: 0.8 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            zIndex: 9999,
            minWidth: 168,
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: '#15131a',
            border: `1px solid ${accent}40`,
            borderRadius: 12,
            boxShadow: '0 18px 50px rgba(0,0,0,.5)',
          }}
        >
          {LANGS.map((l) => {
            const active = l.code === code;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(l.code)}
                  dir={l.code === 'ar' ? 'rtl' : 'ltr'}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '9px 12px',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    font: 'inherit',
                    fontSize: 14,
                    textAlign: 'left',
                    background: active ? accent : 'transparent',
                    color: active ? '#15130f' : '#e7e2ec',
                    fontWeight: active ? 700 : 500,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.07)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <span>{l.label}</span>
                  <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>{l.short}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
