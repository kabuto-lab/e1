'use client';

import { useState } from 'react';
import { X, User, Phone, MessageSquare, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';

interface Props {
  onClose: () => void;
}

/** Форма «Запросить доступ» для закрытого каталога массажного режима (ТЗ §2, «Два режима каталога»). */
export function AccessRequestModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      setError('Заполните имя и контакт');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createMassageAccessRequest({
        name: name.trim(),
        contact: contact.trim(),
        comment: comment.trim() || undefined,
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
          <h2 className="font-display text-base font-semibold text-white">Запросить доступ</h2>
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
              Администратор расскажет о доступных мастерах и программах.
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
              Оставьте контакт, и администратор расскажет о доступных мастерах и программах.
            </p>

            <label className="flex flex-col gap-1">
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

            <label className="flex flex-col gap-1">
              <span className="font-body text-xs text-white/50 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Телефон или Telegram *
              </span>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="+7 (999) 000-00-00 или @username"
                required
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-body text-sm text-white placeholder-white/30 focus:border-[#d4af37]/40 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-body text-xs text-white/50 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Комментарий (необязательно)
              </span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-body text-sm text-white placeholder-white/30 focus:border-[#d4af37]/40 focus:outline-none"
              />
            </label>

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
                {submitting ? 'Отправляем…' : 'Запросить доступ'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
