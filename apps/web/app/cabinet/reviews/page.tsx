'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Star, Loader2 } from 'lucide-react';
import { api, type ReviewRecord } from '@/lib/api-client';
import { REVIEW_CHARACTERISTICS } from '@/components/ReviewModal';

const MODERATION_LABEL: Record<ReviewRecord['moderationStatus'], string> = {
  pending: 'На модерации',
  approved: 'Опубликован',
  rejected: 'Отклонён',
};

const MODERATION_COLOR: Record<ReviewRecord['moderationStatus'], string> = {
  pending: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
  approved: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
  rejected: 'text-white/30 bg-white/[0.03] border-white/[0.06]',
};

export default function CabinetReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyReviews();
      setReviews(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить отзывы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Отзывы</h1>
        <p className="mt-2 font-body text-sm text-white/40">Отзывы, которые вы оставили после встреч.</p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 font-body text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 font-body text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаем…
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#141414]/60 p-8 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p className="font-body text-white/45">Вы пока не оставляли отзывов.</p>
          <p className="mt-1 font-body text-xs text-white/30">
            Отзыв можно оставить на странице завершённой встречи.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/[0.06] bg-[#141414]/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {r.modelSlug ? (
                    <Link
                      href={`/models/${encodeURIComponent(r.modelSlug)}`}
                      className="font-body font-medium text-white hover:text-[#d4af37] transition-colors"
                    >
                      {r.modelName ?? 'Модель'}
                    </Link>
                  ) : (
                    <span className="font-body font-medium text-white">{r.modelName ?? 'Модель'}</span>
                  )}
                  <div className="mt-1 flex" aria-hidden>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? 'fill-[#d4af37] text-[#d4af37]' : 'text-white/15'}`} />
                    ))}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 font-body text-xs font-medium ${MODERATION_COLOR[r.moderationStatus]}`}>
                  {MODERATION_LABEL[r.moderationStatus]}
                </span>
              </div>

              {r.characteristics && r.characteristics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.characteristics.map((c) => (
                    <span key={c} className="rounded-full border border-white/[0.08] px-2.5 py-1 font-body text-xs text-white/50">
                      {REVIEW_CHARACTERISTICS.find((rc) => rc.value === c)?.label ?? c}
                    </span>
                  ))}
                </div>
              )}

              {r.comment && (
                <p className="mt-3 font-body text-sm italic text-white/60">«{r.comment}»</p>
              )}

              {r.complaintStatus !== 'none' && (
                <p className="mt-3 font-body text-xs text-rose-300/80">
                  {r.complaintStatus === 'open' ? 'Модель оспаривает этот отзыв' : 'Жалоба модели рассмотрена'}
                </p>
              )}

              <p className="mt-3 font-body text-xs text-white/25">
                {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
