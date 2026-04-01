/**
 * Модерация — те же четыре колонки, что на главной панели (отдельная страница в меню).
 */

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ModerationQueueBoard } from '@/components/ModerationQueueBoard';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';

export default function ModerationPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);

  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <div className={`flex min-h-0 flex-1 flex-col ${t.page}`}>
        <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
              Модерация
            </h1>
            <p className={`mt-1 text-sm ${t.muted}`}>Верификация анкет, медиа и отзывы (очередь API).</p>
          </div>
          <Link
            href="/dashboard"
            className={`inline-flex items-center gap-2 text-sm font-medium ${t.link} shrink-0`}
          >
            <ArrowLeft className="h-4 w-4" />
            На панель
          </Link>
        </div>
        <ModerationQueueBoard variant="page" className="min-h-0 flex-1" />
      </div>
    </ProtectedRoute>
  );
}
