'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type BookingRecord } from '@/lib/api-client';
import { AlertCircle, Loader2, Calendar, Clock, MapPin, Check, X, CalendarClock, MessageSquare } from 'lucide-react';

const STATUS_LABEL: Record<BookingRecord['status'], string> = {
  draft:           'Новая заявка',
  time_proposed:   'Предложено время',
  pending_payment: 'Ожидает оплаты',
  escrow_funded:   'Оплата получена',
  confirmed:       'Подтверждено',
  in_progress:     'В процессе',
  completed:       'Завершено',
  disputed:        'Спор',
  declined:        'Отклонено',
  refunded:        'Возврат',
  cancelled:       'Отменено',
};

const STATUS_COLOR: Record<BookingRecord['status'], string> = {
  draft:           'border-[#d4af37]/25 bg-[#d4af37]/10 text-[#d4af37]',
  time_proposed:   'border-sky-400/25 bg-sky-400/10 text-sky-300',
  pending_payment: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  escrow_funded:   'border-sky-400/25 bg-sky-400/10 text-sky-300',
  confirmed:       'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  in_progress:     'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  completed:       'border-white/10 bg-white/[0.04] text-white/40',
  disputed:        'border-red-400/25 bg-red-400/10 text-red-300',
  declined:        'border-white/10 bg-white/[0.04] text-white/25',
  refunded:        'border-white/10 bg-white/[0.04] text-white/35',
  cancelled:       'border-white/10 bg-white/[0.04] text-white/25',
};

const LOCATION_LABEL: Record<string, string> = {
  incall:  'Инколл',
  outcall: 'Ауткол',
  travel:  'Выезд',
  hotel:   'Отель',
  dacha:   'Дача',
};

const ACTIVE_STATUSES: BookingRecord['status'][] = ['draft', 'time_proposed', 'pending_payment', 'escrow_funded', 'confirmed', 'in_progress'];

function BookingCard({
  booking,
  onConfirm,
  onDecline,
  onProposeTime,
}: {
  booking: BookingRecord;
  onConfirm: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
  onProposeTime: (id: string, proposedStartTime: string) => Promise<void>;
}) {
  const start = new Date(booking.startTime);
  const isActive = ACTIVE_STATUSES.includes(booking.status);
  const [busy, setBusy] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [proposedValue, setProposedValue] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e: any) {
      setActionError(e.message ?? 'Не удалось выполнить действие');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-5 transition-colors ${isActive ? 'border-[#d4af37]/20 bg-[#141414]' : 'border-white/[0.06] bg-[#141414]/60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 font-body text-xs font-medium ${STATUS_COLOR[booking.status]}`}>
              {STATUS_LABEL[booking.status]}
            </span>
            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-pulse" />}
          </div>
          <p className="font-body text-[11px] text-white/25">ID: {booking.id.slice(0, 8)}…</p>
        </div>
        <p className="font-display text-base font-bold text-[#d4af37]">
          {Number(booking.totalAmount).toLocaleString('ru-RU')} {booking.currency ?? '₽'}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5 font-body text-sm text-white/50">
          <Calendar className="h-4 w-4 shrink-0 text-white/25" />
          {start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-1.5 font-body text-sm text-white/50">
          <Clock className="h-4 w-4 shrink-0 text-white/25" />
          {start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · {booking.durationHours} ч
        </div>
        {booking.locationType && (
          <div className="flex items-center gap-1.5 font-body text-sm text-white/50">
            <MapPin className="h-4 w-4 shrink-0 text-white/25" />
            {LOCATION_LABEL[booking.locationType] ?? booking.locationType}
          </div>
        )}
      </div>

      {booking.specialRequests && (
        <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-body text-sm text-white/40 italic">
          «{booking.specialRequests}»
        </p>
      )}

      <div className="mt-4">
        <Link
          href={`/model/messages?with=${booking.clientId}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-body text-xs font-semibold text-white/60 transition-colors hover:border-[#d4af37]/30 hover:text-[#d4af37] sm:inline-flex sm:w-auto"
        >
          <MessageSquare className="h-3.5 w-3.5" /> Написать клиенту
        </Link>
      </div>

      {booking.status === 'draft' && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          {actionError && <p className="mb-2 font-body text-xs text-red-300">{actionError}</p>}
          {!proposing ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => onConfirm(booking.id))}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 font-body text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5 shrink-0" /> Подтвердить
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setProposing(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 font-body text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-400/20 disabled:opacity-50"
              >
                <CalendarClock className="h-3.5 w-3.5 shrink-0" /> Предложить время
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => onDecline(booking.id))}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-1.5 font-body text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/20 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5 shrink-0" /> Отклонить
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="datetime-local"
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-body text-xs text-white outline-none focus:border-[#d4af37] sm:w-auto"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !proposedValue}
                  onClick={() => run(() => onProposeTime(booking.id, new Date(proposedValue).toISOString()))}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 font-body text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-400/20 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5 shrink-0" /> Отправить
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setProposing(false)}
                  className="font-body text-xs text-white/40 hover:text-white/60"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {booking.status === 'time_proposed' && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="font-body text-xs text-white/40">Ожидаем ответ клиента на предложенное время.</p>
        </div>
      )}
    </div>
  );
}

export default function ModelBookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMyModelBookings()
      .then(setBookings)
      .catch((e) => setError(e.message ?? 'Не удалось загрузить брони'))
      .finally(() => setLoading(false));
  }, []);

  const updateBooking = (updated: BookingRecord) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleConfirm = async (id: string) => updateBooking(await api.confirmBooking(id));
  const handleDecline = async (id: string) => updateBooking(await api.declineBooking(id));
  const handleProposeTime = async (id: string, proposedStartTime: string) =>
    updateBooking(await api.proposeBookingTime(id, proposedStartTime));

  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const past = bookings.filter((b) => !ACTIVE_STATUSES.includes(b.status));

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-body text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Мои брони</h1>
          <p className="mt-1 font-body text-sm text-white/35">Заявки на встречи от клиентов.</p>
        </div>
        {bookings.length > 0 && (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-body text-xs text-white/40">
            {bookings.length} всего
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && bookings.length === 0 && !error && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#141414]/60 px-6 py-12 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-white/10" />
          <p className="font-display text-base font-semibold text-white/30">Пока нет заявок</p>
          <p className="mt-1 font-body text-sm text-white/20">Они появятся, когда клиент создаст бронирование.</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xs font-bold uppercase tracking-widest text-[#d4af37]/60">
            Активные · {active.length}
          </h2>
          {active.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onConfirm={handleConfirm}
              onDecline={handleDecline}
              onProposeTime={handleProposeTime}
            />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/25">
            История · {past.length}
          </h2>
          {past.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onConfirm={handleConfirm}
              onDecline={handleDecline}
              onProposeTime={handleProposeTime}
            />
          ))}
        </section>
      )}
    </div>
  );
}
