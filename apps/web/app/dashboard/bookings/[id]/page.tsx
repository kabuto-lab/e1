/**
 * Booking Detail Page (dashboard — admin/manager/moderator)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, CalendarDays, Clock,
  MapPin, Wallet, FileText, Check, X, CalendarClock, ExternalLink,
} from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { api, type BookingRecord, type TonEscrowClientView } from '@/lib/api-client';
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

const LOCATION_LABEL: Record<string, string> = {
  incall: 'Инколл', outcall: 'Ауткол', travel: 'Выезд', hotel: 'Отель', dacha: 'Дача',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  return (
    <section className={`${t.formSection} space-y-3`}>
      <h2 className={t.sectionTitleBar}>{title}</h2>
      {children}
    </section>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [escrow, setEscrow] = useState<TonEscrowClientView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const b = await api.getBookingById(id);
      setBooking(b);
      try {
        const e = await api.getTonEscrowByBooking(id);
        setEscrow(e);
      } catch {
        // эскроу может не существовать — не критично
      }
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Не удалось загрузить бронирование');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<BookingRecord>) => {
    setBusy(true);
    try {
      const updated = await fn();
      setBooking(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось выполнить действие');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => run(() => api.confirmBooking(id));
  const handleDecline = () => {
    const reason = window.prompt('Причина отклонения (необязательно):') ?? undefined;
    void run(() => api.declineBooking(id, reason || undefined));
  };
  const handleProposeTime = (proposedStartTimeIso: string) =>
    run(() => api.proposeBookingTime(id, proposedStartTimeIso));
  const handleCancel = () => {
    if (!window.confirm('Отменить бронирование?')) return;
    void run(() => api.cancelBooking(id));
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm ${t.muted}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/bookings" className={`inline-flex items-center gap-1.5 text-sm ${t.link}`}>
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <div className={t.noticeErr}>
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error ?? 'Бронирование не найдено'}</p>
          </div>
        </div>
      </div>
    );
  }

  const start = new Date(booking.startTime);
  const fmtDate = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const proposed = booking.proposedStartTime ? new Date(booking.proposedStartTime) : null;
  const canConfirmOrDecline = ['draft', 'time_proposed'].includes(booking.status);
  const canProposeTime = booking.status === 'draft';
  const canCancel = ['draft', 'time_proposed', 'pending_payment', 'escrow_funded', 'confirmed'].includes(booking.status);

  return (
    <div className={`flex-1 space-y-6 font-body ${t.page}`}>
      <Link href="/dashboard/bookings" className={`inline-flex items-center gap-1.5 text-sm ${t.link}`}>
        <ArrowLeft className="h-4 w-4" />
        Все бронирования
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
            Бронирование
          </h1>
          <p className={`mt-1 font-mono text-xs ${t.muted}`}>{booking.id}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
          L ? 'border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e]' : 'border-white/10 bg-white/[0.04] text-white/60'
        }`}>
          {STATUS_LABELS[booking.status] ?? booking.status}
        </span>
      </div>

      <Section title="Детали встречи">
        <div className="space-y-2.5">
          <div className={`flex items-center gap-3 text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>
            <CalendarDays className={`h-4 w-4 shrink-0 ${t.muted}`} />
            {fmtDate}
          </div>
          <div className={`flex items-center gap-3 text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>
            <Clock className={`h-4 w-4 shrink-0 ${t.muted}`} />
            {fmtTime} · {booking.durationHours} ч
          </div>
          {booking.locationType && (
            <div className={`flex items-center gap-3 text-sm ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>
              <MapPin className={`h-4 w-4 shrink-0 ${t.muted}`} />
              {LOCATION_LABEL[booking.locationType] ?? booking.locationType}
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Wallet className={`h-4 w-4 shrink-0 ${t.muted}`} />
            <span className={`text-base font-bold ${accent}`}>
              {parseFloat(booking.totalAmount).toLocaleString('ru-RU')} {booking.currency ?? '₽'}
            </span>
          </div>
          {(booking.platformFee || booking.modelPayout) && (
            <div className={`flex flex-wrap gap-x-6 gap-y-1 text-xs ${t.muted}`}>
              <span>Комиссия площадки: {booking.platformFee ?? '—'} {booking.currency ?? '₽'}</span>
              <span>Выплата исполнителю: {booking.modelPayout ?? '—'} {booking.currency ?? '₽'}</span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Участники">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className={t.muted}>Модель</span>
            <Link href={`/dashboard/models/${booking.modelId}/edit`} className={`font-mono text-xs ${t.link}`}>
              {booking.modelId}
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className={t.muted}>Клиент</span>
            <span className={`font-mono text-xs ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>
              {booking.clientId}
            </span>
          </div>
        </div>
      </Section>

      {booking.specialRequests && (
        <Section title="Комментарий клиента">
          <p className={`text-sm italic ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>«{booking.specialRequests}»</p>
        </Section>
      )}

      {proposed && booking.status === 'time_proposed' && (
        <Section title="Предложенное время">
          <p className={`text-sm ${accent}`}>
            {proposed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' в '}
            {proposed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className={`text-xs ${t.muted}`}>Ждём решения клиента — принять или отменить.</p>
        </Section>
      )}

      {escrow && (
        <Section title="Эскроу">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={t.muted}>Статус</span>
              <span className={L ? 'text-[#2c3338]' : 'text-gray-300'}>{escrow.status}</span>
            </div>
            <div className="flex justify-between">
              <span className={t.muted}>Сумма</span>
              <span className={accent}>
                {escrow.expectedAmountHuman ?? escrow.amountHeld} {escrow.currency ?? 'USDT'}
              </span>
            </div>
            {escrow.fundedTxHash && (
              <div className="flex items-center justify-between gap-2">
                <span className={t.muted}>TX</span>
                <a
                  href={`https://tonscan.org/tx/${escrow.fundedTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 font-mono text-xs ${t.link}`}
                >
                  {escrow.fundedTxHash.slice(0, 12)}…
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </Section>
      )}

      {(canConfirmOrDecline || canProposeTime || canCancel) && (
        <Section title="Действия">
          <div className="flex flex-wrap gap-2">
            {canConfirmOrDecline && (
              <button type="button" disabled={busy} onClick={handleConfirm} className={t.btnPrimary}>
                <Check className="h-4 w-4" /> Подтвердить
              </button>
            )}
            {canProposeTime && (
              <button type="button" disabled={busy} onClick={() => setShowProposeModal(true)} className={t.btnSecondary}>
                <CalendarClock className="h-4 w-4" /> Предложить время
              </button>
            )}
            {canConfirmOrDecline && (
              <button type="button" disabled={busy} onClick={handleDecline} className={t.btnDanger}>
                <X className="h-4 w-4" /> Отклонить
              </button>
            )}
            {canCancel && (
              <button type="button" disabled={busy} onClick={handleCancel} className={t.btnDanger}>
                <X className="h-4 w-4" /> Отменить
              </button>
            )}
          </div>
        </Section>
      )}

      <div className={`flex items-center gap-2 text-xs ${t.muted}`}>
        <FileText className="h-3.5 w-3.5" />
        Создано {new Date(booking.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      {showProposeModal && (
        <ProposeTimeModal
          onSubmit={handleProposeTime}
          onClose={() => setShowProposeModal(false)}
        />
      )}
    </div>
  );
}
