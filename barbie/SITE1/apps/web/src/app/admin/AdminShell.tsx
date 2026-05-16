'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, clearAuth, type AuthSession } from '@/lib/auth';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    const s = getAuth();
    setAuth(s);
    setHydrated(true);
    if (!s && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [pathname, isLoginPage, router]);

  function onLogout() {
    clearAuth();
    setAuth(null);
    router.replace('/admin/login');
  }

  // Login page renders without auth/hydration gating — needs to be visible on SSR.
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-mute font-mono text-xs">
        loading…
      </div>
    );
  }

  if (!auth) {
    return null; // redirect already triggered
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <a href="/admin/menu" className="flex items-baseline gap-3">
            <span className="font-mono text-xs tracking-widest text-text-mute">NAS · ADMIN</span>
            <span className="text-base font-semibold">{auth.tenantSlug}</span>
          </a>
          <nav className="hidden md:flex gap-5 text-sm text-text-mute">
            <a href="/admin/menu" className="hover:text-text">Меню сайта</a>
          </nav>
          <div className="flex items-center gap-4 text-xs text-text-mute">
            <span>
              {auth.email} <span className="opacity-50">· {auth.role}</span>
            </span>
            <button
              onClick={onLogout}
              className="px-2 py-1 border border-border rounded hover:bg-bg"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
