'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALES, dirOf } from '@/i18n/locales';

/**
 * LangSwitcher — единый переключатель языков для всех публичных шаблонов
 * (vanilia / salonmassage / nebesa / roxy / pentagon / barbiespa / …).
 *
 * Источник локалей — i18n/locales.ts (сейчас ru·en·zh). Выбор меняет ЛОКАЛЬ
 * МАРШРУТА через next-intl (URL `/en/...`), next-intl пишет cookie NEXT_LOCALE.
 * `<html lang>`/`dir` синхронизируем на клиенте (RTL для будущего ar).
 *
 * Самостоятельный (inline-стили, цвет наследуется от шапки) — вставляется в
 * любой шаблон без правки CSS. accent — подсветка активного языка.
 */
export function LangSwitcher({ accent = '#c8a96a' }: { accent?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    document.documentElement.dir = dirOf(locale);
  }, [locale]);

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
    setOpen(false);
    if (c === locale) return;
    // меняем только локаль, путь сохраняем (next-intl подставит/уберёт префикс)
    router.replace(pathname, { locale: c });
  }

  const cur = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

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
          {LOCALES.map((l) => {
            const active = l.code === locale;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(l.code)}
                  dir={l.dir}
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
