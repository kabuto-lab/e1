'use client';

/**
 * SettingsGooMenu — gooey-меню для кнопки Настройки в правом-верхнем углу.
 *
 * Техника: два синхронных слоя.
 *   1. `.nas-goo` — blob-слой под SVG-фильтром `#nas-goo` (см. AdminShell).
 *      Все blob'ы blur'ятся + threshold через feColorMatrix → во время
 *      transition мержатся друг с другом, давая «капельный» вид.
 *   2. icon-слой — те же координаты + transitions, но БЕЗ filter'а, чтобы
 *      lucide-иконки оставались чёткими.
 *
 * Веер: 4 пункта от ↓ до ←, distance ~42px (≈ половина IconBtn-диаметра).
 * Transform'ы — inline-style'ом, чтобы гарантированно бить cascade
 * (Tailwind utility-layer'ы рисковали перетереть `@layer components`).
 *
 * Закрытие: click outside | Esc | клик по пункту.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  X,
  Search,
  SlidersHorizontal,
  HelpCircle,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { clearAuth } from '@/lib/auth';

interface Item {
  Icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

// Fan-out positions: углы π/2 (↓) → π (←), distance 75px — кружки видны
// отдельно, gooey-фильтр даёт лёгкий шлейф во время transition.
// Каждый next item имеет более длинный transition-duration для wave-effect'а.
const FAN: Array<{ x: number; y: number; ms: number }> = [
  { x: 0,   y: 75, ms: 120 },
  { x: -38, y: 65, ms: 180 },
  { x: -65, y: 38, ms: 240 },
  { x: -75, y: 0,  ms: 300 },
];

interface Props {
  /** Кол-во непрочитанных уведомлений — рисуется бейджом над триггером. */
  notificationCount?: number;
}

const TRANSITION_FN = 'cubic-bezier(0.935, 0, 0.34, 1.33)';

function itemTransform(open: boolean, i: number): React.CSSProperties {
  const p = FAN[i];
  return {
    transform: open ? `translate3d(${p.x}px, ${p.y}px, 0)` : 'translate3d(0, 0, 0)',
    transition: `transform ${p.ms}ms ${TRANSITION_FN}`,
  };
}

export function SettingsGooMenu({ notificationCount = 0 }: Props = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const items: Item[] = [
    { Icon: Search, label: 'Поиск', onClick: () => setSearchOpen(true) },
    { Icon: SlidersHorizontal, label: 'Настройки', onClick: () => router.push('/admin/settings') },
    { Icon: HelpCircle, label: 'Помощь' },
    {
      Icon: LogOut,
      label: 'Выход',
      onClick: () => {
        clearAuth();
        router.replace('/admin/login');
      },
    },
  ];

  return (
    // z-[100] — поднимаем над любыми sticky-плашками с z-index ≤ 50 (например,
    // EditorHost sticky-bar = z-50). Без этого gooey-кружки уходят под редактор.
    <div ref={ref} className="relative z-[100]" style={{ width: 38, height: 38 }}>
      {/* Blob layer — фильтр + капли. pointer-events:none, клики ловит icon-слой.
          DOM order: items ПЕРВЫМИ (под триггером), trigger ПОСЛЕДНИМ — чтобы
          его непрозрачный круг перекрывал stacked items в закрытом состоянии. */}
      <div
        className="nas-goo"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 38,
          height: 38,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {/* Item blobs (под триггером) */}
        {items.map((_, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'rgb(var(--accent))',
              ...itemTransform(open, i),
            }}
          />
        ))}
        {/* Trigger blob (поверх стека, solid bg → закрывает items при close) */}
        <span
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: open ? 'rgb(var(--accent))' : 'rgb(var(--surface))',
            border: open ? '1px solid rgb(var(--accent))' : '1px solid rgb(var(--line))',
            transition: 'background-color 150ms, border-color 150ms',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Icon layer — без фильтра, чёткие. Тот же DOM-порядок: items, потом trigger. */}
      {items.map(({ Icon, label, onClick }, i) => (
        <button
          key={i}
          type="button"
          aria-label={label}
          title={label}
          className="absolute top-0 right-0 w-[38px] h-[38px] rounded-full grid place-items-center bg-transparent border-0 cursor-pointer text-bg"
          style={{
            ...itemTransform(open, i),
            pointerEvents: open ? 'auto' : 'none',
          }}
          onClick={() => {
            onClick?.();
            setOpen(false);
          }}
        >
          <Icon size={15} />
        </button>
      ))}
      {/* Trigger button (z-10 + solid bg → перекрывает item-иконки при close).
          Closed: 2px solid border того же surface-цвета — визуально расширяет
          круг на 4px, остаётся монохромным. Open: без border'а.
          right: -2px → визуально круг сдвинут на 2px вправо. */}
      <button
        type="button"
        aria-label={open ? 'Закрыть меню' : 'Настройки'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="absolute w-[38px] h-[38px] rounded-full grid place-items-center cursor-pointer z-10"
        style={{
          right: -2,
          top: -1,
          background: open ? 'rgb(var(--accent))' : 'rgb(var(--surface))',
          color: open ? 'rgb(var(--bg))' : 'rgb(var(--text-dim))',
          border: open ? 'none' : '2px solid rgb(var(--surface))',
          boxSizing: 'content-box',
          transition: 'background-color 150ms, color 150ms, border-color 150ms',
        }}
      >
        {open ? <X size={16} /> : <Settings size={16} />}
      </button>

      {/* Notification badge — кружок над триггером, в правом-верхнем углу. */}
      {!open && notificationCount > 0 && (
        <div
          aria-label={`Уведомлений: ${notificationCount}`}
          className="absolute pointer-events-none rounded-full font-mono font-bold grid place-items-center"
          style={{
            top: -6,
            right: -6,
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            fontSize: 10,
            background: 'rgb(var(--red))',
            color: 'rgb(var(--bg))',
            border: '2px solid rgb(var(--bg-elev))',
            boxSizing: 'content-box',
            zIndex: 11,
          }}
        >
          {notificationCount > 99 ? '99+' : notificationCount}
        </div>
      )}

      {/* Search dialog — открывается из item «Поиск». */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9998] flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-[560px] mx-4 bg-surface border border-line-strong rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,.7)' }}
          >
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none"
              />
              <input
                autoFocus
                placeholder="Поиск по системе (Phase 1: stub)"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
                className="w-full h-12 bg-transparent pl-11 pr-4 text-[14px] outline-none placeholder:text-text-mute"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-text-mute bg-bg-elev border border-line rounded-md px-1.5 py-0.5">
                Esc
              </kbd>
            </div>
            <div className="px-4 py-3 text-[12px] text-text-mute border-t border-line">
              Команд-палет пока заглушка. В Phase B — fuzzy-finder по клиентам, салонам, страницам, каналам чата.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
