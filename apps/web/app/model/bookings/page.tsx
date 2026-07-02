'use client';

import { useState, useEffect } from 'react';
import { api, type BookingRecord } from '@/lib/api-client';
import { AlertCircle, Loader2, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';

const STATUS_LABEL: Record<BookingRecord['status'], string> = {
  draft:           'Черновик',
  pending_payment: 'Ожидает оплаты',
  escrow_funded:   'Оплата получена',
  confirmed:       'Подтверждено',
  in_progress:     'В процессе',
  completed:       'Завершено',
  disputed:        'Спор',
  refunded:        'Возврат',
  cancelled:       'Отменено',
};

const STATUS_COLOR: Record<BookingRecord['status'], string> = {
  draft:           'border-white/10 bg-white/[0.04] text-white/35',
  pending_payment: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  escrow_funded:   'border-sky-400/25 bg-sky-400/10 text-sky-300',
  confirmed:       'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  in_progress:     'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  completed:       'border-white/10 bg-white/[0.04] text-white/40',
  disputed:        'border-red-400/25 bg-red-400/10 text-red-300',
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

const ACTIVE_STATUSES: BookingRecord['status'][] = ['pending_payment', 'escrow_funded', 'confirmed', 'in_progress'];

function BookingCard({ booking }: { booking: BookingRecord }) {
  const start = new Date(booking.startTime);
  const isActive = ACTIVE_STATUSES.includes(booking.status);

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
          {active.map((b) => <BookingCard key={b.id} booking={b} />)}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/25">
            История · {past.length}
          </h2>
          {past.map((b) => <BookingCard key={b.id} booking={b} />)}
        </section>
      )}
    </div>
  );
}
