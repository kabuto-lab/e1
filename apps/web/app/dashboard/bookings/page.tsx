/**
 * Bookings Management Page
 * Manage all bookings and reservations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, Clock, DollarSign, Check, X, Eye, Filter, Search } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { api, type BookingRecord } from '@/lib/api-client';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  pending_payment: 'Ожидает оплаты',
  escrow_funded: 'Эскроу пополнен',
  confirmed: 'Подтверждено',
  in_progress: 'В процессе',
  completed: 'Завершено',
  disputed: 'Спор',
  refunded: 'Возврат',
  cancelled: 'Отменено',
};

export default function BookingsPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listBookings();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить бронирования');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = bookings.filter((booking) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      booking.id.toLowerCase().includes(q) ||
      booking.clientId.toLowerCase().includes(q) ||
      booking.modelId.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    if (L) {
      switch (status) {
        case 'confirmed':
        case 'completed':
          return 'border border-[#00a32a]/40 bg-[#edfaef] text-[#00a32a]';
        case 'pending_payment':
        case 'draft':
          return 'border border-[#dba617]/50 bg-[#fcf9e8] text-[#996800]';
        case 'escrow_funded':
        case 'in_progress':
          return 'border border-[#72aee6]/50 bg-[#f0f6fc] text-[#2271b1]';
        case 'disputed':
        case 'cancelled':
          return 'border border-[#d63638]/40 bg-[#fcf0f1] text-[#d63638]';
        case 'refunded':
          return 'border border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e]';
        default:
          return 'border border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e]';
      }
    }
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'border-green-500/30 bg-green-500/20 text-green-400';
      case 'pending_payment':
      case 'draft':
        return 'border-yellow-500/30 bg-yellow-500/20 text-yellow-400';
      case 'escrow_funded':
      case 'in_progress':
        return 'border-blue-500/30 bg-blue-500/20 text-blue-400';
      case 'disputed':
      case 'cancelled':
        return 'border-red-500/30 bg-red-500/20 text-red-400';
      case 'refunded':
        return 'border-gray-500/30 bg-gray-500/20 text-gray-400';
      default:
        return 'border-gray-500/30 bg-gray-500/20 text-gray-400';
    }
  };

  const handleConfirm = async (bookingId: string) => {
    try {
      const updated = await api.confirmBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка подтверждения');
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      const updated = await api.cancelBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка отмены');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const shortId = (id: string) => id.slice(0, 8) + '…';

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
          <button type="button" onClick={loadBookings} className={t.btnSecondary}>
            <Filter className="h-4 w-4" />
            Обновить
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
            value: bookings.filter((b) => b.status === 'pending_payment' || b.status === 'escrow_funded').length,
            Icon: Clock,
            valClass: L ? 'text-[#1d2327]' : 'text-white',
          },
          {
            label: 'Подтверждено',
            value: bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress').length,
            Icon: Check,
            valClass: L ? 'text-[#1d2327]' : 'text-white',
          },
          {
            label: 'Доход (факт)',
            value: bookings
              .filter((b) => b.status === 'completed')
              .reduce((sum, b) => sum + parseFloat(b.totalAmount || '0'), 0)
              .toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽',
            Icon: DollarSign,
            valClass: accent + ' font-bold',
          },
        ].map(({ label, value, Icon, valClass }) => (
          <div key={label} className={`${t.card} p-4`}>
            <div className="mb-2 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${label === 'Доход (факт)' ? accent : L ? 'text-[#2271b1]' : 'text-[#d4af37]'}`} />
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
            placeholder="Поиск по ID, клиенту, модели..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${t.input} py-3 pl-11 sm:pl-12`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${t.select} py-3 sm:min-w-[200px]`}>
          <option value="all">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="pending_payment">Ожидает оплаты</option>
          <option value="escrow_funded">Эскроу пополнен</option>
          <option value="confirmed">Подтверждено</option>
          <option value="in_progress">В процессе</option>
          <option value="completed">Завершено</option>
          <option value="disputed">Спор</option>
          <option value="refunded">Возврат</option>
          <option value="cancelled">Отменено</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

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
            {isLoading ? (
              <tr>
                <td colSpan={9} className={`px-6 py-12 text-center text-sm ${t.muted}`}>
                  Загрузка...
                </td>
              </tr>
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={9} className={`px-6 py-12 text-center text-sm ${t.muted}`}>
                  {bookings.length === 0 ? 'Бронирований пока нет' : 'Нет совпадений'}
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking) => (
                <tr key={booking.id} className={`border-b ${t.borderRow} ${t.tr}`}>
                  <td className={`px-6 py-4 font-mono text-sm ${t.muted}`} title={booking.id}>
                    {shortId(booking.id)}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/models/${booking.modelId}`} className={`font-mono text-xs ${t.link}`} title={booking.modelId}>
                      {shortId(booking.modelId)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-mono text-xs ${L ? 'text-[#2c3338]' : 'text-gray-300'}`} title={booking.clientId}>
                      {shortId(booking.clientId)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>{formatDate(booking.startTime)}</div>
                    <div className={`text-xs ${t.muted}`}>{formatTime(booking.startTime)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>{booking.durationHours} ч</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>
                      {booking.locationType ?? '—'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm font-semibold ${accent}`}>
                    {parseFloat(booking.totalAmount).toLocaleString('ru-RU')} {booking.currency ?? '₽'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                      {STATUS_LABELS[booking.status] ?? booking.status}
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
                      {booking.status === 'escrow_funded' && (
                        <button
                          type="button"
                          onClick={() => handleConfirm(booking.id)}
                          className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#edfaef]' : 'hover:bg-green-500/20'}`}
                          title="Подтвердить"
                        >
                          <Check className={`h-4 w-4 ${L ? 'text-[#00a32a]' : 'text-green-400'}`} />
                        </button>
                      )}
                      {['draft', 'pending_payment', 'escrow_funded', 'confirmed'].includes(booking.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(booking.id)}
                          className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#fcf0f1]' : 'hover:bg-red-500/20'}`}
                          title="Отменить"
                        >
                          <X className={`h-4 w-4 ${L ? 'text-[#d63638]' : 'text-red-400'}`} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
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
