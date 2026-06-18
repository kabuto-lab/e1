'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api-client';
import { saveAuth, isLoggedIn } from '@/lib/auth';

const TENANT_SLUGS = [
  'pentagon',
  'dachaspa',
  'barbiespa',
  'nebesaspa',
  'imperiumspa',
  'etalonspa',
  '5massage',
  'eroticmassaj',
  'roxy-spa',
  'soho-spa',
];

type LoginMode = 'tenant' | 'platform';

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  kind: 'tenant' | 'platform';
  role: string;
  email: string;
}

/**
 * AdminLoginForm — единая карточка входа в админку NAS (платформа/салон) в
 * фирменном «терминальном» стиле лендинга /nas. Один источник правды: и на
 * странице /nas (под статусом), и на /admin/login. Логика auth — apiFetch + saveAuth.
 */
export function AdminLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('platform');
  const [email, setEmail] = useState('admin@barbie-site1.local');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('barbiespa');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace('/admin/projects');
  }, [router]);

  function setModeAndDefaults(next: LoginMode) {
    setMode(next);
    setError(null);
    setPassword('');
    setEmail(next === 'platform' ? 'admin@barbie-site1.local' : 'admin@pentagon.ru');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<LoginResponse>('/v1/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
        tenantSlug: mode === 'tenant' ? tenantSlug : undefined,
      });

      saveAuth({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        kind: res.kind,
        role: res.role,
        email: res.email,
        tenantSlug,
        expiresAt: Date.now() + res.expiresIn * 1000,
      });
      router.replace('/admin/projects');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body.message ?? `Login failed: HTTP ${err.status}`);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-3 text-left"
    >
      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-bg border border-border rounded-md">
        <button
          type="button"
          onClick={() => setModeAndDefaults('platform')}
          className={`px-3 py-2 text-sm rounded-md transition ${
            mode === 'platform' ? 'bg-accent text-bg font-semibold' : 'text-text-mute hover:text-text'
          }`}
        >
          Админ платформы
        </button>
        <button
          type="button"
          onClick={() => setModeAndDefaults('tenant')}
          className={`px-3 py-2 text-sm rounded-md transition ${
            mode === 'tenant' ? 'bg-accent text-bg font-semibold' : 'text-text-mute hover:text-text'
          }`}
        >
          Админ салона
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-text-mute">Логин (email)</span>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-text-mute">Пароль</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </label>

      {mode === 'tenant' && (
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-text-mute">Салон</span>
          <select
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          >
            {TENANT_SLUGS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <div className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 text-sm rounded-md">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50 hover:opacity-90 transition"
      >
        {loading ? '…' : 'Войти'}
      </button>
    </form>
  );
}
