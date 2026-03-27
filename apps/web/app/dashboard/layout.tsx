/**
 * Dashboard Layout
 * Admin panel layout with sidebar navigation
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
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

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
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
    { name: 'Клиенты', href: '#', icon: UserCheck },
    { name: 'Финансы', href: '#', icon: DollarSign },
    { name: 'Настройки', href: '/dashboard/settings', icon: Settings },
  ];

  // Load profile count on mount
  useEffect(() => {
    fetchProfileCount();
    
    // Listen for custom events from child components
    const handleDebugLog = (e: CustomEvent) => {
      addLog(e.detail.type, e.detail.message);
    };
    
    window.addEventListener('debug-log' as any, handleDebugLog as any);
    return () => window.removeEventListener('debug-log' as any, handleDebugLog as any);
  }, []);

  const fetchProfileCount = async () => {
    try {
      // Use /models endpoint instead of /v1/profiles
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models?limit=1`);
      const data = await response.json();
      setProfileCount(Array.isArray(data) ? data.length : 0);
    } catch (e) {
      setProfileCount(0);
    }
  };

  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    setLogs(prev => [...prev.slice(-49), {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    }]);
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
      // Fetch all models
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models?limit=100`);
      const models = await response.json();

      if (Array.isArray(models)) {
        const token = localStorage.getItem('accessToken');
        const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token.replace(/^"|"$/g, '')}` } : {};
        for (const model of models) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models/${model.id}`, {
            method: 'DELETE',
            headers: authHeaders,
          });
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

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-[#141414] border-r border-white/[0.06] transition-transform duration-300 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/[0.06] flex-shrink-0">
          <Link href="/" className="text-xl">
            <Logo />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation - scrollable */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20'
                    : 'text-gray-400 hover:bg-[#262626] hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-body text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Debugger Panel */}
        <div className="border-t border-white/[0.06]">
          <button
            onClick={() => setShowDebugger(!showDebugger)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-[#262626] hover:text-white transition-all"
          >
            <Bug className="w-5 h-5" />
            <span className="text-sm font-medium">Debugger</span>
            {logs.length > 0 && (
              <span className="ml-auto text-xs bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded-full">
                {logs.length}
              </span>
            )}
          </button>
          
          {showDebugger && (
            <div className="px-4 pb-4 space-y-2">
              {/* Stats */}
              <div className="bg-[#0a0a0a] rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Profiles:</span>
                  <span className="text-white font-mono">{profileCount}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={refreshData}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#262626] hover:bg-[#333] rounded text-gray-300 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                  <button
                    onClick={clearProfiles}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>
              
              {/* Logs */}
              <div className="bg-[#0a0a0a] rounded-lg p-2 max-h-48 overflow-y-auto text-xs font-mono space-y-1">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">No logs</div>
                ) : (
                  logs.slice().reverse().map(log => (
                    <div key={log.id} className={`flex gap-2 ${
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                      'text-gray-400'
                    }`}>
                      <span className="text-gray-600">{log.timestamp}</span>
                      <span className="truncate">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Admin button at bottom */}
        <div className="mt-auto border-t border-white/[0.06] p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all mb-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Выйти</span>
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 transition-all text-sm font-medium"
          >
            <Home className="w-4 h-4" />
            На сайт
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Page content - no top bar */}
        <main className="p-4 lg:p-6 lg:pr-8 h-full">
          <div className="max-w-[1800px] mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
