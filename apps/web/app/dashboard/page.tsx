/**
 * Dashboard Home Page
 * Overview with stats and quick actions
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DebugPanel } from '@/components/DebugPanel';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import {
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowRight,
  Settings,
  LogOut,
} from 'lucide-react';

interface Stats {
  models: number;
  clients: number;
  bookings: number;
  revenue: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';
  const [stats, setStats] = useState<Stats>({
    models: 13,
    clients: 248,
    bookings: 42,
    revenue: '₽890K',
  });

  const statCards = [
    {
      name: 'Моделей',
      value: stats.models,
      icon: Users,
      change: '+2 за неделю',
      changeType: 'positive',
    },
    {
      name: 'Клиентов',
      value: stats.clients,
      icon: UserCheck,
      change: '+12 за неделю',
      changeType: 'positive',
    },
    {
      name: 'Бронирований',
      value: stats.bookings,
      icon: Calendar,
      change: '+8 за неделю',
      changeType: 'positive',
    },
    {
      name: 'Доход (месяц)',
      value: stats.revenue,
      icon: DollarSign,
      change: '+15% к прошлому месяцу',
      changeType: 'positive',
    },
  ];

  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
    <div className={`space-y-8 ${t.page}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
            Панель управления
          </h1>
          <p className={`font-body mt-1 text-sm ${t.muted}`}>Обзор статистики и управление платформой</p>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>{user.email}</div>
              <div className={`text-xs capitalize ${t.muted}`}>{user.role}</div>
            </div>
            <button
              onClick={logout}
              className={`p-2 transition-colors ${L ? 'text-[#646970] hover:text-[#d63638]' : 'text-gray-400 hover:text-red-400'}`}
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className={t.welcomeBanner}>
        <h2 className={`mb-2 text-xl font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>
          Добро пожаловать, {user?.role === 'admin' ? 'Администратор' : 'Менеджер'}! 👋
        </h2>
        <p className={t.muted}>
          Это панель управления платформой Lovnge. Здесь вы можете управлять моделями, клиентами, бронированиями и
          финансами.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className={`${t.card} ${t.cardPad}`}>
            <div className="mb-4 flex items-center justify-between">
              <stat.icon className={`h-8 w-8 ${accent}`} />
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className={`font-display mb-2 text-2xl font-bold ${accent}`}>{stat.value}</div>
            <div className={`font-body mb-3 text-sm ${t.muted}`}>{stat.name}</div>
            <div className="font-body text-xs text-green-600">{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${t.card} p-6`}>
          <div className="mb-6 flex items-center justify-between">
            <h3 className={L ? 'text-lg font-semibold text-[#1d2327]' : 'text-lg font-bold text-white'}>
              Последние бронирования
            </h3>
            <Link href="#" className={`${t.link} flex items-center gap-1 text-sm`}>
              Все <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { id: '#BK-001', model: 'Юлианна', client: 'Александр М.', status: 'Подтверждено', amount: '₽25,000' },
              { id: '#BK-002', model: 'Виктория', client: 'Дмитрий К.', status: 'Ожидание', amount: '₽35,000' },
              { id: '#BK-003', model: 'София', client: 'Михаил С.', status: 'Завершено', amount: '₽45,000' },
            ].map((booking) => (
              <div key={booking.id} className={`flex items-center justify-between p-3 ${t.nestedPanel}`}>
                <div>
                  <div className={`text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>{booking.model}</div>
                  <div className={`text-xs ${t.muted}`}>{booking.client}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>{booking.amount}</div>
                  <div
                    className={`text-xs ${
                      booking.status === 'Подтверждено'
                        ? 'text-green-600'
                        : booking.status === 'Ожидание'
                          ? 'text-amber-600'
                          : t.muted
                    }`}
                  >
                    {booking.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${t.card} p-6`}>
          <h3 className={`mb-6 text-lg font-bold ${L ? 'font-semibold text-[#1d2327]' : 'text-white'}`}>
            Быстрые действия
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/models/create" className={t.quickActionTile}>
              <Plus className={`mb-3 h-8 w-8 transition-transform group-hover:scale-110 ${accent}`} />
              <span className={`text-center text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>Добавить модель</span>
            </Link>
            <Link href="#" className={t.quickActionTile}>
              <Users className={`mb-3 h-8 w-8 transition-transform group-hover:scale-110 ${accent}`} />
              <span className={`text-center text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>Рассылка</span>
            </Link>
            <Link href="#" className={t.quickActionTile}>
              <TrendingUp className={`mb-3 h-8 w-8 transition-transform group-hover:scale-110 ${accent}`} />
              <span className={`text-center text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>Отчёт</span>
            </Link>
            <Link href="#" className={t.quickActionTile}>
              <Settings className={`mb-3 h-8 w-8 transition-transform group-hover:scale-110 ${accent}`} />
              <span className={`text-center text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>Настройки</span>
            </Link>
          </div>
        </div>
      </div>
      <DebugPanel />
    </div>
    </ProtectedRoute>
  );
}
