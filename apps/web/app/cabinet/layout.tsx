'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import {
  Home,
  Star,
  Calendar,
  CreditCard,
  Crown,
  MessageSquare,
  Bell,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/cabinet', label: 'Обзор', icon: Home },
  { href: '/cabinet/favorites', label: 'Избранное', icon: Star },
  { href: '/cabinet/bookings', label: 'Встречи', icon: Calendar },
  { href: '/cabinet/payments', label: 'Оплаты', icon: CreditCard },
  { href: '/cabinet/club', label: 'Клуб', icon: Crown },
  { href: '/cabinet/messages', label: 'Сообщения', icon: MessageSquare },
  { href: '/cabinet/notifications', label: 'Уведомления', icon: Bell },
  { href: '/cabinet/documents', label: 'Документы', icon: FileText },
  { href: '/cabinet/settings', label: 'Настройки', icon: Settings },
] as const;

function CabinetShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-4 py-3 font-body text-sm font-medium transition-all ${
      active
        ? 'border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]'
        : 'text-gray-400 hover:bg-[#262626] hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 -translate-x-full flex-col border-r border-white/[0.06] bg-[#141414] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
          <Link href="/" className="text-xl" onClick={() => setSidebarOpen(false)}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-white lg:hidden"
            aria-label="Закрыть меню"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {NAV.map((item) => {
            const active =
              item.href === '/cabinet'
                ? pathname === '/cabinet'
                : (pathname ?? '').startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(active)}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <p className="mb-3 truncate font-body text-xs text-white/35" title={user?.email ?? ''}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2.5 font-body text-sm text-white/70 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
          <Link
            href="/"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#d4af37]/10 px-4 py-2.5 text-sm font-medium text-[#d4af37] hover:bg-[#d4af37]/20"
            onClick={() => setSidebarOpen(false)}
          >
            <Home className="h-4 w-4" />
            На сайт
          </Link>
        </div>
      </aside>

      <button
        type="button"
        className="fixed left-2 top-2 z-[45] rounded-md bg-[#141414] p-2 text-gray-300 shadow-md hover:text-white lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Открыть меню"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="lg:ml-64">
        <main className="min-h-dvh p-4 pt-14 lg:p-6 lg:pt-6">
          <div className="mx-auto max-w-[900px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function CabinetLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute
      requiredRoles={['client', 'model']}
      redirectOnRoleMismatch="/dashboard"
    >
      <CabinetShell>{children}</CabinetShell>
    </ProtectedRoute>
  );
}
