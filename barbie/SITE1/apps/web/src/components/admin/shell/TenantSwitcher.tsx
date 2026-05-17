'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { type AuthSession } from '@/lib/auth';
import { switchActiveTenant } from '@/lib/tenant-switch';

/**
 * TenantSwitcher — pill в topbar + dropdown с поиском.
 *
 * Поведение:
 *  - `auth.kind === 'tenant'` → pill read-only, без chevron, без dropdown.
 *    Tenant-admin не может ходить в чужой тенант (TenantGuard рубит 403).
 *  - `auth.kind === 'platform'` → pill открывает dropdown со списком всех
 *    видимых тенантов (`/v1/tenants`), есть поиск и keyboard nav.
 *
 * `.sub` строка под названием: пока — slug (самый информативный disambiguator
 * для platform-admin'а с 10 одинаковыми «PENTAGON»). Tagline / vibe-описание
 * — Phase B, когда появится `tenants.settings.tagline`.
 */

interface TenantLite {
  id: string;
  slug: string;
  name: string;
  status: string;
}

export function TenantSwitcher({ auth }: { auth: AuthSession }) {
  const isPlatform = auth.kind === 'platform';

  return isPlatform ? <PlatformTenantPill auth={auth} /> : <ReadonlyTenantPill auth={auth} />;
}

// ── Tenant-admin: read-only pill ─────────────────────────────────────────────

function ReadonlyTenantPill({ auth }: { auth: AuthSession }) {
  const initial = (auth.tenantSlug[0] ?? 'T').toUpperCase();
  return (
    <div
      className="flex items-center gap-2.5 pl-2.5 pr-3.5 py-2 bg-surface border border-line rounded-full"
      title="У tenant-admin доступ только к одному тенанту"
    >
      <TenantAvatar initial={initial} />
      <div className="leading-tight">
        <div className="text-[13px] font-semibold">{auth.tenantSlug.toUpperCase()}</div>
        <div className="text-[12px] text-text-mute font-mono tracking-wider">
          {auth.role.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

// ── Platform-admin: real switcher ────────────────────────────────────────────

function PlatformTenantPill({ auth }: { auth: AuthSession }) {
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<TenantLite[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kbdIdx, setKbdIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Загружаем список тенантов на первое открытие.
  useEffect(() => {
    if (!open || tenants.length > 0) return;
    setLoading(true);
    setError(null);
    void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010'}/v1/tenants`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as { items?: TenantLite[]; data?: TenantLite[] } | TenantLite[];
        // GET /v1/tenants возвращает array — но защищаемся от {items}/{data} обёрток.
        if (Array.isArray(json)) return json;
        if (Array.isArray((json as { items?: TenantLite[] }).items)) return (json as { items: TenantLite[] }).items;
        if (Array.isArray((json as { data?: TenantLite[] }).data)) return (json as { data: TenantLite[] }).data;
        return [];
      })
      .then((list) => setTenants(list))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [open, tenants.length, auth.accessToken]);

  // Hotkey Cmd/Ctrl+T.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T') && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Click-outside.
  useEffect(() => {
    function onClick(e: MouseEvent): void {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  // Focus search on open.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setQuery('');
      setKbdIdx(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) =>
      `${t.name} ${t.slug} ${t.status}`.toLowerCase().includes(q),
    );
  }, [tenants, query]);

  function pick(slug: string): void {
    setOpen(false);
    switchActiveTenant(slug);
  }

  const currentInitial = (auth.tenantSlug[0] ?? 'P').toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-2.5 pl-2.5 pr-3.5 py-2 border rounded-full transition-colors ${
          open ? 'bg-surface-2 border-gold/30' : 'bg-surface border-line hover:border-gold/30'
        }`}
      >
        <TenantAvatar initial={currentInitial} />
        <div className="leading-tight text-left">
          <div className="text-[13px] font-semibold">{auth.tenantSlug.toUpperCase()}</div>
          <div className="text-[12px] text-text-mute font-mono tracking-wider">
            PLATFORM · {auth.tenantSlug}
          </div>
        </div>
        <ChevronDown
          size={12}
          className={`ml-0.5 transition-transform duration-200 ${open ? 'rotate-180 text-gold' : 'text-text-mute'}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Переключатель тенантов"
          className="absolute top-[calc(100%+8px)] left-0 w-[360px] bg-surface border border-line rounded-md overflow-hidden z-50"
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
                }
              }}
              placeholder="Поиск тенанта или статуса…"
              autoComplete="off"
              className="w-full h-8 bg-bg-elev border border-line rounded-md px-2.5 pl-[30px] text-[12.5px] outline-none focus:border-gold/30 placeholder:text-text-mute"
            />
          </div>

          <div className="px-3.5 pt-2.5 pb-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-widest text-text-mute flex items-center justify-between">
            <span>Тенанты</span>
            <span className="font-normal tracking-normal text-[11.5px] normal-case">
              {filtered.length} показано
            </span>
          </div>

          <div className="px-1.5 pb-1.5 max-h-[300px] overflow-y-auto">
            {loading && (
              <div className="px-3.5 py-6 text-center text-[12px] text-text-mute">
                загружаем…
              </div>
            )}
            {error && (
              <div className="px-3.5 py-3 text-[12px] text-red border border-red/30 bg-red/10 rounded-md">
                {error}
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="px-3.5 py-6 text-center text-[12px] text-text-mute">
                Ничего не найдено
              </div>
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
      )}
    </div>
  );
}

function TenantAvatar({ initial, small }: { initial: string; small?: boolean }) {
  const size = small ? 32 : 24;
  return (
    <div
      className="rounded-full grid place-items-center font-display font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, rgb(var(--gold)), #8b6e1b)',
        color: '#0A0A0B',
        fontSize: small ? 13 : 11,
      }}
    >
      {initial}
    </div>
  );
}
