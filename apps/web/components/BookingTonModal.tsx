'use client';

/**
 * BookingTonModal — модалка создания заявки на бронирование (шаг 1 из флоу по ТЗ).
 *
 * Собирает дату/время/продолжительность/комментарий и создаёт заявку (статус draft).
 * Оплата сюда НЕ входит — она возможна только после того, как исполнитель/менеджер
 * подтвердят заявку (см. EscrowPaymentModal, открывается со страницы брони при status=confirmed).
 *
 * На мобилке — bottom sheet (как фильтры в каталоге/выбор способа связи), на десктопе — по центру.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, MessageSquare, Check, ChevronDown, Clock, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useOutsideClose } from '@/lib/useOutsideClose';
import { DatePickerDropdown } from '@/components/DatePickerDropdown';
import { TimePickerDropdown } from '@/components/TimePickerDropdown';
import { ymGoal } from '@/lib/metrika';

const HOURS_OPTIONS = [1, 2, 3, 4, 6, 8, 12];

interface IProps {
  modelId: string;
  modelSlug: string;
  modelName: string;
  rateHourly?: number | null;
  /** Статус доступности модели — учитывается при дизейбле дат/времени. */
  availabilityStatus?: string;
  /** "Свободна с" — ISO-дата, до которой бронь недоступна, если модель offline. */
  nextAvailableAt?: string | null;
  /** Управляет transition открытия/закрытия — true сразу после mount (через requestAnimationFrame). */
  visible: boolean;
  onClose: () => void;
}

export function BookingTonModal({ modelId, modelName, rateHourly, availabilityStatus, nextAvailableAt, visible, onClose }: IProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [hours, setHours] = useState(2);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyRanges, setBusyRanges] = useState<{ start: Date; end: Date }[]>([]);

  const [hoursOpen, setHoursOpen] = useState(false);
  const hoursRef = useRef<HTMLDivElement>(null);
  useOutsideClose(hoursOpen, hoursRef, useCallback(() => setHoursOpen(false), []));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    api.getModelBusySlots(modelId)
      .then((ranges) => setBusyRanges(ranges.map((r) => ({ start: new Date(r.start), end: new Date(r.end) }))))
      .catch(() => setBusyRanges([]));
  }, [modelId]);

  const nextAvailableDate = nextAvailableAt ? new Date(nextAvailableAt) : null;
  const gatedByAvailability = availabilityStatus === 'offline' && !!nextAvailableDate;

  const isDateDisabled = useCallback(
    (d: Date) => {
      if (!gatedByAvailability || !nextAvailableDate) return false;
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return dayEnd < nextAvailableDate;
    },
    [gatedByAvailability, nextAvailableDate],
  );

  const isTimeDisabled = useCallback(
    (t: string) => {
      if (!date) return false;
      const candidateStart = new Date(`${date}T${t}:00`);
      const candidateEnd = new Date(candidateStart.getTime() + hours * 3600_000);
      if (gatedByAvailability && nextAvailableDate && candidateStart < nextAvailableDate) return true;
      return busyRanges.some((r) => candidateStart < r.end && candidateEnd > r.start);
    },
    [date, hours, gatedByAvailability, nextAvailableDate, busyRanges],
  );

  useEffect(() => {
    if (time && isTimeDisabled(time)) setTime('');
  }, [date, hours, busyRanges, isTimeDisabled, time]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      setError('Укажите дату и время встречи');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const startTime = new Date(`${date}T${time}:00`).toISOString();
      await api.createBookingForModel({
        modelId,
        startTime,
        durationHours: hours,
        specialRequests: message.trim() || undefined,
      });
      ymGoal('booking_created', { guest: false });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки заявки');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <h2 className="font-display text-base font-semibold text-white">Заявка на встречу</h2>
          <p className="font-body text-xs text-white/40 mt-0.5">{modelName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {done ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-7 w-7 text-emerald-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-white mb-2">Заявка отправлена</h3>
          <p className="font-body text-sm text-white/50 mb-6">
            Ждите подтверждения от исполнителя. Оплата станет доступна, как только заявку подтвердят —
            статус можно отслеживать в личном кабинете, в разделе «Встречи».
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37]/10 px-6 py-2.5 font-body text-sm font-medium text-[#d4af37] hover:bg-[#d4af37]/20"
          >
            Закрыть
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <p className="font-body text-xs text-white/40 pb-1">
            Опишите желаемую встречу — исполнитель подтвердит, предложит другое время или отклонит.
            Оплата через безопасную сделку — только после подтверждения.
          </p>

          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <span className="font-body text-xs text-white/50">Дата *</span>
              <DatePickerDropdown value={date} onChange={setDate} disabledDate={isDateDisabled} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-body text-xs text-white/50">Время *</span>
              <TimePickerDropdown value={time} onChange={setTime} disabledTime={isTimeDisabled} />
            </div>

            {/* Продолжительность */}
            <div className="flex flex-col gap-1">
              <span className="font-body text-xs text-white/50">Продолжительность</span>
              <div ref={hoursRef} className="relative">
                <button
                  type="button"
                  onClick={() => setHoursOpen((v) => !v)}
                  aria-expanded={hoursOpen}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left font-body text-sm text-white transition-colors focus:outline-none ${
                    hoursOpen ? 'border-[#d4af37]/40' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[#d4af37]/70" />
                    {hours} ч
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#d4af37]/60 transition-transform duration-200 ${hoursOpen ? 'rotate-180' : ''}`} />
                </button>

                {hoursOpen && (
                  <div className="absolute z-20 mt-2 max-h-52 w-full overflow-y-auto overscroll-contain rounded-lg border border-white/[0.08] bg-[#141414] shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
                    {HOURS_OPTIONS.map((h) => {
                      const active = hours === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => {
                            setHours(h);
                            setHoursOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 font-body text-sm transition-colors ${
                            active ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          {h} ч
                          {active && <Check className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="font-body text-xs text-white/50 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Комментарий (необязательно)
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Любые пожелания или вопросы..."
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-body text-sm text-white placeholder-white/30 focus:border-[#d4af37]/40 focus:outline-none"
              />
            </label>
          </div>

          {rateHourly && hours > 0 ? (
            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="font-body text-xs text-white/40">Ориентировочная стоимость</span>
              <span className="font-display text-sm font-bold text-[#d4af37]">
                {(rateHourly * hours).toLocaleString('ru-RU')} ₽
              </span>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 font-body text-xs text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/[0.08] px-4 py-2.5 font-body text-sm text-white/60 hover:bg-white/[0.04]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 font-body text-sm font-semibold text-black hover:bg-[#c49a2b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Отправляем…' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      )}
    </>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden
      />

      {/* Один инстанс контента (рефы Дата/Время/Продолжительность уникальны) — позиция и анимация адаптивные через CSS, а не дублирование дерева. */}
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" onClick={onClose}>
        <div
          className={`w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[1.5rem] border-t border-white/[0.08] bg-[#141414] pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-out sm:max-h-[85vh] sm:rounded-2xl sm:border sm:pb-0 sm:transition-none ${
            visible ? 'translate-y-0' : 'translate-y-full'
          } sm:translate-y-0 max-h-[88dvh] max-[640px]:max-w-full`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
          {content}
        </div>
      </div>
    </>
  );
}
