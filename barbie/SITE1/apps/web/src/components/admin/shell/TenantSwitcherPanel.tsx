'use client';

/**
 * TenantSwitcherPanel — переключатель тенантов БЕЗ собственного триггера.
 * Триггер (hover/click) принадлежит вызывающему компоненту (Brand в rail).
 *
 * Платформа отображения:
 *   - `auth.kind === 'platform'` — список всех тенантов с поиском.
 *   - `auth.kind === 'tenant'`   — статичная карточка одного тенанта.
 *
 * Раньше был внутри `TenantSwitcher.tsx` (вместе с pill-триггером в Topbar).
 * После перехода tenant-switcher в Brand-hover триггер не нужен; оставляем
 * только панель.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { type AuthSession } from '@/lib/auth';
import { switchActiveTenant } from '@/lib/tenant-switch';

interface TenantLite {
  id: string;
  slug: string;
  name: string;
  status: string;
}

interface Props {
  auth: AuthSession;
  /** Закрыть панель (нажат item / outside-click — передаёт родитель). */
  onClose?: () => void;
  /** Hover-bridge: чтобы при mouseEnter на панель trigger не закрывался. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function TenantSwitcherPanel({ auth, onClose, onMouseEnter, onMouseLeave }: Props) {
  if (auth.kind === 'tenant') {
    return (
      <ReadonlyPanel auth={auth} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
    );
  }
  return (
    <PlatformPanel
      auth={auth}
      onClose={onClose}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}

// ── Tenant-admin: read-only ───────────────────────────────────────────────────

function ReadonlyPanel({
  auth,
  onMouseEnter,
  onMouseLeave,
}: {
  auth: AuthSession;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="w-[280px] bg-surface border border-line rounded-md overflow-hidden"
      style={{ boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}
    >
      <div className="px-3.5 py-3 flex items-center gap-3">
        <TenantAvatar initial={(auth.tenantSlug[0] ?? 'T').toUpperCase()} />
        <div className="leading-tight">
          <div className="text-[13px] font-semibold">{auth.tenantSlug.toUpperCase()}</div>
          <div className="text-[11.5px] text-text-mute font-mono tracking-wider mt-0.5">
            {auth.role.toUpperCase()}
          </div>
        </div>
      </div>
      <div className="px-3.5 py-2 text-[11px] text-text-mute border-t border-line">
        У админа салона доступ только к одному салону.
      </div>
    </div>
  );
}

// ── Platform-admin: switcher ──────────────────────────────────────────────────

function PlatformPanel({
  auth,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  auth: AuthSession;
  onClose?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const [tenants, setTenants] = useState<TenantLite[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kbdIdx, setKbdIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tenants.length > 0) return;
    setLoading(true);
    setError(null);
    void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5110'}/v1/platform/tenants`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as { items?: TenantLite[]; data?: TenantLite[] } | TenantLite[];
        if (Array.isArray(json)) return json;
        if (Array.isArray((json as { items?: TenantLite[] }).items)) return (json as { items: TenantLite[] }).items;
        if (Array.isArray((json as { data?: TenantLite[] }).data)) return (json as { data: TenantLite[] }).data;
        return [];
      })
      .then((list) => setTenants(list))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [auth.accessToken, tenants.length]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => `${t.name} ${t.slug} ${t.status}`.toLowerCase().includes(q));
  }, [tenants, query]);

  function pick(slug: string): void {
    onClose?.();
    switchActiveTenant(slug);
  }

  return (
    <div
      role="menu"
      aria-label="Переключатель салонов"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="w-[360px] bg-surface border border-line rounded-md overflow-hidden"
      style={{ boxShadow: '0 30px 80px rgba(0,0,0,.6), 0 0 0 1px rgb(var(--gold) / 0.04)' }}
    >
      <div className="px-3.5 py-2.5 bg-gold/5 border-b border-line flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-widest text-gold font-bold">
        <span
          className="w-1.5 h-1.5 rounded-full bg-gold"
          style={{
            boxShadow: '0 0 8px rgb(var(--gold) / 0.45)',
            animation: 'nas-pulse-gold 1.8s cubic-bezier(.4,0,.2,1) infinite',
          }}
        />
        <span>PLATFORM-ADMIN · {filtered.length} of {tenants.length} visible</span>
      </div>

      <div className="px-3 py-2.5 border-b border-line relative">
        <Search
          size={13}
          className="absolute left-[22px] top-1/2 -translate-y-1/2 text-text-mute pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setKbdIdx(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setKbdIdx((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setKbdIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const t = filtered[kbdIdx];
              if (t) pick(t.slug);
            } else if (e.key === 'Escape') {
              onClose?.();
            }
          }}
          placeholder="Поиск салона или статуса…"
          autoComplete="off"
          className="w-full h-8 bg-bg-elev border border-line rounded-md px-2.5 pl-[30px] text-[12.5px] outline-none focus:border-gold/30 placeholder:text-text-mute"
        />
      </div>

      <div className="px-3.5 pt-2.5 pb-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-widest text-text-mute flex items-center justify-between">
        <span>Салоны</span>
        <span className="font-normal tracking-normal text-[11.5px] normal-case">
          {filtered.length} показано
        </span>
      </div>

      <div className="px-1.5 pb-1.5 max-h-[300px] overflow-y-auto">
        {loading && (
          <div className="px-3.5 py-6 text-center text-[12px] text-text-mute">загружаем…</div>
        )}
        {error && (
          <div className="px-3.5 py-3 text-[12px] text-red border border-red/30 bg-red/10 rounded-md">
            {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="px-3.5 py-6 text-center text-[12px] text-text-mute">Ничего не найдено</div>
        )}
        {filtered.map((t, i) => {
          const isCurrent = t.slug === auth.tenantSlug;
          const isFocus = i === kbdIdx;
          return (
            <button
              key={t.id}
              role="menuitem"
              onClick={() => pick(t.slug)}
              className={`w-full grid grid-cols-[32px_1fr_22px] gap-2.5 items-center p-2 rounded-md text-left transition-colors ${
                isCurrent ? 'bg-gold/5' : isFocus ? 'bg-surface-2' : 'hover:bg-surface-2'
              }`}
            >
              <TenantAvatar initial={(t.slug[0] ?? '?').toUpperCase()} small />
              <div className="min-w-0 leading-tight">
                <div className="text-[13px] font-semibold truncate">{t.name}</div>
                <div className="text-[12px] text-text-mute font-mono tracking-wider mt-px">
                  {t.slug} · {t.status}
                </div>
              </div>
              <div
                className={`w-[18px] h-[18px] rounded-full grid place-items-center bg-gold text-bg transition-all ${
                  isCurrent ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TenantAvatar({ initial, small }: { initial: string; small?: boolean }) {
  const size = small ? 32 : 36;
  return (
    <div
      className="rounded-full grid place-items-center font-display font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, rgb(var(--gold)), #8b6e1b)',
        color: '#0A0A0B',
        fontSize: small ? 13 : 14,
      }}
    >
      {initial}
    </div>
  );
}
