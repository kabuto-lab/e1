'use client';

import { useState } from 'react';
import { X, Phone, User, Calendar, Clock, MessageSquare, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';

interface Props {
  modelId: string;
  modelName: string;
  rateHourly?: number | null;
  onClose: () => void;
}

export function GuestBookingModal({ modelId, modelName, rateHourly, onClose }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = rateHourly ? String(rateHourly * hours) : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !date) {
      setError('Заполните имя, телефон и дату');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const startTime = new Date(date + 'T12:00:00').toISOString();
      await api.createGuestBooking({
        modelId,
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestEmail: email.trim() || undefined,
        guestMessage: message.trim() || undefined,
        startTime,
        durationHours: hours,
        totalAmount,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки заявки');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-[#141414] sm:rounded-2xl border border-white/[0.08] shadow-2xl">
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
              Менеджер свяжется с вами по телефону в ближайшее время.
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
              Заявка без регистрации — менеджер перезвонит для подтверждения.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 flex flex-col gap-1">
                <span className="font-body text-xs text-white/50 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Имя *
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  required
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-body text-sm text-white placeholder-white/30 focus:border-[#d4af37]/40 focus:outline-none"
                />
              </label>

              <label className="col-span-2 flex flex-col gap-1">
                <span className="font-body text-xs text-white/50 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Телефон *
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  required
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-body text-sm text-white placeholder-white/30 focus:border-[#d4af37]/40 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-xs text-white/50 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Дата *
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  required
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-body text-sm text-white focus:border-[#d4af37]/40 focus:outline-none [color-scheme:dark]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-xs text-white/50 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Часы
                </span>
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#141414] px-3 py-2.5 font-body text-sm text-white focus:border-[#d4af37]/40 focus:outline-none"
                >
                  {[1, 2, 3, 4, 6, 8, 12].map((h) => (
                    <option key={h} value={h}>{h} ч</option>
                  ))}
                </select>
              </label>

              <label className="col-span-2 flex flex-col gap-1">
                <span className="font-body text-xs text-white/50 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Пожелания (необязательно)
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
      </div>
    </div>
  );
}
