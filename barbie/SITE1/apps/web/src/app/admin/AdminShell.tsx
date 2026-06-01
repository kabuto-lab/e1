'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, type AuthSession } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import type { SiteType } from '@/lib/site-type-capabilities';
import { AmbientBg } from '@/components/admin/shell/AmbientBg';
import { Rail } from '@/components/admin/shell/Rail';
import { Topbar } from '@/components/admin/shell/Topbar';
import { ChatDock } from '@/components/chat/ChatDock';

/**
 * AdminShell — 2-колоночный grid: sticky 232px rail слева + main справа.
 * Auth-gate: если нет сессии и страница не /admin/login — редиректит.
 * Ambient bg рендерится за всем как fixed pointer-events:none слой.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [siteType, setSiteType] = useState<SiteType | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    const s = getAuth();
    setAuth(s);
    setHydrated(true);
    if (!s && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [pathname, isLoginPage, router]);

  // Resolve the tenant's vertical once per session to gate rail modules.
  // Public read; failure leaves siteType null → rail hides vertical sections
  // (fail-closed; the API + page-level capability guard remain the real authz).
  useEffect(() => {
    if (!auth?.tenantSlug) return;
    let cancelled = false;
    apiFetch<{ siteType?: string }>(`/v1/public/tenants/by-slug/${auth.tenantSlug}`)
      .then((t) => {
        if (!cancelled && t.siteType) setSiteType(t.siteType as SiteType);
      })
      .catch(() => {
        /* leave null — vertical rail sections stay hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [auth?.tenantSlug]);

  if (isLoginPage) {
    return (
      <>
        <AmbientBg />
        <div className="relative z-10 nas-admin-jbm">{children}</div>
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
      {/* SVG filter for gooey menu (см. SettingsGooMenu + globals.css `.nas-goo*`).
          Width/height 0 — занимает 0px, но определения <defs> доступны всем. */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: 'absolute', pointerEvents: 'none' }}
      >
        <defs>
          <filter id="nas-goo" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend in2="goo" in="SourceGraphic" result="gooBlend" />
            {/* Мягкая тень под всей gooey-формой — и под триггером, и под
                всплывшими золотыми кружками, чтобы они не сливались с контентом. */}
            <feDropShadow
              in="gooBlend"
              dx="0"
              dy="3"
              stdDeviation="5"
              floodColor="#000000"
              floodOpacity="0.6"
            />
          </filter>
        </defs>
      </svg>
      <div
        className="relative z-10 grid min-h-screen nas-admin-jbm"
        style={{ gridTemplateColumns: chatOpen ? '56px 1fr 16.6667vw' : '56px 1fr' }}
      >
        <Rail
          auth={auth}
          siteType={siteType}
          chatOpen={chatOpen}
          onChatToggle={() => setChatOpen((v) => !v)}
        />
        <main className="px-7 py-4 pb-8 flex flex-col gap-5 min-w-0">
          <Topbar />
          <div className="flex-1 min-w-0">{children}</div>
        </main>
        {chatOpen && <ChatDock onClose={() => setChatOpen(false)} />}
      </div>
    </>
  );
}
