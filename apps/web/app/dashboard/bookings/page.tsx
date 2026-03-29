/**
 * Bookings Management Page
 * Manage all bookings and reservations
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, DollarSign, User, Check, X, Eye, Filter, Search } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';

interface Booking {
  id: string;
  modelName: string;
  modelId: string;
  clientName: string;
  clientId: string;
  date: string;
  time: string;
  duration: number; // hours
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  amount: number;
  location: string;
  createdAt: string;
}

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'BK-001',
    modelName: 'Юлианна',
    modelId: '1',
    clientName: 'Александр М.',
    clientId: 'C001',
    date: '2026-03-22',
    time: '19:00',
    duration: 3,
    status: 'confirmed',
    amount: 15000,
    location: 'Москва',
    createdAt: '2026-03-20',
  },
  {
    id: 'BK-002',
    modelName: 'Виктория',
    modelId: '2',
    clientName: 'Дмитрий К.',
    clientId: 'C002',
    date: '2026-03-22',
    time: '21:00',
    duration: 5,
    status: 'pending',
    amount: 35000,
    location: 'Санкт-Петербург',
    createdAt: '2026-03-21',
  },
  {
    id: 'BK-003',
    modelName: 'София',
    modelId: '4',
    clientName: 'Михаил С.',
    clientId: 'C003',
    date: '2026-03-21',
    time: '18:00',
    duration: 4,
    status: 'completed',
    amount: 45000,
    location: 'Дубай',
    createdAt: '2026-03-19',
  },
  {
    id: 'BK-004',
    modelName: 'Алина',
    modelId: '3',
    clientName: 'Андрей П.',
    clientId: 'C004',
    date: '2026-03-21',
    time: '20:00',
    duration: 2,
    status: 'cancelled',
    amount: 20000,
    location: 'Москва',
    createdAt: '2026-03-20',
  },
];

export default function BookingsPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    // Load bookings from API
    setBookings(MOCK_BOOKINGS);
    setIsLoading(false);
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = booking.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    if (L) {
      switch (status) {
        case 'confirmed':
          return 'border border-[#00a32a]/40 bg-[#edfaef] text-[#00a32a]';
        case 'pending':
          return 'border border-[#dba617]/50 bg-[#fcf9e8] text-[#996800]';
        case 'completed':
          return 'border border-[#72aee6]/50 bg-[#f0f6fc] text-[#2271b1]';
        case 'cancelled':
          return 'border border-[#d63638]/40 bg-[#fcf0f1] text-[#d63638]';
        default:
          return 'border border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e]';
      }
    }
    switch (status) {
      case 'confirmed':
        return 'border-green-500/30 bg-green-500/20 text-green-400';
      case 'pending':
        return 'border-yellow-500/30 bg-yellow-500/20 text-yellow-400';
      case 'completed':
        return 'border-blue-500/30 bg-blue-500/20 text-blue-400';
      case 'cancelled':
        return 'border-red-500/30 bg-red-500/20 text-red-400';
      default:
        return 'border-gray-500/30 bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '✓ Подтверждено';
      case 'pending': return '⏳ Ожидание';
      case 'completed': return '✓ Завершено';
      case 'cancelled': return '✗ Отменено';
      default: return status;
    }
  };

  const handleApprove = async (bookingId: string) => {
    // TODO: API call to approve booking
    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, status: 'confirmed' as const } : b
    ));
  };

  const handleReject = async (bookingId: string) => {
    // TODO: API call to reject booking
    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
    ));
  };

  return (
    <div className={`flex-1 font-body ${t.page}`}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
            Бронирования
          </h1>
          <p className={`text-sm ${t.muted}`}>Управление бронированиями и встречами</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className={t.btnSecondary}>
            <Filter className="h-4 w-4" />
            Фильтр
          </button>
          <button type="button" className={t.btnPrimary}>
            <Calendar className="h-4 w-4" />
            Создать бронь
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Всего', value: bookings.length, Icon: Calendar, valClass: L ? 'text-[#1d2327]' : 'text-white' },
          {
            label: 'Ожидают',
            value: bookings.filter((b) => b.status === 'pending').length,
            Icon: Clock,
            valClass: L ? 'text-[#1d2327]' : 'text-white',
          },
          {
            label: 'Подтверждено',
            value: bookings.filter((b) => b.status === 'confirmed').length,
            Icon: Check,
            valClass: L ? 'text-[#1d2327]' : 'text-white',
          },
          { label: 'Доход (мес)', value: '₽890K', Icon: DollarSign, valClass: accent + ' font-bold' },
        ].map(({ label, value, Icon, valClass }) => (
          <div key={label} className={`${t.card} p-4`}>
            <div className="mb-2 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${label === 'Доход (мес)' ? accent : L ? 'text-[#2271b1]' : 'text-[#d4af37]'}`} />
              <span className={`text-sm ${t.muted}`}>{label}</span>
            </div>
            <div className={`text-2xl font-bold ${valClass}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col items-stretch gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${L ? 'text-[#646970]' : 'text-gray-400'} sm:left-4`} />
          <input
            type="text"
            placeholder="Поиск бронирований..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${t.input} py-3 pl-11 sm:pl-12`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${t.select} py-3 sm:min-w-[200px]`}>
          <option value="all">Все статусы</option>
          <option value="pending">Ожидают</option>
          <option value="confirmed">Подтверждено</option>
          <option value="completed">Завершено</option>
          <option value="cancelled">Отменено</option>
        </select>
      </div>

      <div className={t.tableWrap}>
        <table className="w-full">
          <thead>
            <tr className={`border-b ${t.borderRow}`}>
              <th className={`${t.th} px-6 py-4`}>ID</th>
              <th className={`${t.th} px-6 py-4`}>Модель</th>
              <th className={`${t.th} px-6 py-4`}>Клиент</th>
              <th className={`${t.th} px-6 py-4`}>Дата/Время</th>
              <th className={`${t.th} px-6 py-4`}>Длительность</th>
              <th className={`${t.th} px-6 py-4`}>Локация</th>
              <th className={`${t.th} px-6 py-4`}>Сумма</th>
              <th className={`${t.th} px-6 py-4`}>Статус</th>
              <th className={`${t.th} px-6 py-4`}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className={`border-b ${t.borderRow} ${t.tr}`}>
                <td className={`px-6 py-4 font-mono text-sm ${t.muted}`}>{booking.id}</td>
                <td className="px-6 py-4">
                  <Link href={`/dashboard/models/${booking.modelId}`} className={`text-sm ${t.link}`}>
                    {booking.modelName}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <User className={`h-4 w-4 ${t.muted}`} />
                    <span className={`text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>{booking.clientName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className={`text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>{booking.date}</div>
                  <div className={`text-xs ${t.muted}`}>{booking.time}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>{booking.duration} ч</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>{booking.location}</span>
                </td>
                <td className={`px-6 py-4 text-sm font-semibold ${accent}`}>₽{booking.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#f0f0f1]' : 'hover:bg-[#333]'}`}
                      title="Просмотр"
                    >
                      <Eye className={`h-4 w-4 ${t.muted}`} />
                    </Link>
                    {booking.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(booking.id)}
                          className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#edfaef]' : 'hover:bg-green-500/20'}`}
                          title="Подтвердить"
                        >
                          <Check className={`h-4 w-4 ${L ? 'text-[#00a32a]' : 'text-green-400'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(booking.id)}
                          className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#fcf0f1]' : 'hover:bg-red-500/20'}`}
                          title="Отклонить"
                        >
                          <X className={`h-4 w-4 ${L ? 'text-[#d63638]' : 'text-red-400'}`} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className={`text-sm ${t.muted}`}>
          Показано {filteredBookings.length} из {bookings.length}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={t.btnSecondary}>
            ← Назад
          </button>
          <button type="button" className={t.btnSecondary}>
            Вперёд →
          </button>
        </div>
      </div>
    </div>
  );
}
