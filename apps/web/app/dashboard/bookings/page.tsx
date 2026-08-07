/**
 * Bookings Management Page
 * Manage all bookings and reservations
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Calendar, Clock, DollarSign, Check, X, Eye, Filter, ChevronDown, CalendarClock, RefreshCw } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { api, type BookingRecord } from '@/lib/api-client';
import { ProposeTimeModal } from '@/components/ProposeTimeModal';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Новая заявка',
  time_proposed: 'Предложено время',
  pending_payment: 'Ожидает оплаты',
  escrow_funded: 'Эскроу пополнен',
  confirmed: 'Подтверждено',
  in_progress: 'В процессе',
  completed: 'Завершено',
  disputed: 'Спор',
  declined: 'Отклонено',
  refunded: 'Возврат',
  cancelled: 'Отменено',
};

const PAGE_SIZE = 20;

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Все статусы' },
  { value: 'draft', label: 'Новая заявка' },
  { value: 'time_proposed', label: 'Предложено время' },
  { value: 'pending_payment', label: 'Ожидает оплаты' },
  { value: 'escrow_funded', label: 'Эскроу пополнен' },
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'in_progress', label: 'В процессе' },
  { value: 'completed', label: 'Завершено' },
  { value: 'disputed', label: 'Спор' },
  { value: 'declined', label: 'Отклонено' },
  { value: 'refunded', label: 'Возврат' },
  { value: 'cancelled', label: 'Отменено' },
];

export default function BookingsPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [proposeTimeTarget, setProposeTimeTarget] = useState<string | null>(null);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusFilterOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(e.target as Node)) {
        setStatusFilterOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStatusFilterOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [statusFilterOpen]);

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
    return statusFilter === 'all' || booking.status === statusFilter;
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedBookings = filteredBookings.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

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
        case 'time_proposed':
          return 'border border-[#72aee6]/50 bg-[#f0f6fc] text-[#2271b1]';
        case 'disputed':
        case 'cancelled':
        case 'declined':
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
      case 'time_proposed':
        return 'border-blue-500/30 bg-blue-500/20 text-blue-400';
      case 'disputed':
      case 'cancelled':
      case 'declined':
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

  const handleDecline = async (bookingId: string) => {
    const reason = window.prompt('Причина отклонения (необязательно):') ?? undefined;
    try {
      const updated = await api.declineBooking(bookingId, reason || undefined);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка отклонения');
    }
  };

  const handleProposeTime = async (bookingId: string, proposedStartTimeIso: string) => {
    const updated = await api.proposeBookingTime(bookingId, proposedStartTimeIso);
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
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
          <p className={`mt-1 text-sm ${t.muted}`}>Управление бронированиями и встречами</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={loadBookings} className={`${t.btnSecondary} px-3 py-1.5 text-xs`}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
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

      <div className="mb-6 flex justify-end">
        <div ref={statusFilterRef} className="relative w-64">
          <button
            type="button"
            onClick={() => setStatusFilterOpen((v) => !v)}
            aria-expanded={statusFilterOpen}
            className={`flex w-full cursor-pointer items-center justify-between gap-2 text-left transition-colors ${t.input} ${
              statusFilterOpen ? (L ? 'border-[#2271b1]' : 'border-[#d4af37]/40') : ''
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Filter className={`h-4 w-4 ${L ? 'text-[#2271b1]/70' : 'text-[#d4af37]/70'}`} />
              {STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'Все статусы'}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${L ? 'text-[#2271b1]/60' : 'text-[#d4af37]/60'} ${
                statusFilterOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {statusFilterOpen && (
            <div className={`absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-lg border shadow-[0_16px_40px_rgba(0,0,0,0.25)] ${
              L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.08] bg-[#141414]'
            }`}>
              <div className="max-h-72 overflow-y-auto">
                {STATUS_FILTER_OPTIONS.map((option) => {
                  const active = statusFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option.value);
                        setStatusFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                        active
                          ? L ? 'bg-[#f0f6fc] text-[#2271b1]' : 'bg-[#d4af37]/10 text-[#d4af37]'
                          : L ? 'text-[#2c3338] hover:bg-[#f6f7f7]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      {option.label}
                      {active && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
              <th className={`${t.th} px-6 py-4 min-w-[135px] text-center`}>Дата/Время</th>
              <th className={`${t.th} px-6 py-4`}>Длительность</th>
              <th className={`${t.th} px-6 py-4 min-w-[130px]`}>Локация</th>
              <th className={`${t.th} px-6 py-4`}>Сумма</th>
              <th className={`${t.th} px-6 py-4 min-w-[200px] text-center`}>Статус</th>
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
              pagedBookings.map((booking) => (
                <tr key={booking.id} className={`border-b ${t.borderRow} ${t.tr}`}>
                  <td className={`px-6 py-4 font-mono text-sm ${t.muted}`} title={booking.id}>
                    {shortId(booking.id)}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/models/${booking.modelId}/edit`} className={`font-mono text-xs ${t.link}`} title={booking.modelId}>
                      {shortId(booking.modelId)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-mono text-xs ${L ? 'text-[#2c3338]' : 'text-gray-300'}`} title={booking.clientId}>
                      {shortId(booking.clientId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
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
                  <td className="px-6 py-4 text-center">
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
                      {['draft', 'time_proposed'].includes(booking.status) && (
                        <button
                          type="button"
                          onClick={() => handleConfirm(booking.id)}
                          className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#edfaef]' : 'hover:bg-green-500/20'}`}
                          title="Подтвердить"
                        >
                          <Check className={`h-4 w-4 ${L ? 'text-[#00a32a]' : 'text-green-400'}`} />
                        </button>
                      )}
                      {booking.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => setProposeTimeTarget(booking.id)}
                          className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#f0f6fc]' : 'hover:bg-blue-500/20'}`}
                          title="Предложить время"
                        >
                          <CalendarClock className={`h-4 w-4 ${L ? 'text-[#2271b1]' : 'text-blue-400'}`} />
                        </button>
                      )}
                      {['draft', 'time_proposed'].includes(booking.status) && (
                        <button
                          type="button"
                          onClick={() => handleDecline(booking.id)}
                          className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#fcf0f1]' : 'hover:bg-red-500/20'}`}
                          title="Отклонить"
                        >
                          <X className={`h-4 w-4 ${L ? 'text-[#d63638]' : 'text-red-400'}`} />
                        </button>
                      )}
                      {['pending_payment', 'escrow_funded', 'confirmed'].includes(booking.status) && (
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
          {filteredBookings.length === 0
            ? 'Показано 0 из 0'
            : `Показано ${(pageSafe - 1) * PAGE_SIZE + 1}–${Math.min(pageSafe * PAGE_SIZE, filteredBookings.length)} из ${filteredBookings.length}`}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`${t.btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            ← Назад
          </button>
          <span className={`text-sm ${t.muted}`}>{pageSafe} / {totalPages}</span>
          <button
            type="button"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`${t.btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Вперёд →
          </button>
        </div>
      </div>

      {proposeTimeTarget && (
        <ProposeTimeModal
          onSubmit={(iso) => handleProposeTime(proposeTimeTarget, iso)}
          onClose={() => setProposeTimeTarget(null)}
        />
      )}
    </div>
  );
}
