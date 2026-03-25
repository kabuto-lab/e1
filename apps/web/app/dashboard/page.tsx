/**
 * Dashboard Home Page
 * Overview with stats and quick actions
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DebugPanel } from '@/components/DebugPanel';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Панель управления</h1>
          <p className="text-gray-400 mt-1">Обзор статистики и управление платформой</p>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-white">{user.email}</div>
              <div className="text-xs text-gray-500 capitalize">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#d4af37]/10 to-[#d4af37]/5 border border-[#d4af37]/20 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">
          Добро пожаловать, {user?.role === 'admin' ? 'Администратор' : 'Менеджер'}! 👋
        </h2>
        <p className="text-gray-400">
          Это панель управления платформой Lovnge. Здесь вы можете управлять моделями,
          клиентами, бронированиями и финансами.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 hover:border-[#d4af37]/30 transition-all hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-8 h-8 text-[#d4af37]" />
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-[#d4af37] mb-2">
              {stat.value}
            </div>
            <div className="text-sm text-gray-400 mb-3">{stat.name}</div>
            <div className="text-xs text-green-500">{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Последние бронирования</h3>
            <Link
              href="#"
              className="text-sm text-[#d4af37] hover:text-[#f4d03f] flex items-center gap-1"
            >
              Все <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { id: '#BK-001', model: 'Юлианна', client: 'Александр М.', status: 'Подтверждено', amount: '₽25,000' },
              { id: '#BK-002', model: 'Виктория', client: 'Дмитрий К.', status: 'Ожидание', amount: '₽35,000' },
              { id: '#BK-003', model: 'София', client: 'Михаил С.', status: 'Завершено', amount: '₽45,000' },
            ].map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium text-white">{booking.model}</div>
                  <div className="text-xs text-gray-500">{booking.client}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{booking.amount}</div>
                  <div
                    className={`text-xs ${
                      booking.status === 'Подтверждено'
                        ? 'text-green-500'
                        : booking.status === 'Ожидание'
                        ? 'text-yellow-500'
                        : 'text-gray-500'
                    }`}
                  >
                    {booking.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Быстрые действия</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/dashboard/models/create"
              className="flex flex-col items-center justify-center p-6 bg-[#0a0a0a] rounded-lg hover:bg-[#d4af37]/10 hover:border-[#d4af37]/30 border border-[#333] transition-all group"
            >
              <Plus className="w-8 h-8 text-[#d4af37] mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-white text-center">
                Добавить модель
              </span>
            </Link>
            <Link
              href="#"
              className="flex flex-col items-center justify-center p-6 bg-[#0a0a0a] rounded-lg hover:bg-[#d4af37]/10 hover:border-[#d4af37]/30 border border-[#333] transition-all group"
            >
              <Users className="w-8 h-8 text-[#d4af37] mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-white text-center">
                Рассылка
              </span>
            </Link>
            <Link
              href="#"
              className="flex flex-col items-center justify-center p-6 bg-[#0a0a0a] rounded-lg hover:bg-[#d4af37]/10 hover:border-[#d4af37]/30 border border-[#333] transition-all group"
            >
              <TrendingUp className="w-8 h-8 text-[#d4af37] mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-white text-center">
                Отчёт
              </span>
            </Link>
            <Link
              href="#"
              className="flex flex-col items-center justify-center p-6 bg-[#0a0a0a] rounded-lg hover:bg-[#d4af37]/10 hover:border-[#d4af37]/30 border border-[#333] transition-all group"
            >
              <Settings className="w-8 h-8 text-[#d4af37] mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-white text-center">
                Настройки
              </span>
            </Link>
          </div>
        </div>
      </div>
      <DebugPanel />
    </div>
    </ProtectedRoute>
  );
}
