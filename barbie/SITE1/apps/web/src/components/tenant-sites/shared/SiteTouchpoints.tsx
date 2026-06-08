'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  touchpointHref,
  isExternalHref,
  type PublicTouchpoint,
} from '@/lib/public-touchpoints-api';

/**
 * SiteTouchpoints — единые клиентские точки касания для всех публичных шаблонов
 * (vanilia / nebesa / roxy / pentagon / salonmassage). Управляются из деки
 * /admin/projects (tenant_touchpoints). Рендерит:
 *   - всплывающее окно (popup): картинка + текст + CTA, с задержкой,
 *     dismiss запоминается в sessionStorage;
 *   - плавающий кластер (callWidget / telegram / operator) в правом-нижнем углу.
 *
 * Данные берёт двумя путями:
 *   - `tp` передан (SSR-фетч в серверном шаблоне) → используем его;
 *   - иначе клиентский фетч по slug. slug берётся из `slug`-пропа или из
 *     первого сегмента пути (`/5massage` → `5massage`) — публичные роуты
 *     тенантов имеют форму `/{slug}`.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5110';

function ExtAttrs(href: string) {
  return isExternalHref(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

function Popup({ tp, accent }: { tp: PublicTouchpoint; accent: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('site-popup-seen')) return;
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setShow(true), 1300);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setShow(false);
    try {
      sessionStorage.setItem('site-popup-seen', '1');
    } catch {
      /* ignore */
    }
  }

  if (!show) return null;
  const href = touchpointHref(tp.value);

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(420px, 100%)',
          background: '#15130f',
          border: `1px solid ${tp.color || accent}55`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,.55)',
          color: '#efe9df',
        }}
      >
        <button
          onClick={close}
          aria-label="Закрыть"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0,0,0,.5)',
            color: '#fff',
            fontSize: 18,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {tp.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tp.imageUrl}
            alt=""
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
          />
        )}

        <div style={{ padding: '22px 24px 26px' }}>
          <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.3, marginBottom: 16, letterSpacing: '.01em' }}>
            {tp.label || 'Специальное предложение'}
          </div>
          <a
            href={href}
            {...ExtAttrs(href)}
            onClick={close}
            style={{
              display: 'inline-block',
              padding: '11px 22px',
              borderRadius: 999,
              background: tp.color || accent,
              color: '#15130f',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Подробнее
          </a>
        </div>
      </div>
    </div>
  );
}

function FloatingChat({ tp, accent }: { tp: Record<string, PublicTouchpoint>; accent: string }) {
  const items = (['callWidget', 'telegram', 'operator'] as const)
    .map((k) => tp[k])
    .filter((t): t is PublicTouchpoint => !!t && !!t.value);

  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const ICONS: Record<string, ReactNode> = {
    callWidget: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.2 2.2z" />
      </svg>
    ),
    telegram: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M9.8 16.3l-.3 4c.5 0 .7-.2 1-.5l2.4-2.3 5 3.7c.9.5 1.6.2 1.8-.8L22.9 4c.3-1.2-.4-1.7-1.3-1.4L2.3 10.1c-1.2.5-1.2 1.1-.2 1.4l5 1.6L18.6 6c.5-.3 1-.2.6.2L9.8 16.3z" />
      </svg>
    ),
    operator: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H8l-4 4V6c0-1.1.9-2 2-2z" />
      </svg>
    ),
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 99990,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {/* Раскрытые мессенджеры — выпрыгивают снизу со стаггером и пружинным overshoot */}
      {items.map((t, i) => {
        const href = touchpointHref(t.value);
        // Ближайший к кнопке появляется первым (каскад снизу вверх).
        const delay = (items.length - 1 - i) * 55;
        return (
          <a
            key={t.key}
            href={href}
            {...ExtAttrs(href)}
            title={t.label || t.key}
            aria-label={t.label || t.key}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: t.color || accent,
              color: '#15130f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,.4)',
              opacity: open ? 1 : 0,
              transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.35)',
              pointerEvents: open ? 'auto' : 'none',
              transition: `transform .36s cubic-bezier(.34,1.56,.64,1) ${delay}ms, opacity .26s ease ${delay}ms`,
            }}
          >
            {ICONS[t.key] ?? null}
          </a>
        );
      })}

      {/* Единая кнопка-триггер */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Закрыть' : 'Связаться'}
        aria-expanded={open}
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          border: 'none',
          background: accent,
          color: '#15130f',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,.45)',
          pointerEvents: 'auto',
          transform: open ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H8l-4 4V6c0-1.1.9-2 2-2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function SiteTouchpoints({
  tp: tpProp,
  slug: slugProp,
  accent = '#c8a96a',
}: {
  tp?: Record<string, PublicTouchpoint>;
  slug?: string;
  accent?: string;
}) {
  const pathname = usePathname();
  const [fetched, setFetched] = useState<Record<string, PublicTouchpoint>>({});

  const slug = slugProp ?? pathname?.split('/').filter(Boolean)[0] ?? '';

  useEffect(() => {
    if (tpProp || !slug) return;
    let alive = true;
    fetch(`${API_BASE}/v1/public/tenants/by-slug/${encodeURIComponent(slug)}/touchpoints`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: PublicTouchpoint[]) => {
        if (!alive) return;
        const m: Record<string, PublicTouchpoint> = {};
        for (const t of list) m[t.key] = t;
        setFetched(m);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      alive = false;
    };
  }, [slug, tpProp]);

  const tp = tpProp ?? fetched;

  return (
    <>
      {tp.popup && <Popup tp={tp.popup} accent={accent} />}
      <FloatingChat tp={tp} accent={accent} />
    </>
  );
}
