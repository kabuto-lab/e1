'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, type BookingRecord, type ReviewRecord } from '@/lib/api-client';
import { EscrowPaymentModal } from '@/components/EscrowPaymentModal';
import { ReviewModal } from '@/components/ReviewModal';
import { CalendarDays, Clock, MapPin, ChevronRight, Star } from 'lucide-react';

// ── Status config ──────────────────────────────────────────────────────────────

type BookingStatus = BookingRecord['status'];

const STATUS_LABEL: Record<BookingStatus, string> = {
  draft: 'Заявка отправлена',
  time_proposed: 'Предложено время',
  pending_payment: 'Ожидает оплаты',
  escrow_funded: 'Средства получены',
  confirmed: 'Подтверждено',
  in_progress: 'Встреча идёт',
  completed: 'Завершено',
  disputed: 'Спор',
  declined: 'Отклонено',
  refunded: 'Возвращено',
  cancelled: 'Отменено',
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  draft: 'text-white/40 bg-white/[0.06] border-white/10',
  time_proposed: 'text-sky-300 bg-sky-400/10 border-sky-400/25',
  pending_payment: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
  escrow_funded: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
  confirmed: 'text-sky-300 bg-sky-400/10 border-sky-400/25',
  in_progress: 'text-sky-300 bg-sky-400/10 border-sky-400/25',
  completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  disputed: 'text-rose-300 bg-rose-400/10 border-rose-400/25',
  declined: 'text-white/30 bg-white/[0.03] border-white/[0.06]',
  refunded: 'text-white/50 bg-white/[0.04] border-white/10',
  cancelled: 'text-white/30 bg-white/[0.03] border-white/[0.06]',
};

// ── Escrow timeline (подтверждение — ДО оплаты) ─────────────────────────────────

const TIMELINE_STEPS: { key: BookingStatus[]; label: string }[] = [
  { key: ['draft', 'time_proposed'], label: 'Заявка отправлена' },
  { key: ['confirmed'], label: 'Подтверждено исполнителем' },
  { key: ['pending_payment', 'escrow_funded', 'in_progress'], label: 'Оплата эскроу' },
  { key: ['completed'], label: 'Завершено' },
];

function timelineStep(status: BookingStatus): number {
  if (status === 'draft' || status === 'time_proposed') return 0;
  if (status === 'confirmed') return 1;
  if (status === 'pending_payment' || status === 'escrow_funded' || status === 'in_progress') return 2;
  if (status === 'completed') return 3;
  return -1;
}

function EscrowTimeline({ status }: { status: BookingStatus }) {
  if (status === 'cancelled' || status === 'refunded' || status === 'disputed' || status === 'declined') return null;
  const active = timelineStep(status);
  return (
    <div className="relative mt-4">
      {/* фоновая линия — от центра первой точки до центра последней */}
      <div
        className="absolute top-[7px] h-px bg-white/10"
        style={{ left: `${50 / TIMELINE_STEPS.length}%`, right: `${50 / TIMELINE_STEPS.length}%` }}
      />
      {/* линия прогресса поверх фоновой */}
      <div
        className="absolute top-[7px] h-px bg-[#d4af37]/50 transition-[width]"
        style={{
          left: `${50 / TIMELINE_STEPS.length}%`,
          width: `${Math.max(0, Math.min(active, TIMELINE_STEPS.length - 1)) * (100 / TIMELINE_STEPS.length)}%`,
        }}
      />
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${TIMELINE_STEPS.length}, minmax(0, 1fr))` }}
      >
        {TIMELINE_STEPS.map((step, i) => {
          const done = active > i;
          const current = active === i;
          return (
            <div key={i} className="flex flex-col items-center px-1 text-center">
              <div className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors ${
                done ? 'bg-[#d4af37] border-[#d4af37]'
                  : current ? 'bg-[#141414] border-[#d4af37]'
                  : 'bg-[#141414] border-white/20'
              }`} />
              <span className={`mt-2 text-[11px] leading-tight ${
                done || current ? 'text-white/60' : 'text-white/25'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CTA per status ─────────────────────────────────────────────────────────────

function BookingCta({
  booking,
  review,
  onAction,
}: {
  booking: BookingRecord;
  review?: ReviewRecord;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const openReviewModal = () => {
    setShowReviewModal(true);
    requestAnimationFrame(() => setReviewModalVisible(true));
  };
  const closeReviewModal = () => {
    setReviewModalVisible(false);
    setTimeout(() => setShowReviewModal(false), 300);
  };

  const cancel = async () => {
    if (!window.confirm('Отменить бронирование?')) return;
    setLoading(true);
    try { await api.cancelBooking(booking.id); onAction(); } finally { setLoading(false); }
  };
  const acceptProposed = async () => {
    setLoading(true);
    try { await api.acceptProposedTime(booking.id); onAction(); } finally { setLoading(false); }
  };
  const payWithCard = async () => {
    setLoading(true);
    try {
      const { paymentUrl } = await api.createTbankOrder(booking.id);
      window.location.href = paymentUrl;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось создать платёж');
      setLoading(false);
    }
  };

  const btn = (label: string, onClick: () => void, variant: 'gold' | 'outline' | 'danger' = 'gold', forceDisabled?: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || forceDisabled}
      title={forceDisabled ? 'Оплата эскроу временно недоступна' : undefined}
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
      return (
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <span className="text-sm text-white/40">Ожидаем подтверждения исполнителя</span>
          {btn('Отменить', cancel, 'danger')}
        </div>
      );
    case 'time_proposed': {
      const proposed = booking.proposedStartTime ? new Date(booking.proposedStartTime) : null;
      return (
        <div className="space-y-2">
          {proposed && (
            <p className="text-sm text-sky-300">
              Исполнитель предложил другое время: {proposed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              {' в '}
              {proposed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {btn('Принять', acceptProposed, 'gold')}
            {btn('Отменить', cancel, 'danger')}
          </div>
        </div>
      );
    }
    case 'confirmed':
      return (
        <>
          <div className="flex flex-wrap gap-2">
            {btn('Оплатить эскроу', () => setShowPayModal(true), 'gold', true)}
            {btn('Оплатить картой', payWithCard, 'gold')}
            {btn('Отменить', cancel, 'outline')}
          </div>
          {showPayModal && (
            <EscrowPaymentModal
              bookingId={booking.id}
              modelName={booking.modelName ?? 'Модель'}
              onClose={() => setShowPayModal(false)}
              onFunded={onAction}
            />
          )}
        </>
      );
    case 'pending_payment':
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white/40">Ожидаем поступление оплаты</span>
          {btn('Отменить', cancel, 'danger')}
        </div>
      );
    case 'escrow_funded':
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white/40">Оплата получена, ждём встречи</span>
          {btn('Отменить встречу', cancel, 'danger')}
        </div>
      );
    case 'in_progress':
      return <span className="text-sm text-sky-300/70">Встреча идёт</span>;
    case 'completed':
      return review ? (
        <div className="flex items-center gap-2">
          <div className="flex" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? 'fill-[#d4af37] text-[#d4af37]' : 'text-white/15'}`} />
            ))}
          </div>
          <span className="text-sm text-white/40">Отзыв оставлен</span>
        </div>
      ) : (
        <>
          {btn('Оставить отзыв', openReviewModal, 'gold')}
          {showReviewModal && (
            <ReviewModal
              bookingId={booking.id}
              modelId={booking.modelId}
              modelName={booking.modelName ?? 'Модель'}
              visible={reviewModalVisible}
              onClose={closeReviewModal}
              onSubmitted={onAction}
            />
          )}
        </>
      );
    case 'declined':
      return <span className="text-sm text-white/30">Исполнитель отклонил заявку</span>;
    default:
      return null;
  }
}

// ── Booking card ───────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  review,
  onRefresh,
}: {
  booking: BookingRecord;
  review?: ReviewRecord;
  onRefresh: () => void;
}) {
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
          <Link href={`/cabinet/bookings/${booking.id}`} className="font-semibold text-white truncate hover:text-[#d4af37] transition-colors block">
            {booking.modelName ?? 'Модель'}
          </Link>
          <p className="text-xs text-white/35 font-mono mt-0.5">{booking.id.slice(0, 8)}…</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[booking.status]}`}>
            {STATUS_LABEL[booking.status]}
          </span>
        </div>
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
      {/* <BookingCta booking={booking} review={review} onAction={onRefresh} /> */}

      {/* Detail link */}
      <Link
        href={`/cabinet/bookings/${booking.id}`}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] py-2.5 font-body text-sm text-white/50 transition-colors hover:border-[#d4af37]/30 hover:text-[#d4af37]"
      >
        Подробнее
        <ChevronRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

// ── Main content ───────────────────────────────────────────────────────────────

function BookingsContent() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [reviewsByBooking, setReviewsByBooking] = useState<Map<string, ReviewRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, myReviews] = await Promise.all([
        api.getMyBookings(),
        api.getMyReviews().catch(() => []),
      ]);
      setBookings(data);
      setReviewsByBooking(new Map(myReviews.filter((r) => r.bookingId).map((r) => [r.bookingId as string, r])));
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Не удалось загрузить брони');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = bookings.filter(b => !['completed', 'cancelled', 'refunded', 'declined'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled', 'refunded', 'declined'].includes(b.status));
  const shown = tab === 'active' ? active : past;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Встречи</h1>
        <p className="mt-1 font-body text-sm text-white/40">Заявки и история бронирований, статус оплаты эскроу</p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {!loading && bookings.length > 0 && (
        <div className="flex gap-1 rounded-lg bg-white/[0.03] p-1">
          {([
            ['active', `Заявки${active.length ? ` (${active.length})` : ''}`],
            ['history', `История${past.length ? ` (${past.length})` : ''}`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === key ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#141414] px-6 py-12 text-center">
          <p className="text-white/40 text-sm">
            {tab === 'active' ? 'Активных заявок нет' : 'История пока пуста'}
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {shown.map(b => (
            <BookingCard key={b.id} booking={b} review={reviewsByBooking.get(b.id)} onRefresh={load} />
          ))}
        </section>
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
