'use client';

/**
 * Brand — "N"-плитка в верхней части rail'а. Hover → выезжает справа
 * tenant-switcher (TenantSwitcherPanel). Клик по плитке ведёт на /admin.
 *
 * Hover-bridge: panel получает onMouseEnter/Leave, чтобы при переходе курсора
 * с N на панель она не закрывалась. Закрытие — mouseLeave с 220ms delay,
 * Esc, либо click-outside.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AuthSession } from '@/lib/auth';
import { TenantSwitcherPanel } from './TenantSwitcherPanel';

interface Props {
  auth: AuthSession;
}

export function Brand({ auth }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeT = useRef<number | null>(null);

  function openNow(): void {
    if (closeT.current !== null) {
      window.clearTimeout(closeT.current);
      closeT.current = null;
    }
    setOpen(true);
  }
  function scheduleClose(): void {
    if (closeT.current !== null) window.clearTimeout(closeT.current);
    closeT.current = window.setTimeout(() => {
      setOpen(false);
      closeT.current = null;
    }, 220);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div
      ref={wrapRef}
      className="relative my-3.5 mx-auto"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
    >
      <Link
        href="/admin"
        title="NAS · Network Administration System (наведи — переключатель тенантов)"
        aria-label="NAS Dashboard"
        className="block"
      >
        <span
          className="grid place-items-center w-9 h-9 rounded-md font-display font-bold text-[14px]"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--gold)), #9d7e22)',
            color: '#0A0A0B',
            boxShadow: '0 0 18px rgb(var(--gold) / 0.35), inset 0 1px 0 rgba(255,255,255,.4)',
            letterSpacing: '-0.04em',
          }}
        >
          N
        </span>
      </Link>

      {open && (
        <div
          className="absolute left-[calc(100%+10px)] top-0 z-[1200]"
          // hover-bridge: невидимая зона между N и панелью, чтобы курсор не
          // вываливался в mouseLeave при пересечении пробела.
        >
          <div
            aria-hidden="true"
            style={{ position: 'absolute', left: -12, top: 0, width: 12, height: '100%' }}
            onMouseEnter={openNow}
          />
          <TenantSwitcherPanel
            auth={auth}
            onClose={() => setOpen(false)}
            onMouseEnter={openNow}
            onMouseLeave={scheduleClose}
          />
        </div>
      )}
    </div>
  );
}
