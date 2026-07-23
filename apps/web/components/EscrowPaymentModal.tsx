'use client';

/**
 * EscrowPaymentModal — оплата уже ПОДТВЕРЖДЁННОЙ брони через TON USDT эскроу.
 *
 * Открывается со страницы брони (cabinet/bookings/[id]) только когда booking.status === 'confirmed'.
 * Шаги:
 * 0 — Подтвердить сумму (USDT)
 * 1 — Создаём эскроу intent (загрузка)
 * 2 — Инструкции по оплате (адрес, мемо, сумма)
 * 3 — Ожидание подтверждения (поллинг каждые 10с)
 * 4 — Готово
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, Check, Loader2 } from 'lucide-react';
import { api, type TonEscrowClientView } from '@/lib/api-client';

interface Props {
  bookingId: string;
  modelName: string;
  rateHourly?: number | null;
  onClose: () => void;
  onFunded?: () => void;
}

type Step = 'confirm' | 'creating' | 'instructions' | 'polling' | 'done' | 'error';

const POLL_INTERVAL_MS = 10_000;
const FUNDED_STATUSES = new Set(['funded', 'hold_period', 'releasing', 'released', 'disputed_hold']);

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt(`Скопируйте ${label}:`, text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 px-3 py-1.5 text-xs font-medium text-[#d4af37] transition-colors hover:bg-[#d4af37]/10"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Скопировано' : label}
    </button>
  );
}

export function EscrowPaymentModal({ bookingId, modelName, rateHourly, onClose, onFunded }: Props) {
  const suggestedUsdt = rateHourly ? Math.max(10, Math.round(rateHourly / 100)) : 50;
  const [amountUsdt, setAmountUsdt] = useState(String(suggestedUsdt));
  const [step, setStep] = useState<Step>('confirm');
  const [escrow, setEscrow] = useState<TonEscrowClientView | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const poll = useCallback(
    async (bId: string) => {
      try {
        const status = await api.getTonEscrowStatus(bId);
        setEscrow(status);
        if (FUNDED_STATUSES.has(status.status)) {
          stopPolling();
          setStep('done');
          onFunded?.();
          return;
        }
      } catch {
        // network blip — keep polling
      }
      pollTimer.current = setTimeout(() => poll(bId), POLL_INTERVAL_MS);
    },
    [stopPolling, onFunded],
  );

  const createIntent = useCallback(async () => {
    const usdtNum = parseFloat(amountUsdt);
    if (!usdtNum || usdtNum < 1) {
      setErrorMsg('Введите сумму в USDT (минимум 1)');
      return;
    }
    setStep('creating');
    setErrorMsg(null);
    try {
      const intent = await api.createTonIntent(bookingId, usdtNum);
      setEscrow(intent);
      setStep('instructions');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Ошибка создания эскроу');
      setStep('error');
    }
  }, [amountUsdt, bookingId]);

  const startPolling = useCallback(() => {
    setStep('polling');
    poll(bookingId);
  }, [bookingId, poll]);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Оплата эскроу</h2>
            <p className="font-body text-xs text-white/40">{modelName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'confirm' && (
            <div className="space-y-5">
              <p className="font-body text-sm text-white/60">
                Заявка подтверждена. Внесите депозит в USDT (TON сеть) — средства заморозятся и
                разблокируются исполнителю после встречи.
              </p>
              <div>
                <label className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-white/40">
                  Сумма депозита (USDT)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amountUsdt}
                    onChange={(e) => setAmountUsdt(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0a0a0a] px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:border-[#d4af37]/40 focus:outline-none focus:ring-1 focus:ring-[#d4af37]/30"
                    placeholder="50"
                  />
                  <span className="shrink-0 font-body text-sm font-bold text-[#d4af37]">USDT</span>
                </div>
                {rateHourly ? (
                  <p className="mt-1.5 font-body text-xs text-white/30">
                    Тариф: {rateHourly.toLocaleString('ru-RU')} ₽/час
                  </p>
                ) : null}
              </div>
              {errorMsg && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 font-body text-xs text-red-300">
                  {errorMsg}
                </p>
              )}
              <button
                type="button"
                onClick={createIntent}
                className="w-full rounded-xl bg-[#d4af37] py-3 font-body text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Продолжить →
              </button>
            </div>
          )}

          {step === 'creating' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
              <p className="font-body text-sm text-white/50">Создаём эскроу…</p>
            </div>
          )}

          {step === 'instructions' && escrow && (
            <div className="space-y-5">
              <p className="font-body text-sm text-white/60">
                Отправьте точную сумму USDT на адрес кошелька. Обязательно укажите memo — иначе платёж не будет засчитан.
              </p>

              <InfoRow label="Адрес кошелька" value={escrow.treasuryAddress ?? '—'} copyLabel="Адрес" mono />
              <InfoRow label="Memo (обязательно)" value={escrow.expectedMemo ?? '—'} copyLabel="Memo" mono highlight />
              <InfoRow label="Сумма" value={escrow.expectedAmountHuman ?? escrow.expectedAmountAtomic ?? '—'} copyLabel="Сумму" mono />
              {escrow.jettonMasterAddress && (
                <InfoRow label="Jetton (USDT)" value={escrow.jettonMasterAddress} copyLabel="Jetton" mono />
              )}

              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 font-body text-xs text-yellow-300">
                После отправки нажмите «Я оплатил» — система проверит поступление автоматически.
              </div>

              <button
                type="button"
                onClick={startPolling}
                className="w-full rounded-xl bg-[#d4af37] py-3 font-body text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Я оплатил — проверить →
              </button>
            </div>
          )}

          {step === 'polling' && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
                <div className="text-center">
                  <p className="font-body text-sm font-medium text-white">Ожидаем подтверждение</p>
                  <p className="mt-1 font-body text-xs text-white/40">Проверяем каждые 10 секунд…</p>
                </div>
              </div>
              {escrow && (
                <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] px-4 py-3">
                  <p className="font-body text-xs text-white/40">
                    Статус: <span className="text-white/70">{escrow.status}</span>
                    {' · '}
                    Подтверждений: <span className="text-white/70">{escrow.confirmations ?? 0}</span>
                  </p>
                </div>
              )}
              <p className="font-body text-xs text-white/30 text-center">
                Транзакция не пришла? Убедитесь что memo указан верно.
              </p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <p className="font-display text-base font-semibold text-white">Оплата подтверждена</p>
              <p className="font-body text-xs text-white/40 text-center">
                Средства заморожены до завершения встречи.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded-xl border border-white/[0.1] py-3 font-body text-sm text-white/60 transition-colors hover:bg-white/[0.05]"
              >
                Закрыть
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4 py-2">
              <p className="font-body text-sm text-red-300">{errorMsg ?? 'Произошла ошибка'}</p>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="w-full rounded-xl border border-white/[0.1] py-3 font-body text-sm text-white/60 transition-colors hover:bg-white/[0.05]"
              >
                ← Назад
              </button>
            </div>
          )}
        </div>

        {step !== 'done' && step !== 'error' && (
          <div className="border-t border-white/[0.06] px-6 py-3">
            <div className="flex items-center gap-2">
              {(['confirm', 'creating', 'instructions', 'polling'] as const).map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    ['confirm', 'creating', 'instructions', 'polling'].indexOf(step) >= i
                      ? 'bg-[#d4af37]'
                      : 'bg-white/[0.08]'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyLabel,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  copyLabel: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight ? 'border-[#d4af37]/25 bg-[#d4af37]/5' : 'border-white/[0.06] bg-[#0a0a0a]'
      }`}
    >
      <p className="mb-1.5 font-body text-xs font-medium uppercase tracking-wide text-white/35">{label}</p>
      <div className="flex items-start justify-between gap-3">
        <p
          className={`min-w-0 break-all font-body text-sm ${
            mono ? 'font-mono text-xs text-white/80' : 'text-white/90'
          } ${highlight ? 'font-semibold text-[#d4af37]' : ''}`}
        >
          {value}
        </p>
        <CopyButton text={value} label={copyLabel} />
      </div>
    </div>
  );
}
