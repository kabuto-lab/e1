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

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('tenant');
  const [email, setEmail] = useState('admin@pentagon.ru');
  const [password, setPassword] = useState('TenantAdmin123!');
  const [tenantSlug, setTenantSlug] = useState('pentagon');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace('/admin/projects');
  }, [router]);

  function setModeAndDefaults(next: LoginMode) {
    setMode(next);
    setError(null);
    if (next === 'platform') {
      setEmail('admin@barbie-site1.local');
      setPassword('Admin123!ChangeMe');
    } else {
      setEmail('admin@pentagon.ru');
      setPassword('TenantAdmin123!');
    }
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 p-8 border border-border rounded-md bg-surface"
      >
        <div>
          <div className="font-mono text-xs tracking-widest text-text-mute mb-2">
            NAS · ADMIN
          </div>
          <h1 className="text-2xl font-semibold">Войти</h1>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-bg border border-border rounded-md">
          <button
            type="button"
            onClick={() => setModeAndDefaults('tenant')}
            className={`px-3 py-2 text-sm rounded-md transition ${
              mode === 'tenant'
                ? 'bg-accent text-bg font-semibold'
                : 'text-text-mute hover:text-text'
            }`}
          >
            Админ салона
          </button>
          <button
            type="button"
            onClick={() => setModeAndDefaults('platform')}
            className={`px-3 py-2 text-sm rounded-md transition ${
              mode === 'platform'
                ? 'bg-accent text-bg font-semibold'
                : 'text-text-mute hover:text-text'
            }`}
          >
            Админ платформы
          </button>
        </div>

        <div className="text-xs text-text-mute italic">
          {mode === 'tenant'
            ? 'Вход в админку конкретного салона. Email — admin@<домен-салона>, выберите салон ниже.'
            : 'Вход админа платформы. Email — admin@barbie-site1.local. Салон ниже — рабочий контекст после входа.'}
        </div>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-text-mute">Email</span>
          <input
            type="email"
            required
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-text-mute">
            Выберите салон {mode === 'platform' && '(контекст работы после входа)'}
          </span>
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

        {error && (
          <div className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 text-sm rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
        >
          {loading ? '…' : 'Войти'}
        </button>

        <div className="text-xs text-text-mute leading-relaxed pt-3 border-t border-border">
          Тестовые креды (из seed):<br />
          админ салона: <code className="font-mono">admin@&lt;domain&gt;</code> /{' '}
          <code className="font-mono">TenantAdmin123!</code>
          <br />
          platform-admin: <code className="font-mono">admin@barbie-site1.local</code> /{' '}
          <code className="font-mono">Admin123!ChangeMe</code>
        </div>
      </form>
    </div>
  );
}
