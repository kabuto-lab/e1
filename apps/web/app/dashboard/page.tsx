/**
 * Главная панель: четыре прокручиваемые колонки очереди модерации + краткий обзор.
 */

'use client';

import Link from 'next/link';
import { DebugPanel } from '@/components/DebugPanel';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { ModerationQueueBoard } from '@/components/ModerationQueueBoard';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import {
  Users,
  Plus,
  ArrowRight,
  Settings,
  LogOut,
  Shield,
  Home,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';

  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <div className={`flex min-h-0 flex-1 flex-col gap-5 ${t.page}`}>
        <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
              Панель управления
            </h1>
            <p className={`font-body mt-1 max-w-3xl text-sm ${t.muted}`}>
              Сводка по срочным задачам: новые анкеты, фото и файлы на модерации, отзывы. Ниже — четыре независимые
              колонки (на узком экране они складываются в сетку 2×2, на мобильном — списком).
            </p>
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
              <div className="text-right">
                <div className={`text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>{user.email}</div>
                <div className={`text-xs capitalize ${t.muted}`}>{user.role}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className={`rounded-md p-2 transition-colors ${L ? 'text-[#646970] hover:text-[#d63638]' : 'text-gray-400 hover:text-red-400'}`}
                title="Выйти"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div
          className={`flex shrink-0 flex-wrap gap-2 border-b pb-4 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}
        >
          <Link
            href="/dashboard/models/create"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${t.btnSecondary}`}
          >
            <Plus className={`h-4 w-4 ${accent}`} />
            Модель
          </Link>
          <Link
            href="/dashboard/models/list"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${t.btnSecondary}`}
          >
            <Users className={`h-4 w-4 ${accent}`} />
            Список
          </Link>
          <Link
            href="/dashboard/moderation"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${t.btnSecondary}`}
          >
            <Shield className={`h-4 w-4 ${accent}`} />
            Модерация
            <ArrowRight className="h-3.5 w-3.5 opacity-60" />
          </Link>
          <Link
            href="/dashboard/home"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${t.btnSecondary}`}
          >
            <Home className={`h-4 w-4 ${accent}`} />
            Главная сайта
          </Link>
          <Link
            href="/dashboard/settings"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${t.btnSecondary}`}
          >
            <Settings className={`h-4 w-4 ${accent}`} />
            Настройки
          </Link>
        </div>

        <div className="min-h-0 flex-1">
          <ModerationQueueBoard variant="dashboard" className="h-full min-h-[min(520px,70vh)] xl:min-h-0" />
        </div>

        <DebugPanel />
      </div>
    </ProtectedRoute>
  );
}
