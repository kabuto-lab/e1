'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { api, type TonEscrowClientView } from '@/lib/api-client';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function statusRu(status: string): string {
  const map: Record<string, string> = {
    pending_funding: 'Ожидает оплаты',
    funded: 'Получено',
    releasing: 'Выплата',
    released: 'Выплачено',
    refunding: 'Возврат',
    refunded: 'Возвращено',
    disputed: 'Спор',
    cancelled: 'Отменено',
  };
  return map[status] ?? status;
}

function TonEscrowCard({ data }: { data: TonEscrowClientView }) {
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt(`Скопируйте ${label}:`, text);
    }
  };

  const rows: { k: string; v: ReactNode; mono?: boolean }[] = [
    { k: 'Статус', v: statusRu(data.status) },
    {
      k: 'Сумма (ожидается)',
      v: data.expectedAmountHuman ?? data.expectedAmountAtomic ?? '—',
    },
    {
      k: 'Сумма (получено)',
      v: data.receivedAmountHuman ?? data.receivedAmountAtomic ?? '—',
    },
    { k: 'Сеть', v: data.network ?? '—', mono: true },
    { k: 'Treasury', v: data.treasuryAddress ?? '—', mono: true },
    { k: 'Jetton master', v: data.jettonMasterAddress ?? '—', mono: true },
    {
      k: 'Memo',
      v: data.expectedMemo ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="break-all">{data.expectedMemo}</span>
          <button
            type="button"
            onClick={() => copy(data.expectedMemo!, 'memo')}
            className="flex-shrink-0 rounded border border-[#d4af37]/30 px-2 py-0.5 font-body text-xs text-[#d4af37] hover:bg-[#d4af37]/10"
          >
            Копировать
          </button>
        </span>
      ) : (
        '—'
      ),
      mono: !!data.expectedMemo,
    },
    { k: 'Подтверждений', v: String(data.confirmations ?? 0) },
  ];

  if (data.fundedTxHash) {
    rows.push({ k: 'Tx пополнения', v: data.fundedTxHash, mono: true });
  }
  if (data.releaseTxHash) {
    rows.push({ k: 'Tx выплаты', v: data.releaseTxHash, mono: true });
  }
  if (data.refundTxHash) {
    rows.push({ k: 'Tx возврата', v: data.refundTxHash, mono: true });
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#141414] p-5">
      <h2 className="font-display text-lg font-semibold text-white">TON USDT эскроу</h2>
      <p className="mt-1 font-body text-xs text-white/40">
        Бронирование <span className="font-mono text-white/60">{data.bookingId}</span>
      </p>
      <dl className="mt-4 space-y-3">
        {rows.map(({ k, v, mono }) => (
          <div key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="font-body text-xs font-medium uppercase tracking-wide text-white/35 sm:w-40 sm:flex-shrink-0">
              {k}
            </dt>
            <dd
              className={`font-body text-sm text-white/90 ${mono ? 'break-all font-mono text-xs text-white/80' : ''}`}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const initialBooking = searchParams?.get('booking')?.trim() ?? '';

  const [bookingId, setBookingId] = useState(initialBooking);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<TonEscrowClientView | null>(null);

  const load = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!UUID_RE.test(trimmed)) {
      setError('Введите корректный UUID бронирования (v4).');
      setEscrow(null);
      return;
    }
    setLoading(true);
    setError(null);
    setEscrow(null);
    try {
      const res = await api.getTonEscrowByBooking(trimmed);
      setEscrow(res);
    } catch (e: unknown) {
      const err = e as Error & { statusCode?: number };
      const code = err.statusCode;
      if (code === 404) {
        setError('Для этого бронирования нет TON USDT эскроу или бронь не найдена.');
      } else if (code === 403) {
        setError('Нет доступа к эскроу этой брони.');
      } else {
        setError(err?.message || 'Не удалось загрузить данные.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialBooking && UUID_RE.test(initialBooking)) {
      void load(initialBooking);
    }
  }, [initialBooking, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Встречи</h1>
        <p className="mt-2 font-body text-sm text-white/40">
          Список бронирований подключим к API позже. Ниже можно открыть статус оплаты TON USDT по
          идентификатору брони (ссылка из письма или поддержки).
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#141414] p-5">
        <label htmlFor="booking-id" className="font-body text-sm font-medium text-white/70">
          UUID бронирования
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="booking-id"
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-[#0a0a0a] px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/25 focus:border-[#d4af37]/40 focus:outline-none focus:ring-1 focus:ring-[#d4af37]/30"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(bookingId)}
            className="rounded-lg bg-[#d4af37] px-5 py-2.5 font-body text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Загрузка…' : 'Показать эскроу'}
          </button>
        </div>
        <p className="mt-2 font-body text-xs text-white/30">
          Прямая ссылка:{' '}
          <span className="font-mono text-white/45">
            /cabinet/bookings?booking=&lt;uuid&gt;
          </span>
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 font-body text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {escrow ? <TonEscrowCard data={escrow} /> : null}
    </div>
  );
}

export default function CabinetBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="font-body text-sm text-white/40">Загрузка…</div>
      }
    >
      <BookingsContent />
    </Suspense>
  );
}
