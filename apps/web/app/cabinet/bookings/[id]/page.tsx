'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { api, type BookingRecord, type ReviewRecord, type TonEscrowClientView } from '@/lib/api-client';
import { EscrowPaymentModal } from '@/components/EscrowPaymentModal';
import { ReviewModal, REVIEW_CHARACTERISTICS } from '@/components/ReviewModal';
import {
  ArrowLeft, Loader2, AlertCircle, CalendarDays, Clock,
  MapPin, Wallet, FileText, Copy, Check, ExternalLink, Star,
} from 'lucide-react';

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

const LOCATION_LABEL: Record<string, string> = {
  incall: 'Инколл', outcall: 'Ауткол', travel: 'Выезд', hotel: 'Отель', dacha: 'Дача',
};

const TIMELINE_STEPS: { key: BookingStatus[]; label: string; desc: string }[] = [
  { key: ['draft', 'time_proposed'], label: 'Заявка отправлена', desc: 'Ждём решения исполнителя' },
  { key: ['confirmed'], label: 'Подтверждено исполнителем', desc: 'Можно оплачивать эскроу' },
  { key: ['pending_payment', 'escrow_funded', 'in_progress'], label: 'Оплата эскроу', desc: 'Деньги резервируются до встречи' },
  { key: ['completed'], label: 'Завершено', desc: 'Встреча прошла' },
];

function timelineStep(status: BookingStatus): number {
  if (status === 'draft' || status === 'time_proposed') return 0;
  if (status === 'confirmed') return 1;
  if (status === 'pending_payment' || status === 'escrow_funded' || status === 'in_progress') return 2;
  if (status === 'completed') return 3;
  return -1;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button type="button" onClick={copy} className="ml-1 text-white/20 hover:text-white/60 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-5">
      <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/30 mb-[20px]">{title}</h2>
      {children}
    </section>
  );
}

function BookingActions({ booking, onRefresh }: { booking: BookingRecord; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const cancel = async () => {
    if (!window.confirm('Отменить бронирование?')) return;
    setLoading(true);
    try { await api.cancelBooking(booking.id); onRefresh(); } finally { setLoading(false); }
  };
  const acceptProposed = async () => {
    setLoading(true);
    try { await api.acceptProposedTime(booking.id); onRefresh(); } finally { setLoading(false); }
  };
  const payWithCard = async () => {
    setLoading(true);
    setPayError(null);
    try {
      const { paymentUrl } = await api.createTbankOrder(booking.id);
      window.location.href = paymentUrl;
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : 'Не удалось создать платёж');
      setLoading(false);
    }
  };

  const btn = (label: string, onClick: () => void, variant: 'gold' | 'danger' | 'outline' = 'gold', forceDisabled?: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || forceDisabled}
      title={forceDisabled ? 'Оплата эскроу временно недоступна' : undefined}
      className={`rounded-xl px-5 py-2.5 font-body text-sm font-medium transition-opacity disabled:opacity-50 ${
        variant === 'gold' ? 'bg-[#d4af37] text-black hover:opacity-90'
          : variant === 'danger' ? 'border border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
          : 'border border-white/15 text-white/60 hover:bg-white/[0.06]'
      }`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : label}
    </button>
  );

  switch (booking.status) {
    case 'draft':
      return (
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <span className="font-body text-sm text-white/40">Ожидаем подтверждения исполнителя</span>
          {btn('Отменить', cancel, 'danger')}
        </div>
      );
    case 'time_proposed': {
      const proposed = booking.proposedStartTime ? new Date(booking.proposedStartTime) : null;
      return (
        <div className="space-y-2.5 flex items-center justify-between flex-wrap">
          {proposed && (
            <p className="font-body text-sm text-sky-300">
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
          {payError && (
            <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 font-body text-xs text-red-300">
              {payError}
            </p>
          )}
          {showPayModal && (
            <EscrowPaymentModal
              bookingId={booking.id}
              modelName={booking.modelName ?? 'Модель'}
              onClose={() => setShowPayModal(false)}
              onFunded={onRefresh}
            />
          )}
        </>
      );
    case 'pending_payment':
      return (
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <span className="font-body text-sm text-white/40">Ожидаем поступление оплаты</span>
          {btn('Отменить', cancel, 'danger')}
        </div>
      );
    case 'escrow_funded':
      return (
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <span className="font-body text-sm text-white/40">Оплата получена, ждём встречи</span>
          {btn('Отменить встречу', cancel, 'danger')}
        </div>
      );
    case 'in_progress':
      return <p className="font-body text-sm text-sky-300/70">Встреча идёт</p>;
    default:
      return null;
  }
}

function ReviewSection({
  booking,
  review,
  onRefresh,
}: {
  booking: BookingRecord;
  review: ReviewRecord | null;
  onRefresh: () => void;
}) {
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

  if (review) {
    return (
      <Section title="Отзыв">
        <div className="space-y-2.5">
          <div className="flex" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`h-4 w-4 ${n <= review.rating ? 'fill-[#d4af37] text-[#d4af37]' : 'text-white/15'}`} />
            ))}
          </div>
          {review.characteristics && review.characteristics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {review.characteristics.map((c) => (
                <span key={c} className="rounded-full border border-white/[0.08] px-2.5 py-1 font-body text-xs text-white/50">
                  {REVIEW_CHARACTERISTICS.find((rc) => rc.value === c)?.label ?? c}
                </span>
              ))}
            </div>
          )}
          {review.comment && <p className="font-body text-sm italic text-white/60">«{review.comment}»</p>}
          <p className="font-body text-xs text-white/30">
            {review.moderationStatus === 'approved' ? 'Опубликован' : review.moderationStatus === 'rejected' ? 'Отклонён модерацией' : 'На модерации'}
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Отзыв">
      <div className='flex items-center gap-2 justify-between flex-wrap'>
          <p className="font-body text-sm text-white/40">Поделитесь впечатлением о встрече.</p>
      <button
        type="button"
        onClick={openReviewModal}
        className="rounded-xl bg-[#d4af37] px-5 py-2.5 font-body text-sm font-medium text-black hover:opacity-90"
      >
        Оставить отзыв
      </button>
      </div>
      {showReviewModal && (
        <ReviewModal
          bookingId={booking.id}
          modelId={booking.modelId}
          modelName={booking.modelName ?? 'Модель'}
          visible={reviewModalVisible}
          onClose={closeReviewModal}
          onSubmitted={onRefresh}
        />
      )}
    </Section>
  );
}

function BookingDetailContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Захватываем один раз при монтировании — после router.replace() ниже сам searchParams обнулится,
  // а баннер должен остаться видимым до конца поллинга.
  const [paymentReturn] = useState(() => searchParams.get('payment'));
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [escrow, setEscrow] = useState<TonEscrowClientView | null>(null);
  const [review, setReview] = useState<ReviewRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        // escrow может не существовать — не критично
      }
      if (b.status === 'completed') {
        try {
          const myReviews = await api.getMyReviews();
          setReview(myReviews.find((r) => r.bookingId === id) ?? null);
        } catch {
          setReview(null);
        }
      }
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Не удалось загрузить бронирование');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // Возврат с оплаты T-Bank: SuccessURL/FailURL ведут сюда с ?payment=... — источник истины
  // остаётся вебхук, редирект может его опережать на пару секунд, поэтому докручиваем поллингом.
  useEffect(() => {
    if (paymentReturn !== 'success') return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled || attempts >= 6) return;
      attempts += 1;
      await load();
      if (!cancelled) setTimeout(tick, 3000);
    };
    void tick();
    router.replace(`/cabinet/bookings/${id}`);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentReturn]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-body text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Link href="/cabinet/bookings" className="inline-flex items-center gap-1.5 font-body text-sm text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <p className="font-body text-sm text-red-300">{error ?? 'Бронирование не найдено'}</p>
        </div>
      </div>
    );
  }

  const start = new Date(booking.startTime);
  const fmtDate = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const activeStep = timelineStep(booking.status);
  const showTimeline = !['cancelled', 'declined', 'refunded', 'disputed'].includes(booking.status);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/cabinet/bookings" className="inline-flex items-center gap-1.5 font-body text-sm text-[#d4af37] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Все встречи
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {booking.modelName ?? 'Встреча'}
          </h1>
          <p className="mt-1 flex items-center gap-1 font-mono text-xs text-white/25">
            {booking.id}
            <CopyButton text={booking.id} />
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 font-body text-xs font-semibold ${STATUS_COLOR[booking.status]}`}>
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      {paymentReturn === 'success' && booking.status !== 'escrow_funded' && (
        <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/5 px-4 py-3 font-body text-sm text-[#d4af37]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Проверяем оплату…
        </div>
      )}
      {paymentReturn === 'fail' && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-300">
          Оплата не прошла. Попробуйте ещё раз или выберите другой способ.
        </div>
      )}

      {/* Timeline */}
      {showTimeline && (
        <Section title="Статус">
          <div className="relative">
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
                width: `${Math.max(0, Math.min(activeStep, TIMELINE_STEPS.length - 1)) * (100 / TIMELINE_STEPS.length)}%`,
              }}
            />
            <div
              className="relative grid"
              style={{ gridTemplateColumns: `repeat(${TIMELINE_STEPS.length}, minmax(0, 1fr))` }}
            >
              {TIMELINE_STEPS.map((step, i) => {
                const done = activeStep > i;
                const current = activeStep === i;
                return (
                  <div key={i} className="flex flex-col items-center px-1 text-center">
                    <div className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors ${
                      done ? 'bg-[#d4af37] border-[#d4af37]'
                        : current ? 'bg-[#141414] border-[#d4af37] animate-pulse'
                        : 'bg-[#141414] border-white/20'
                    }`} />
                    <p className={`mt-2 font-body text-[11px] leading-tight ${
                      done || current ? 'text-white/70' : 'text-white/25'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          {activeStep >= 0 && (
            <p className="mt-3 text-center font-body text-xs text-white/35">{TIMELINE_STEPS[activeStep]?.desc}</p>
          )}
        </Section>
      )}

      {/* Details */}
      <Section title="Детали встречи">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 font-body text-sm text-white/60">
            <CalendarDays className="h-4 w-4 shrink-0 text-white/25" />
            {fmtDate}
          </div>
          <div className="flex items-center gap-3 font-body text-sm text-white/60">
            <Clock className="h-4 w-4 shrink-0 text-white/25" />
            {fmtTime} · {booking.durationHours} ч
          </div>
          {booking.locationType && (
            <div className="flex items-center gap-3 font-body text-sm text-white/60">
              <MapPin className="h-4 w-4 shrink-0 text-white/25" />
              {LOCATION_LABEL[booking.locationType] ?? booking.locationType}
            </div>
          )}
          <div className="flex items-center gap-3 font-body text-sm">
            <Wallet className="h-4 w-4 shrink-0 text-white/25" />
            <span className="font-display text-base font-bold text-[#d4af37]">
              {booking.totalAmount} {booking.currency ?? 'USDT'}
            </span>
          </div>
        </div>
      </Section>

      {/* Special requests */}
      {booking.specialRequests && (
        <Section title="Пожелания">
          <p className="font-body text-sm italic text-white/50">«{booking.specialRequests}»</p>
        </Section>
      )}

      {/* Escrow */}
      {escrow && (
        <Section title="Эскроу">
          <div className="space-y-2.5">
            <div className="flex justify-between font-body text-sm">
              <span className="text-white/40">Статус</span>
              <span className="font-medium text-white/80">{escrow.status}</span>
            </div>
            <div className="flex justify-between font-body text-sm">
              <span className="text-white/40">Сумма</span>
              <span className="font-medium text-[#d4af37]">
                {escrow.expectedAmountHuman ?? escrow.amountHeld} {escrow.currency ?? 'USDT'}
              </span>
            </div>
            {escrow.treasuryAddress && (
              <div className="flex items-center justify-between gap-2 font-body text-sm">
                <span className="text-white/40 shrink-0">Кошелёк</span>
                <span className="min-w-0 truncate font-mono text-xs text-white/50">
                  {escrow.treasuryAddress}
                  <CopyButton text={escrow.treasuryAddress} />
                </span>
              </div>
            )}
            {escrow.expectedMemo && (
              <div className="flex items-center justify-between gap-2 font-body text-sm">
                <span className="text-white/40 shrink-0">Memo</span>
                <span className="font-mono text-xs text-white/50">
                  {escrow.expectedMemo}
                  <CopyButton text={escrow.expectedMemo} />
                </span>
              </div>
            )}
            {escrow.fundedTxHash && (
              <div className="flex items-center justify-between gap-2 font-body text-sm">
                <span className="text-white/40 shrink-0">TX</span>
                <a
                  href={`https://tonscan.org/tx/${escrow.fundedTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-xs text-sky-400 hover:underline"
                >
                  {escrow.fundedTxHash.slice(0, 12)}…
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {escrow.fundedAt && (
              <div className="flex justify-between font-body text-sm">
                <span className="text-white/40">Получено</span>
                <span className="text-white/50">
                  {new Date(escrow.fundedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Actions */}
      {['draft', 'time_proposed', 'confirmed', 'pending_payment', 'escrow_funded', 'in_progress'].includes(booking.status) && (
        <Section title="Действия">
          <BookingActions booking={booking} onRefresh={load} />
        </Section>
      )}

      {booking.status === 'completed' && (
        <ReviewSection booking={booking} review={review} onRefresh={load} />
      )}

      {/* Notes */}
      <div className="flex items-center gap-2 font-body text-xs text-white/20">
        <FileText className="h-3.5 w-3.5" />
        Создано {new Date(booking.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-white/40">Загрузка…</div>}>
      <BookingDetailContent />
    </Suspense>
  );
}
