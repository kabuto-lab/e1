/**
 * Dashboard Layout — боковое меню, светлая тема (WordPress) или тёмная премиум.
 */

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';
import { DashboardThemeProvider, useDashboardTheme } from '@/components/DashboardThemeContext';
import { apiUrl } from '@/lib/api-url';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Bug,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface DebugLog {
  id: number;
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isWpAdmin } = useDashboardTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [profileCount, setProfileCount] = useState(0);

  const navigation = [
    { name: 'Дэшборд', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Главная', href: '/dashboard/home', icon: Home },
    { name: 'Модели', href: '/dashboard/models', icon: Users },
    { name: 'Медиатека', href: '/dashboard/media', icon: ImageIcon },
    { name: 'Бронирования', href: '/dashboard/bookings', icon: Calendar },
    { name: 'Модерация', href: '/dashboard/moderation', icon: Shield },
    { name: 'Пользователи', href: '/dashboard/users', icon: UserCheck },
    { name: 'Финансы', href: '#', icon: DollarSign },
    { name: 'Настройки', href: '/dashboard/settings', icon: Settings },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (user && (user.role === 'client' || user.role === 'model')) {
      router.replace('/cabinet');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    fetchProfileCount();
    const handleDebugLog = (e: CustomEvent) => {
      addLog(e.detail.type, e.detail.message);
    };
    window.addEventListener('debug-log' as any, handleDebugLog as any);
    return () => window.removeEventListener('debug-log' as any, handleDebugLog as any);
  }, []);

  const fetchProfileCount = async () => {
    try {
      const response = await fetch(apiUrl('/models?limit=1'));
      const data = await response.json();
      setProfileCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setProfileCount(0);
    }
  };

  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    setLogs((prev) => [
      ...prev.slice(-49),
      { id: Date.now(), timestamp: new Date().toLocaleTimeString(), type, message },
    ]);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const clearProfiles = async () => {
    if (!confirm('Delete all test profiles?')) return;
    try {
      const response = await fetch(apiUrl('/models?limit=100'));
      const models = await response.json();
      if (Array.isArray(models)) {
        const token = localStorage.getItem('accessToken');
        const authHeaders: Record<string, string> = token
          ? { Authorization: `Bearer ${token.replace(/^"|"$/g, '')}` }
          : {};
        for (const model of models) {
          await fetch(apiUrl(`/models/${model.id}`), { method: 'DELETE', headers: authHeaders });
        }
        addLog('success', `Deleted ${models.length} models`);
        setProfileCount(0);
      }
    } catch (err: any) {
      addLog('error', `Failed to delete: ${err.message}`);
    }
  };

  const refreshData = () => {
    fetchProfileCount();
    addLog('info', 'Data refreshed');
  };

  if (!authLoading && user && (user.role === 'client' || user.role === 'model')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#d4af37]" />
          <p className="text-sm text-[#d4af37]">Загрузка...</p>
        </div>
      </div>
    );
  }

  const asideBase =
    'fixed z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ' +
    (isWpAdmin
      ? 'top-8 left-0 h-[calc(100dvh-2rem)] w-40 border-r border-[#00000040] bg-[#23282d] lg:top-8'
      : 'top-0 left-0 h-screen w-64 border-r border-white/[0.06] bg-[#141414]');

  const navLinkClass = (active: boolean) => {
    if (isWpAdmin) {
      return `flex items-center gap-2 px-3 py-2 text-[13px] transition-colors ${
        active
          ? 'border-l-4 border-l-[#00b9eb] bg-[#32373c] font-semibold text-white'
          : 'border-l-4 border-l-transparent text-[#b4b9be] hover:border-l-transparent hover:bg-[#32373c] hover:text-[#00b9eb]'
      }`;
    }
    return `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active
        ? 'border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]'
        : 'text-gray-400 hover:bg-[#262626] hover:text-white'
    }`;
  };

  const dbgRowBtn =
    'group flex flex-1 min-w-0 flex-col items-center justify-end gap-0 px-1 pb-2 pt-1 text-xs font-medium transition-colors ' +
    (isWpAdmin
      ? 'border-[#32373c] text-[#b4b9be] hover:bg-[#32373c] hover:text-[#00b9eb]'
      : 'text-gray-400 hover:bg-[#262626] hover:text-white');

  const dbgIconBtn =
    dbgRowBtn + (isWpAdmin ? ' border-l border-[#32373c]' : ' border-l border-white/[0.08]');

  const dbgLabelAbove =
    'pointer-events-none mb-0.5 min-h-[13px] w-full max-w-full px-0.5 text-center text-[10px] font-medium leading-tight opacity-0 transition-opacity duration-200 ' +
    'group-hover:opacity-100 group-focus-visible:opacity-100 ' +
    (isWpAdmin ? 'text-[#e2e4e7]' : 'text-gray-200');

  return (
    <div
      className={isWpAdmin ? 'min-h-screen bg-[#f0f0f1]' : 'min-h-screen bg-[#0a0a0a]'}
      data-dashboard-theme={isWpAdmin ? 'wp-admin' : 'default'}
    >
      {isWpAdmin && (
        <div className="fixed left-0 right-0 top-0 z-[60] flex h-8 items-center gap-4 border-b border-black/50 bg-[#23282d] px-3 text-[12px] text-[#c3c4c7]">
          <span className="font-semibold text-white">Lovnge</span>
          <span className="hidden text-[#a0a5aa] sm:inline">Панель управления</span>
          <span className="ml-auto text-[#a0a5aa]">Светлая тема</span>
        </div>
      )}

      {sidebarOpen && (
        <div
          className={`fixed inset-0 z-40 lg:hidden ${isWpAdmin ? 'bg-black/50' : 'bg-black/50'}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside className={`${asideBase} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div
          className={`flex h-14 flex-shrink-0 items-center justify-between px-3 ${
            isWpAdmin ? 'border-b border-[#32373c]' : 'border-b border-white/[0.06] px-6'
          }`}
        >
          {isWpAdmin ? (
            <Link href="/" className="truncate text-sm font-semibold text-white">
              Консоль
            </Link>
          ) : (
            <Link href="/" className="text-xl">
              <Logo />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className={isWpAdmin ? 'text-[#b4b9be] hover:text-white lg:hidden' : 'text-gray-400 hover:text-white lg:hidden'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className={`flex-1 space-y-0.5 overflow-y-auto ${isWpAdmin ? 'px-0 py-2' : 'space-y-2 px-4 py-6'}`}>
          {navigation.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : (pathname ?? '').startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={navLinkClass(isActive && item.href !== '#')}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={`h-4 w-4 flex-shrink-0 ${isWpAdmin ? 'opacity-90' : 'h-5 w-5'}`} />
                <span className={isWpAdmin ? 'truncate' : 'font-body text-sm font-medium'}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={isWpAdmin ? 'border-t border-[#32373c]' : 'border-t border-white/[0.06]'}>
          <div className={`flex ${isWpAdmin ? '' : ''}`}>
            <button
              type="button"
              title="Debugger"
              onClick={() => setShowDebugger(!showDebugger)}
              className={dbgRowBtn}
            >
              <span className={dbgLabelAbove}>Debugger</span>
              <div className="flex items-center justify-center gap-0.5">
                <Bug className="h-4 w-4 flex-shrink-0" />
                {logs.length > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-px text-[10px] ${
                      isWpAdmin ? 'bg-[#0073aa] text-white' : 'bg-[#d4af37]/20 text-[#d4af37]'
                    }`}
                  >
                    {logs.length}
                  </span>
                )}
              </div>
            </button>
            <button type="button" onClick={handleLogout} className={dbgIconBtn} title="Выйти">
              <span className={dbgLabelAbove}>Выйти</span>
              <LogOut className="h-4 w-4 flex-shrink-0" />
            </button>
            <Link
              href="/dashboard/settings"
              className={`${dbgIconBtn} flex`}
              title="Настройки"
              onClick={() => setSidebarOpen(false)}
            >
              <span className={dbgLabelAbove}>Настройки</span>
              <Settings className="h-4 w-4 flex-shrink-0" />
            </Link>
          </div>

          {showDebugger && (
            <div className={`space-y-2 px-2 pb-3 pt-1 ${isWpAdmin ? '' : 'px-4 pb-4'}`}>
              <div
                className={`rounded p-2 text-xs ${
                  isWpAdmin ? 'border border-[#c3c4c7] bg-white text-[#2c3338]' : 'rounded-lg bg-[#0a0a0a] p-3'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={isWpAdmin ? 'text-[#646970]' : 'text-gray-400'}>Profiles:</span>
                  <span className={`font-mono ${isWpAdmin ? 'text-[#1d2327]' : 'text-white'}`}>{profileCount}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={refreshData}
                    className={
                      isWpAdmin
                        ? 'flex flex-1 items-center justify-center gap-1 rounded border border-[#c3c4c7] bg-[#f6f7f7] px-2 py-1.5 text-[#2c3338] hover:bg-[#f0f0f1]'
                        : 'flex flex-1 items-center justify-center gap-1 rounded bg-[#262626] px-2 py-1.5 text-gray-300 hover:bg-[#333]'
                    }
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </button>
                  <button
                    type="button"
                    onClick={clearProfiles}
                    className={
                      isWpAdmin
                        ? 'flex flex-1 items-center justify-center gap-1 rounded border border-[#d63638] bg-[#fcf0f1] px-2 py-1.5 text-[#d63638] hover:bg-[#f6dada]'
                        : 'flex flex-1 items-center justify-center gap-1 rounded bg-red-500/20 px-2 py-1.5 text-red-400 hover:bg-red-500/30'
                    }
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </div>
              </div>
              <div
                className={`max-h-48 space-y-1 overflow-y-auto p-2 font-mono text-xs ${
                  isWpAdmin ? 'border border-[#c3c4c7] bg-white' : 'rounded-lg bg-[#0a0a0a] p-2'
                }`}
              >
                {logs.length === 0 ? (
                  <div className={`py-4 text-center ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>No logs</div>
                ) : (
                  logs
                    .slice()
                    .reverse()
                    .map((log) => (
                      <div
                        key={log.id}
                        className={`flex gap-2 ${
                          log.type === 'error'
                            ? isWpAdmin
                              ? 'text-[#d63638]'
                              : 'text-red-400'
                            : log.type === 'success'
                              ? isWpAdmin
                                ? 'text-[#00a32a]'
                                : 'text-green-400'
                              : isWpAdmin
                                ? 'text-[#646970]'
                                : 'text-gray-400'
                        }`}
                      >
                        <span className={isWpAdmin ? 'text-[#a7aaad]' : 'text-gray-600'}>{log.timestamp}</span>
                        <span className="truncate">{log.message}</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`mt-auto border-t p-3 ${isWpAdmin ? 'border-[#32373c]' : 'border-white/[0.06] p-4'}`}>
          <Link
            href="/"
            className={
              isWpAdmin
                ? 'flex items-center justify-center gap-2 rounded border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[12px] font-medium text-[#2271b1] hover:border-[#2271b1] hover:bg-white'
                : 'flex items-center justify-center gap-2 rounded-lg bg-[#d4af37]/10 px-4 py-2.5 text-sm font-medium text-[#d4af37] hover:bg-[#d4af37]/20'
            }
          >
            <Home className="h-4 w-4" />
            На сайт
          </Link>
        </div>
      </aside>

      <button
        type="button"
        className={`fixed z-[45] rounded-md p-2 shadow-md lg:hidden ${
          isWpAdmin ? 'left-2 top-10 bg-[#23282d] text-[#b4b9be] hover:text-white' : 'left-2 top-2 bg-[#141414] text-gray-300 hover:text-white'
        }`}
        onClick={() => setSidebarOpen(true)}
        aria-label="Открыть меню"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className={isWpAdmin ? 'flex min-h-dvh flex-1 flex-col lg:ml-40' : 'flex min-h-dvh flex-col lg:ml-64'}>
        <main
          className={
            isWpAdmin
              ? 'flex min-h-0 flex-1 flex-col bg-[#f0f0f1] p-4 pt-10 lg:pt-12'
              : 'flex min-h-0 flex-1 flex-col bg-[#0a0a0a] p-4 lg:p-6 lg:pr-8'
          }
        >
          <div
            className={
              isWpAdmin
                ? 'mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col border border-[#c3c4c7] bg-white p-5 shadow-[0_1px_1px_rgba(0,0,0,0.04)]'
                : 'mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col'
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardThemeProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardThemeProvider>
  );
}
