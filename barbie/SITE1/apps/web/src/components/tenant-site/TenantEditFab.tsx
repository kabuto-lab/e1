'use client';

/**
 * TenantEditFab — плавающая кнопка в правом-нижнем углу публичной тенантской
 * страницы. Видна только залогиненным админам. Клик → веер ярлыков в админку.
 *
 * Техника gooey та же что в `SettingsGooMenu` (см. `admin/shell/SettingsGooMenu`):
 *   1. blob-слой под SVG-фильтром `#nas-goo` — капельный merge во время transition;
 *   2. icon-слой над ним без фильтра — чёткие lucide-иконки.
 *
 * Веер: 3 пункта от ↑ (вверх) до ← (влево), distance 75px.
 *
 * Закрытие: click outside | Esc | клик по пункту.
 *
 * SVG-фильтр `#nas-goo` определён только в `AdminShell`. На публичной странице
 * его нет — рендерим свой <svg><defs> вместе с FAB, чтобы фильтр был доступен.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit3,
  X,
  FileText,
  Palette,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import { getAuth } from '@/lib/auth';

interface Item {
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
}

// Fan-out: ↑ → ↖ → ←. Distance 75px, последовательный delay для wave-effect'а.
const FAN: Array<{ x: number; y: number; ms: number }> = [
  { x: 0,   y: -75, ms: 120 },
  { x: -53, y: -53, ms: 180 },
  { x: -75, y: 0,   ms: 240 },
];

const TRANSITION_FN = 'cubic-bezier(0.935, 0, 0.34, 1.33)';

function itemTransform(open: boolean, i: number): React.CSSProperties {
  const p = FAN[i];
  return {
    transform: open ? `translate3d(${p.x}px, ${p.y}px, 0)` : 'translate3d(0, 0, 0)',
    transition: `transform ${p.ms}ms ${TRANSITION_FN}`,
  };
}

interface Props {
  tenantSlug: string;
}

export function TenantEditFab({ tenantSlug }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Auth-check после mount'а. На SSR FAB не рендерится — auth в localStorage.
  useEffect(() => {
    setIsAdmin(getAuth() !== null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isAdmin) return null;

  const items: Item[] = [
    {
      Icon: FileText,
      label: 'CMS-страницы',
      onClick: () => router.push(`/admin/cms?tenant=${encodeURIComponent(tenantSlug)}`),
    },
    {
      Icon: Palette,
      label: 'Дизайн',
      onClick: () => router.push('/admin/projects'),
    },
    {
      Icon: LayoutDashboard,
      label: 'Админка',
      onClick: () => router.push('/admin'),
    },
  ];

  const SIZE = 48; // диаметр круга
  const SURFACE = '#1a1a20';
  const ACCENT = '#00FFCC';
  const TEXT_DIM = '#9CA3AF';
  const BG = '#0A0A0C';

  return (
    <>
      {/* SVG goo-filter (на публичных страницах AdminShell'а нет) */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id="tenant-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in2="goo" in="SourceGraphic" />
          </filter>
        </defs>
      </svg>

      <div
        ref={ref}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          width: SIZE,
          height: SIZE,
          zIndex: 9999,
        }}
      >
        {/* Blob layer (под фильтром) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: SIZE,
            height: SIZE,
            pointerEvents: 'none',
            filter: 'url(#tenant-goo)',
          }}
          aria-hidden="true"
        >
          {items.map((_, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: SIZE,
                height: SIZE,
                borderRadius: '50%',
                background: ACCENT,
                ...itemTransform(open, i),
              }}
            />
          ))}
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: SIZE,
              height: SIZE,
              borderRadius: '50%',
              background: open ? ACCENT : SURFACE,
              transition: 'background-color 150ms',
            }}
          />
        </div>

        {/* Icon layer (без фильтра — чёткие иконки) */}
        {items.map(({ Icon, label, onClick }, i) => (
          <button
            key={i}
            type="button"
            aria-label={label}
            title={label}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: SIZE,
              height: SIZE,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: BG,
              pointerEvents: open ? 'auto' : 'none',
              ...itemTransform(open, i),
            }}
            onClick={() => {
              onClick();
              setOpen(false);
            }}
          >
            <Icon size={18} />
          </button>
        ))}

        {/* Trigger */}
        <button
          type="button"
          aria-label={open ? 'Закрыть' : 'Редактировать тенант'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: SIZE,
            height: SIZE,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: open ? ACCENT : SURFACE,
            color: open ? BG : TEXT_DIM,
            border: open ? 'none' : `1px solid ${TEXT_DIM}55`,
            cursor: 'pointer',
            zIndex: 10,
            transition: 'background-color 150ms, color 150ms',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          }}
        >
          {open ? <X size={20} /> : <Edit3 size={20} />}
        </button>
      </div>
    </>
  );
}
