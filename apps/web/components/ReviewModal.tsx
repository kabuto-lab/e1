'use client';

/**
 * ReviewModal — отзыв клиента о модели после завершённой встречи (см. «Логика отзывов в MVP»).
 * Открывается с карточки/детальной страницы завершённой брони в cabinet/bookings.
 */

import { useState } from 'react';
import { X, Star, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { ymGoal } from '@/lib/metrika';

export const REVIEW_CHARACTERISTICS: { value: string; label: string }[] = [
  { value: 'matches_profile', label: 'Соответствует анкете' },
  { value: 'polite', label: 'Вежливая' },
  { value: 'punctual', label: 'Пунктуальная' },
  { value: 'pleasant_talk', label: 'Приятное общение' },
  { value: 'easy_to_arrange', label: 'Легко договориться' },
  { value: 'recommend', label: 'Рекомендую' },
];

interface IProps {
  bookingId: string;
  modelId: string;
  modelName: string;
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReviewModal({ bookingId, modelId, modelName, visible, onClose, onSubmitted }: IProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [characteristics, setCharacteristics] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCharacteristic = (value: string) => {
    setCharacteristics((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError('Поставьте оценку от 1 до 5');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createReview({
        bookingId,
        modelId,
        rating,
        comment: comment.trim() || undefined,
        characteristics: characteristics.length > 0 ? characteristics : undefined,
        isAnonymous,
      });
      ymGoal('review_submitted', { modelId, rating });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить отзыв');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <h2 className="font-display text-base font-semibold text-white">Оставить отзыв</h2>
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

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5"
                  aria-label={`Оценка ${n}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      n <= (hoverRating || rating) ? 'fill-[#d4af37] text-[#d4af37]' : 'text-white/15'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-body text-xs text-white/50">Что понравилось (необязательно)</span>
            <div className="flex flex-wrap gap-2">
              {REVIEW_CHARACTERISTICS.map((c) => {
                const active = characteristics.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCharacteristic(c.value)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
                      active
                        ? 'border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]'
                        : 'border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="font-body text-xs text-white/50">Комментарий (необязательно)</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Расскажите о встрече…"
              rows={3}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-body text-sm text-white placeholder-white/30 focus:border-[#d4af37]/40 focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 font-body text-xs text-white/50">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-[#d4af37]"
            />
            Оставить анонимно (скрыть текст отзыва от других)
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
              {submitting ? 'Отправляем…' : 'Отправить'}
            </button>
          </div>
      </form>
    </>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden
      />
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
