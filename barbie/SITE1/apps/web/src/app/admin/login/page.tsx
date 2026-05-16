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
  const [email, setEmail] = useState('admin@pentagon.ru');
  const [password, setPassword] = useState('TenantAdmin123!');
  const [tenantSlug, setTenantSlug] = useState('pentagon');
  const [isPlatform, setIsPlatform] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace('/admin/menu');
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<LoginResponse>('/v1/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
        tenantSlug: isPlatform ? undefined : tenantSlug,
      });

      saveAuth({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        kind: res.kind,
        role: res.role,
        email: res.email,
        tenantSlug: isPlatform ? tenantSlug : tenantSlug,
        expiresAt: Date.now() + res.expiresIn * 1000,
      });
      router.replace('/admin/menu');
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
        className="w-full max-w-md space-y-5 p-8 border border-border rounded bg-surface"
      >
        <div>
          <div className="font-mono text-xs tracking-widest text-text-mute mb-2">
            NAS · ADMIN
          </div>
          <h1 className="text-2xl font-semibold">Войти</h1>
        </div>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-text-mute">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
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
            className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-text-mute">Tenant</span>
          <select
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
          >
            {TENANT_SLUGS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-text-mute">
          <input
            type="checkbox"
            checked={isPlatform}
            onChange={(e) => setIsPlatform(e.target.checked)}
          />
          Я platform-admin (логин без tenant header, но управляю выбранным тенантом)
        </label>

        {error && (
          <div className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 text-sm rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-accent text-bg font-semibold rounded disabled:opacity-50"
        >
          {loading ? '…' : 'Войти'}
        </button>

        <div className="text-xs text-text-mute leading-relaxed pt-3 border-t border-border">
          Тестовые креды (из seed):<br />
          tenant-admin: <code className="font-mono">admin@&lt;domain&gt;</code> /{' '}
          <code className="font-mono">TenantAdmin123!</code>
          <br />
          platform-admin: <code className="font-mono">admin@barbie-site1.local</code> /{' '}
          <code className="font-mono">Admin123!ChangeMe</code>
        </div>
      </form>
    </div>
  );
}
