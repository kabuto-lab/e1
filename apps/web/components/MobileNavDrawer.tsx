'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import { useAuthOrGuest } from '@/components/AuthProvider';
import {
  buildPublicMobileNavItems,
  type PublicMobileNavItem,
  type MobileNavIcon,
} from '@/lib/public-mobile-nav';

const STAGGER_BASE_MS = 120;
const STAGGER_STEP_MS = 55;
const SWIPE_CLOSE_PX = 120;

function NavIcon({ name, className }: { name: MobileNavIcon; className?: string }) {
  const c = className ?? 'h-[22px] w-[22px]';
  const stroke = 'currentColor';
  const common = { className: c, fill: 'none' as const, stroke, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'about':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case 'models':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    case 'contacts':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case 'help':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case 'login':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}

export interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Если задано — заменяет стандартный список (например, только подстраницы). */
  items?: PublicMobileNavItem[];
}

export function MobileNavDrawer({ open, onOpenChange, items: itemsOverride }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const { user } = useAuthOrGuest();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const items = itemsOverride ?? buildPublicMobileNavItems(user ? { email: user.email } : null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
      if (panelRef.current) {
        panelRef.current.style.transform = '';
        panelRef.current.style.transition = '';
      }
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    let trap: (e: KeyboardEvent) => void;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
    const nodes = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'),
      ).filter((el) => !el.hasAttribute('disabled'));
    trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = nodes();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', trap);
    return () => {
      window.clearTimeout(t);
      panel.removeEventListener('keydown', trap);
    };
  }, [open]);

  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href.startsWith('/#')) {
        const hash = href.slice(1);
        if (pathname === '/') {
          e.preventDefault();
          const el = document.querySelector(hash);
          if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
          close();
          return;
        }
      }
      close();
    },
    [pathname, close, reduceMotion],
  );

  const touchStartX = useRef(0);
  const touchLastX = useRef(0);
  const dragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (reduceMotion || !open) return;
    touchStartX.current = e.touches[0].clientX;
    touchLastX.current = touchStartX.current;
    dragging.current = true;
    if (panelRef.current) panelRef.current.style.transition = 'transform 0.08s linear';
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || reduceMotion || !panelRef.current) return;
    touchLastX.current = e.touches[0].clientX;
    const diff = touchLastX.current - touchStartX.current;
    if (diff > 0) panelRef.current.style.transform = `translateX(${diff}px)`;
  };

  const onTouchEnd = () => {
    if (!panelRef.current || !dragging.current) return;
    dragging.current = false;
    const diff = touchLastX.current - touchStartX.current;
    panelRef.current.style.transition = 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)';
    if (diff > SWIPE_CLOSE_PX && !reduceMotion) {
      panelRef.current.style.transform = 'translateX(100%)';
      const end = () => {
        panelRef.current?.removeEventListener('transitionend', end);
        panelRef.current!.style.transform = '';
        close();
      };
      panelRef.current.addEventListener('transitionend', end);
    } else {
      panelRef.current.style.transform = 'translateX(0)';
      const end = (ev: TransitionEvent) => {
        if (ev.propertyName !== 'transform') return;
        panelRef.current?.removeEventListener('transitionend', end);
        panelRef.current!.style.transition = '';
        panelRef.current!.style.transform = '';
      };
      panelRef.current.addEventListener('transitionend', end);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[200] ${open ? 'pointer-events-auto visible' : 'pointer-events-none invisible'}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-labelledby="mobile-nav-drawer-title"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/45 transition-opacity duration-300 backdrop-blur-sm ${open ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Закрыть меню"
        tabIndex={-1}
        onClick={close}
      />
      <div
        ref={panelRef}
        id="mobile-drawer-panel"
        className={`mobile-nav-drawer-panel absolute right-0 top-0 flex h-full w-[80vw] max-w-sm flex-col transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] touch-pan-y overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] pl-6 pr-5 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute left-2 top-1/2 h-10 w-1 -translate-y-1/2 rounded-sm bg-[#d4af37]/25"
          aria-hidden
        />
        <div className="mb-8 border-b border-white/[0.08] pb-5">
          <Link
            href="/"
            onClick={close}
            className="mb-5 inline-block text-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(12,12,12,0.85)] rounded-sm"
          >
            <Logo />
          </Link>
          <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p id="mobile-nav-drawer-title" className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
              Меню
            </p>
            {user ? (
              <p className="mt-2 truncate font-body text-sm text-white/70" title={user.email}>
                {user.email}
              </p>
            ) : (
              <p className="mt-2 font-body text-sm text-white/45">Гость</p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="shrink-0 p-2 text-xl leading-none text-white/45 transition-colors hover:text-[#d4af37] focus:outline-none focus-visible:text-[#d4af37]"
            aria-label="Закрыть меню"
            onClick={close}
          >
            <span aria-hidden>✕</span>
          </button>
          </div>
        </div>
        <nav aria-label="Основная навигация">
          <ul className="flex flex-col gap-1">
            {items.map((item, i) => (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className="group relative flex items-center gap-4 border-b border-white/[0.06] py-4 pl-0.5 font-display text-[clamp(1.05rem,4vw,1.35rem)] font-semibold tracking-tight text-white transition-colors duration-200 hover:text-[#d4af37] focus:outline-none focus-visible:text-[#d4af37]"
                  style={{
                    opacity: open ? 1 : 0,
                    transform: open ? 'translateX(0)' : 'translateX(28px)',
                    transitionProperty: 'opacity, transform, color',
                    transitionDuration: reduceMotion ? '0.15s' : '0.4s, 0.45s, 0.2s',
                    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    transitionDelay: open && !reduceMotion ? `${STAGGER_BASE_MS + i * STAGGER_STEP_MS}ms` : '0ms',
                  }}
                >
                  <span
                    className="absolute left-0 top-0 h-full w-0.5 origin-center scale-y-0 rounded-r-sm bg-[#d4af37] transition-transform duration-200 group-hover:scale-y-100 group-focus-visible:scale-y-100"
                    aria-hidden
                  />
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[#d4af37]/55 transition-colors group-hover:text-[#d4af37] group-focus-visible:text-[#d4af37]">
                    <NavIcon name={item.icon} />
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-auto pt-8 font-body text-[11px] tracking-wide text-white/35">Lovnge</p>
      </div>
    </div>
  );
}

export function MobileMenuTrigger({
  open,
  onClick,
  className,
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={
        className ??
        'flex flex-col gap-[5px] p-2 md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/40 rounded'
      }
      aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
      aria-expanded={open}
      aria-controls="mobile-drawer-panel"
      onClick={onClick}
    >
      <span
        className={`block h-0.5 w-5 bg-[#d4af37] transition-transform ${open ? 'translate-y-[7px] rotate-45' : ''}`}
      />
      <span className={`block h-0.5 w-5 bg-[#d4af37] transition-opacity ${open ? 'opacity-0' : ''}`} />
      <span
        className={`block h-0.5 w-5 bg-[#d4af37] transition-transform ${open ? '-translate-y-[7px] -rotate-45' : ''}`}
      />
    </button>
  );
}
