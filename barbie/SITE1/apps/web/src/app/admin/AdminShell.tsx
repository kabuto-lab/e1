'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, type AuthSession } from '@/lib/auth';
import { AmbientBg } from '@/components/admin/shell/AmbientBg';
import { Rail } from '@/components/admin/shell/Rail';
import { Topbar } from '@/components/admin/shell/Topbar';

/**
 * AdminShell — 2-колоночный grid: sticky 232px rail слева + main справа.
 * Auth-gate: если нет сессии и страница не /admin/login — редиректит.
 * Ambient bg рендерится за всем как fixed pointer-events:none слой.
 */
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

  if (isLoginPage) {
    return (
      <>
        <AmbientBg />
        <div className="relative z-10">{children}</div>
      </>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-mute font-mono text-xs">
        loading…
      </div>
    );
  }

  if (!auth) return null; // redirect already triggered

  return (
    <>
      <AmbientBg />
      <div className="relative z-10 grid min-h-screen" style={{ gridTemplateColumns: '56px 1fr' }}>
        <Rail auth={auth} />
        <main className="px-7 py-4 pb-8 flex flex-col gap-5 min-w-0">
          <Topbar auth={auth} />
          <div className="flex-1 min-w-0">{children}</div>
        </main>
      </div>
    </>
  );
}
