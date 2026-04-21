'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, type BookingRecord } from '@/lib/api-client';
import { CalendarDays, Clock, MapPin, ChevronRight } from 'lucide-react';

// ── Status config ──────────────────────────────────────────────────────────────

type BookingStatus = BookingRecord['status'];

const STATUS_LABEL: Record<BookingStatus, string> = {
  draft: 'Черновик',
  pending_payment: 'Ожидает оплаты',
  escrow_funded: 'Средства получены',
  confirmed: 'Подтверждено',
  in_progress: 'Встреча идёт',
  completed: 'Завершено',
  disputed: 'Спор',
  refunded: 'Возвращено',
  cancelled: 'Отменено',
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  draft: 'text-white/40 bg-white/[0.06] border-white/10',
  pending_payment: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
  escrow_funded: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
  confirmed: 'text-sky-300 bg-sky-400/10 border-sky-400/25',
  in_progress: 'text-sky-300 bg-sky-400/10 border-sky-400/25',
  completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  disputed: 'text-rose-300 bg-rose-400/10 border-rose-400/25',
  refunded: 'text-white/50 bg-white/[0.04] border-white/10',
  cancelled: 'text-white/30 bg-white/[0.03] border-white/[0.06]',
};

// ── Escrow timeline ────────────────────────────────────────────────────────────

const TIMELINE_STEPS: { key: BookingStatus[]; label: string }[] = [
  { key: ['pending_payment'], label: 'Ожидание оплаты' },
  { key: ['escrow_funded'], label: 'Средства получены' },
  { key: ['confirmed', 'in_progress'], label: 'Встреча подтверждена' },
  { key: ['completed'], label: 'Завершено' },
];

function timelineStep(status: BookingStatus): number {
  if (status === 'draft') return -1;
  if (status === 'pending_payment') return 0;
  if (status === 'escrow_funded') return 1;
  if (status === 'confirmed' || status === 'in_progress') return 2;
  if (status === 'completed') return 3;
  return -1;
}

function EscrowTimeline({ status }: { status: BookingStatus }) {
  if (status === 'cancelled' || status === 'refunded' || status === 'disputed') return null;
  if (status === 'draft') return null;
  const active = timelineStep(status);
  return (
    <div className="flex items-center gap-0 mt-4">
      {TIMELINE_STEPS.map((step, i) => {
        const done = active > i;
        const current = active === i;
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full border transition-colors ${
                done ? 'bg-[#d4af37] border-[#d4af37]'
                  : current ? 'bg-transparent border-[#d4af37]'
                  : 'bg-transparent border-white/20'
              }`} />
              <span className={`text-[10px] mt-1 text-center leading-tight max-w-[60px] ${
                done || current ? 'text-white/60' : 'text-white/25'
              }`}>
                {step.label}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 mb-4 ${done ? 'bg-[#d4af37]/50' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── CTA per status ─────────────────────────────────────────────────────────────

function BookingCta({ booking, onAction }: { booking: BookingRecord; onAction: () => void }) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try { await api.confirmBooking(booking.id); onAction(); } finally { setLoading(false); }
  };
  const cancel = async () => {
    if (!window.confirm('Отменить бронирование?')) return;
    setLoading(true);
    try { await api.cancelBooking(booking.id); onAction(); } finally { setLoading(false); }
  };

  const btn = (label: string, onClick: () => void, variant: 'gold' | 'outline' | 'danger' = 'gold') => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${
        variant === 'gold' ? 'bg-[#d4af37] text-black hover:opacity-90'
          : variant === 'outline' ? 'border border-white/15 text-white/70 hover:bg-white/[0.06]'
          : 'border border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
      }`}
    >
      {loading ? '…' : label}
    </button>
  );

  switch (booking.status) {
    case 'draft':
    case 'pending_payment':
      return (
        <div className="flex flex-wrap gap-2">
          {booking.modelSlug ? (
            <Link
              href={`/models/${booking.modelSlug}?booking=${booking.id}`}
              className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-medium text-black hover:opacity-90"
            >
              {booking.status === 'draft' ? 'Оплатить эскроу' : 'Проверить оплату'}
            </Link>
          ) : null}
          {btn('Отменить', cancel, 'danger')}
        </div>
      );
    case 'escrow_funded':
      return (
        <div className="flex flex-wrap gap-2">
          {btn('Подтвердить встречу', confirm, 'gold')}
          {btn('Открыть спор', cancel, 'danger')}
        </div>
      );
    case 'confirmed':
    case 'in_progress':
      return <span className="text-sm text-sky-300/70">Встреча подтверждена</span>;
    case 'completed':
      return <span className="text-sm text-white/40">Встреча завершена</span>;
    default:
      return null;
  }
}

// ── Booking card ───────────────────────────────────────────────────────────────

function BookingCard({ booking, onRefresh }: { booking: BookingRecord; onRefresh: () => void }) {
  const startDate = new Date(booking.startTime);
  const fmtDate = startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const isDimmed = booking.status === 'cancelled' || booking.status === 'refunded';

  return (
    <article className={`rounded-xl border bg-[#141414] p-5 space-y-4 transition-opacity ${
      isDimmed ? 'opacity-50 border-white/[0.04]' : 'border-white/[0.08]'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">
            {booking.modelName ?? 'Модель'}
          </p>
          <p className="text-xs text-white/35 font-mono mt-0.5">{booking.id.slice(0, 8)}…</p>
        </div>
        <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[booking.status]}`}>
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-white/50">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
          {fmtDate}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          {fmtTime} · {booking.durationHours} ч
        </span>
        {booking.locationType && (
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {booking.locationType}
          </span>
        )}
        <span className="ml-auto font-medium text-white/70">
          {booking.totalAmount} {booking.currency ?? 'USDT'}
        </span>
      </div>

      {/* Timeline */}
      <EscrowTimeline status={booking.status} />

      {/* CTA */}
      <BookingCta booking={booking} onAction={onRefresh} />
    </article>
  );
}

// ── Main content ───────────────────────────────────────────────────────────────

function BookingsContent() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyBookings();
      setBookings(data);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Не удалось загрузить брони');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = bookings.filter(b => !['completed', 'cancelled', 'refunded'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled', 'refunded'].includes(b.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Встречи</h1>
        <p className="mt-1 font-body text-sm text-white/40">История бронирований и статус оплаты эскроу</p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-40 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#141414] px-6 py-12 text-center">
          <p className="text-white/40 text-sm">Броней пока нет</p>
          <Link href="/models" className="mt-4 inline-block rounded-lg bg-[#d4af37] px-5 py-2 text-sm font-medium text-black hover:opacity-90">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/30">Активные</h2>
              {active.map(b => <BookingCard key={b.id} booking={b} onRefresh={load} />)}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/30">История</h2>
              {past.map(b => <BookingCard key={b.id} booking={b} onRefresh={load} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function CabinetBookingsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-white/40">Загрузка…</div>}>
      <BookingsContent />
    </Suspense>
  );
}
