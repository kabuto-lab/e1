'use client';

/**
 * BookingTonModal — 4-шаговый флоу оплаты через TON USDT эскроу
 *
 * Шаги:
 * 0 — Подтвердить (ввести сумму USDT)
 * 1 — Создаём бронь + эскроу (загрузка)
 * 2 — Инструкции по оплате (адрес, мемо, сумма)
 * 3 — Ожидание подтверждения (поллинг каждые 10с)
 * 4 — Контакты показаны
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, Check, Loader2, MessageCircle, Phone } from 'lucide-react';
import { api, type TonEscrowClientView } from '@/lib/api-client';

interface Props {
  modelId: string;
  modelSlug: string;
  modelName: string;
  rateHourly?: number | null;
  onClose: () => void;
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

export function BookingTonModal({ modelId, modelSlug, modelName, rateHourly, onClose }: Props) {
  const suggestedUsdt = rateHourly ? Math.max(10, Math.round(rateHourly / 100)) : 50;
  const [amountUsdt, setAmountUsdt] = useState(String(suggestedUsdt));
  const [step, setStep] = useState<Step>('confirm');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<TonEscrowClientView | null>(null);
  const [contacts, setContacts] = useState<{
    contactTelegram: string | null;
    contactPhone: string | null;
    contactWhatsapp: string | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const c = await api.getModelContacts(modelSlug);
      setContacts(c);
      setStep('done');
    } catch {
      // contacts endpoint may 403 — will retry on next poll cycle
    }
  }, [modelSlug]);

  const poll = useCallback(
    async (bId: string) => {
      try {
        const status = await api.getTonEscrowStatus(bId);
        setEscrow(status);
        if (FUNDED_STATUSES.has(status.status)) {
          stopPolling();
          await loadContacts();
          return;
        }
      } catch {
        // network blip — keep polling
      }
      pollTimer.current = setTimeout(() => poll(bId), POLL_INTERVAL_MS);
    },
    [stopPolling, loadContacts],
  );

  const startBooking = useCallback(async () => {
    const usdtNum = parseFloat(amountUsdt);
    if (!usdtNum || usdtNum < 1) {
      setErrorMsg('Введите сумму в USDT (минимум 1)');
      return;
    }
    setStep('creating');
    setErrorMsg(null);
    try {
      const booking = await api.createBookingForModel({
        modelId,
        totalAmount: amountUsdt,
        currency: 'USDT',
      });
      setBookingId(booking.id);
      const intent = await api.createTonIntent(booking.id, usdtNum);
      setEscrow(intent);
      setStep('instructions');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Ошибка создания брони');
      setStep('error');
    }
  }, [amountUsdt, modelId]);

  const startPolling = useCallback(() => {
    if (!bookingId) return;
    setStep('polling');
    poll(bookingId);
  }, [bookingId, poll]);

  useEffect(() => stopPolling, [stopPolling]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Показать контакты</h2>
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

        {/* Body */}
        <div className="px-6 py-5">
          {/* STEP: confirm */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <p className="font-body text-sm text-white/60">
                Для получения контактов менеджера внесите депозит в USDT (TON сеть).
                Средства заморозятся и будут разблокированы после встречи.
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
                onClick={startBooking}
                className="w-full rounded-xl bg-[#d4af37] py-3 font-body text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Продолжить →
              </button>
            </div>
          )}

          {/* STEP: creating */}
          {step === 'creating' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
              <p className="font-body text-sm text-white/50">Создаём бронирование…</p>
            </div>
          )}

          {/* STEP: instructions */}
          {step === 'instructions' && escrow && (
            <div className="space-y-5">
              <p className="font-body text-sm text-white/60">
                Отправьте точную сумму USDT на адрес кошелька. Обязательно укажите memo — иначе платёж не будет засчитан.
              </p>

              <InfoRow
                label="Адрес кошелька"
                value={escrow.treasuryAddress ?? '—'}
                copyLabel="Адрес"
                mono
              />
              <InfoRow
                label="Memo (обязательно)"
                value={escrow.expectedMemo ?? '—'}
                copyLabel="Memo"
                mono
                highlight
              />
              <InfoRow
                label="Сумма"
                value={escrow.expectedAmountHuman ?? escrow.expectedAmountAtomic ?? '—'}
                copyLabel="Сумму"
                mono
              />
              {escrow.jettonMasterAddress && (
                <InfoRow
                  label="Jetton (USDT)"
                  value={escrow.jettonMasterAddress}
                  copyLabel="Jetton"
                  mono
                />
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

          {/* STEP: polling */}
          {step === 'polling' && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
                <div className="text-center">
                  <p className="font-body text-sm font-medium text-white">Ожидаем подтверждение</p>
                  <p className="mt-1 font-body text-xs text-white/40">
                    Проверяем каждые 10 секунд…
                  </p>
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

          {/* STEP: done */}
          {step === 'done' && contacts && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <p className="font-display text-base font-semibold text-white">Оплата подтверждена</p>
                <p className="font-body text-xs text-white/40">Контакты менеджера открыты</p>
              </div>

              <div className="space-y-3">
                {contacts.contactTelegram && (
                  <a
                    href={`https://t.me/${contacts.contactTelegram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 px-4 py-3 transition-colors hover:bg-[#d4af37]/10"
                  >
                    <MessageCircle className="h-5 w-5 text-[#d4af37]" />
                    <div>
                      <p className="font-body text-xs font-medium uppercase tracking-wide text-white/40">Telegram</p>
                      <p className="font-body text-sm text-white">
                        {contacts.contactTelegram.startsWith('@')
                          ? contacts.contactTelegram
                          : `@${contacts.contactTelegram}`}
                      </p>
                    </div>
                  </a>
                )}
                {contacts.contactWhatsapp && (
                  <a
                    href={`https://wa.me/${contacts.contactWhatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <MessageCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="font-body text-xs font-medium uppercase tracking-wide text-white/40">WhatsApp</p>
                      <p className="font-body text-sm text-white">{contacts.contactWhatsapp}</p>
                    </div>
                  </a>
                )}
                {contacts.contactPhone && (
                  <a
                    href={`tel:${contacts.contactPhone}`}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <Phone className="h-5 w-5 text-white/50" />
                    <div>
                      <p className="font-body text-xs font-medium uppercase tracking-wide text-white/40">Телефон</p>
                      <p className="font-body text-sm text-white">{contacts.contactPhone}</p>
                    </div>
                  </a>
                )}
                {!contacts.contactTelegram && !contacts.contactPhone && !contacts.contactWhatsapp && (
                  <p className="font-body text-sm text-white/40 text-center py-2">
                    Контакты ещё не заполнены — обратитесь в поддержку.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-white/[0.1] py-3 font-body text-sm text-white/60 transition-colors hover:bg-white/[0.05]"
              >
                Закрыть
              </button>
            </div>
          )}

          {/* STEP: error */}
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

        {/* Step indicator */}
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
