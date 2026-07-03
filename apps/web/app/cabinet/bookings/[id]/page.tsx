'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, type BookingRecord, type TonEscrowClientView } from '@/lib/api-client';
import {
  ArrowLeft, Loader2, AlertCircle, CalendarDays, Clock,
  MapPin, Wallet, FileText, Copy, Check, ExternalLink,
} from 'lucide-react';

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

const LOCATION_LABEL: Record<string, string> = {
  incall: 'Инколл', outcall: 'Ауткол', travel: 'Выезд', hotel: 'Отель', dacha: 'Дача',
};

const TIMELINE_STEPS: { key: BookingStatus[]; label: string; desc: string }[] = [
  { key: ['pending_payment'], label: 'Ожидание оплаты', desc: 'Бронь создана, ждём перевод' },
  { key: ['escrow_funded'], label: 'Средства получены', desc: 'Деньги на эскроу' },
  { key: ['confirmed', 'in_progress'], label: 'Встреча подтверждена', desc: 'Встреча согласована' },
  { key: ['completed'], label: 'Завершено', desc: 'Встреча прошла' },
];

function timelineStep(status: BookingStatus): number {
  if (status === 'pending_payment') return 0;
  if (status === 'escrow_funded') return 1;
  if (status === 'confirmed' || status === 'in_progress') return 2;
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
      <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/30">{title}</h2>
      {children}
    </section>
  );
}

function BookingActions({ booking, onRefresh }: { booking: BookingRecord; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try { await api.confirmBooking(booking.id); onRefresh(); } finally { setLoading(false); }
  };
  const cancel = async () => {
    if (!window.confirm('Отменить бронирование?')) return;
    setLoading(true);
    try { await api.cancelBooking(booking.id); onRefresh(); } finally { setLoading(false); }
  };

  const btn = (label: string, onClick: () => void, variant: 'gold' | 'danger' | 'outline' = 'gold') => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
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
    case 'pending_payment':
      return (
        <div className="flex flex-wrap gap-2">
          {booking.modelSlug && (
            <Link
              href={`/models/${booking.modelSlug}?booking=${booking.id}`}
              className="rounded-xl bg-[#d4af37] px-5 py-2.5 font-body text-sm font-medium text-black hover:opacity-90"
            >
              Перейти к оплате
            </Link>
          )}
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
      return <p className="font-body text-sm text-sky-300/70">Встреча подтверждена — ждём завершения</p>;
    default:
      return null;
  }
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [escrow, setEscrow] = useState<TonEscrowClientView | null>(null);
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
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Не удалось загрузить бронирование');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

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
  const showTimeline = !['draft', 'cancelled', 'refunded', 'disputed'].includes(booking.status);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/cabinet/bookings" className="inline-flex items-center gap-1.5 font-body text-sm text-white/40 hover:text-white/70 transition-colors">
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

      {/* Timeline */}
      {showTimeline && (
        <Section title="Статус">
          <div className="flex items-start gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const done = activeStep > i;
              const current = activeStep === i;
              return (
                <div key={i} className="flex flex-1 min-w-0 items-center">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full border-2 transition-colors ${
                      done ? 'bg-[#d4af37] border-[#d4af37]'
                        : current ? 'bg-transparent border-[#d4af37] animate-pulse'
                        : 'bg-transparent border-white/20'
                    }`} />
                    <p className={`mt-1.5 font-body text-[10px] text-center leading-tight max-w-[64px] ${
                      done || current ? 'text-white/60' : 'text-white/25'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-1 mb-4 ${done ? 'bg-[#d4af37]/40' : 'bg-white/10'}`} />
                  )}
                </div>
              );
            })}
          </div>
          {activeStep >= 0 && (
            <p className="font-body text-xs text-white/35 mt-1">{TIMELINE_STEPS[activeStep]?.desc}</p>
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

      {/* Payment CTA for pending */}
      {(booking.status === 'draft' || booking.status === 'pending_payment') && !escrow && booking.modelSlug && (
        <Section title="Оплата">
          <p className="font-body text-sm text-white/40">Для завершения бронирования необходимо произвести оплату через эскроу.</p>
          <Link
            href={`/models/${booking.modelSlug}?booking=${booking.id}`}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#d4af37] px-5 py-2.5 font-body text-sm font-medium text-black hover:opacity-90"
          >
            Перейти к оплате
          </Link>
        </Section>
      )}

      {/* Actions */}
      {['escrow_funded', 'confirmed', 'in_progress', 'draft', 'pending_payment'].includes(booking.status) && (
        <Section title="Действия">
          <BookingActions booking={booking} onRefresh={load} />
        </Section>
      )}

      {/* Notes */}
      <div className="flex items-center gap-2 font-body text-xs text-white/20">
        <FileText className="h-3.5 w-3.5" />
        Создано {new Date(booking.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}
