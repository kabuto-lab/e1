'use client';

/**
 * EarningsPanel — баланс заработанного + заявки на вывод, общий для модели и менеджера
 * (бэкенд сам различает роль в GET /payouts/balance и POST /payouts/requests).
 * Используется на /model/earnings и /dashboard/earnings.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { api, type PayoutBalance, type PayoutRequest, type PayoutRequestStatus } from '@/lib/api-client';

const STATUS_LABEL: Record<PayoutRequestStatus, string> = {
  pending: 'На рассмотрении',
  approved: 'Одобрено',
  paid: 'Выплачено',
  rejected: 'Отклонено',
};

const STATUS_COLOR: Record<PayoutRequestStatus, string> = {
  pending: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
  approved: 'text-sky-300 bg-sky-400/10 border-sky-400/25',
  paid: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
  rejected: 'text-rose-300 bg-rose-400/10 border-rose-400/25',
};

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/[0.06] bg-[#141414] px-4 py-3 sm:px-5 sm:py-4">
      <span className="font-body text-xs uppercase tracking-wide text-white/40">{label}</span>
      <span className={`break-words font-display text-lg font-bold sm:text-xl ${accent ? 'text-[#d4af37]' : 'text-white'}`}>
        {value} ₽
      </span>
    </div>
  );
}

export function EarningsPanel() {
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, r] = await Promise.all([api.getPayoutBalance(), api.getPayoutRequests()]);
      setBalance(b);
      setRequests(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setFormError('Введите сумму больше нуля');
      return;
    }
    if (balance && value > parseFloat(balance.available)) {
      setFormError(`Сумма превышает доступный баланс (${balance.available} ₽)`);
      return;
    }
    setSubmitting(true);
    try {
      await api.createPayoutRequest(value.toFixed(2));
      setAmount('');
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Не удалось создать заявку');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-body text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-300">
        {error ?? 'Не удалось загрузить баланс'}
      </div>
    );
  }

  const availableNum = parseFloat(balance.available);
  const enteredAmount = parseFloat(amount);
  const exceedsAvailable = !Number.isNaN(enteredAmount) && enteredAmount > availableNum;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Заработано" value={balance.earned} />
        <StatCard label="Выплачено" value={balance.paid} />
        <StatCard label="В ожидании" value={balance.pending} />
        <StatCard label="Доступно" value={balance.available} accent />
      </div>

      <section className="space-y-3 rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-5">
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/30">
          Запросить вывод
        </h2>
        <form onSubmit={submitRequest} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block font-body text-xs text-white/50">Сумма (₽)</label>
            <input
              type="number"
              min="1"
              max={availableNum || undefined}
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={balance.available}
              className={`w-full rounded-xl border bg-[#0a0a0a] px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 ${
                exceedsAvailable
                  ? 'border-rose-500/40 focus:border-rose-500/50 focus:ring-rose-500/30'
                  : 'border-white/[0.1] focus:border-[#d4af37]/40 focus:ring-[#d4af37]/30'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || availableNum <= 0 || exceedsAvailable || !enteredAmount || enteredAmount <= 0}
            className="w-full shrink-0 rounded-xl bg-[#d4af37] px-5 py-2.5 font-body text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Отправить заявку'}
          </button>
        </form>
        {exceedsAvailable && (
          <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 font-body text-xs text-rose-300">
            Сумма превышает доступный баланс ({balance.available} ₽)
          </p>
        )}
        {formError && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 font-body text-xs text-red-300">
            {formError}
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-5">
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/30">
          История заявок
        </h2>
        {requests.length === 0 ? (
          <p className="font-body text-sm text-white/40">Заявок пока не было</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-[#0a0a0a] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  {r.status === 'paid' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : r.status === 'rejected' ? (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <div>
                    <p className="font-body text-sm font-medium text-white">{r.amount} ₽</p>
                    <p className="font-body text-xs text-white/30">
                      {new Date(r.requestedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <span className={`rounded-full border px-2.5 py-0.5 font-body text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.note && <p className="font-body text-xs text-white/30 sm:max-w-[220px] sm:text-right">{r.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
