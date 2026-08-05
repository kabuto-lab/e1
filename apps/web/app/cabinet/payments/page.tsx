'use client';

/**
 * История платежей клиента — переиспользует его же брони (api.getMyBookings), просто
 * показывает их как платёжные эпизоды (сумма/статус/дата), а не встречи. Отдельного
 * бэкенд-эндпоинта для этого не заводили — вся нужная информация уже в BookingRecord.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type BookingRecord } from '@/lib/api-client';
import { Loader2, AlertCircle, ChevronRight, Receipt } from 'lucide-react';

type BookingStatus = BookingRecord['status'];

// Брони без реальной оплатной истории — заявка ещё не дошла до подтверждения.
const NO_PAYMENT_HISTORY = new Set<BookingStatus>(['draft', 'time_proposed', 'declined']);

const STATUS_LABEL: Record<BookingStatus, string> = {
  draft: 'Заявка отправлена',
  time_proposed: 'Предложено время',
  pending_payment: 'Ожидает оплаты',
  escrow_funded: 'Средства получены',
  confirmed: 'Подтверждено, ждём оплаты',
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#141414] px-4 py-3 sm:px-5 sm:py-4">
      <p className="font-body text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 break-words font-display text-lg font-bold text-white sm:text-xl">{value}</p>
    </div>
  );
}

export default function CabinetPaymentsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await api.getMyBookings();
      const withPayments = all
        .filter((b) => !NO_PAYMENT_HISTORY.has(b.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(withPayments);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить платежи');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalPaid = bookings
    .filter((b) => b.status === 'completed' || b.status === 'escrow_funded' || b.status === 'in_progress')
    .reduce((sum, b) => sum + parseFloat(b.totalAmount || '0'), 0);

  const totalRefunded = bookings
    .filter((b) => b.status === 'refunded')
    .reduce((sum, b) => sum + parseFloat(b.totalAmount || '0'), 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-body text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <p className="font-body text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Оплаты</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Оплачено" value={`${totalPaid.toLocaleString('ru-RU')} ₽`} />
        <StatCard label="Возвращено" value={`${totalRefunded.toLocaleString('ru-RU')} ₽`} />
        <StatCard label="Платежей" value={String(bookings.length)} />
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#141414]/60 px-6 py-12 text-center">
          <Receipt className="h-8 w-8 text-white/20" />
          <p className="font-body text-sm text-white/40">
            Платежей пока нет — они появятся здесь после подтверждения первой брони.
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/cabinet/bookings/${b.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#141414]/80 px-4 py-3.5 transition-colors hover:border-[#d4af37]/25 hover:bg-[#141414]"
            >
              <div className="min-w-0">
                <p className="truncate font-body text-sm font-medium text-white">
                  {b.modelName ?? 'Модель'}
                </p>
                <p className="mt-0.5 font-body text-xs text-white/30">
                  {new Date(b.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="font-display text-sm font-bold text-[#d4af37]">
                    {parseFloat(b.totalAmount).toLocaleString('ru-RU')} {b.currency ?? '₽'}
                  </p>
                  <span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 font-body text-[10px] font-medium ${STATUS_COLOR[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/20" />
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
