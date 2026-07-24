'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, Loader2, AlertCircle, Flag, X } from 'lucide-react';
import { api, type ModelProfile } from '@/lib/api-client';
import { REVIEW_CHARACTERISTICS } from '@/components/ReviewModal';
import { SelectDropdown } from '@/components/SelectDropdown';

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  characteristics: string[] | null;
  isVerified: boolean | null;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  complaintStatus: 'none' | 'open' | 'resolved';
  complaintResolution: 'dismissed' | 'redacted' | 'deleted' | null;
  createdAt: string;
}

const MODERATION_LABEL: Record<ReviewRow['moderationStatus'], string> = {
  pending: 'На модерации',
  approved: 'Опубликован',
  rejected: 'Отклонён',
};

const MODERATION_COLOR: Record<ReviewRow['moderationStatus'], string> = {
  pending: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
  approved: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
  rejected: 'text-white/30 bg-white/[0.03] border-white/[0.06]',
};

const COMPLAINT_REASONS: { value: string; label: string }[] = [
  { value: 'insult', label: 'Отзыв содержит оскорбления' },
  { value: 'personal_data', label: 'Раскрыты личные данные' },
  { value: 'confidential_details', label: 'Опубликованы конфиденциальные подробности' },
  { value: 'false_info', label: 'Отзыв содержит заведомо ложную информацию' },
  { value: 'not_related', label: 'Отзыв не относится к этой встрече' },
  { value: 'threat', label: 'Клиент использует отзыв для угроз или шантажа' },
];

function ComplaintModal({
  reviewId,
  visible,
  onClose,
  onSubmitted,
}: {
  reviewId: string;
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Выберите причину жалобы');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.fileReviewComplaint(reviewId, reason, comment.trim() || undefined);
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить жалобу');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <h2 className="font-display text-base font-semibold text-white">Пожаловаться на отзыв</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
        <div className="flex flex-col gap-1">
          <span className="font-body text-xs text-white/50">Причина</span>
          <SelectDropdown value={reason} onChange={setReason} options={[{ value: '', label: 'Выберите причину' }, ...COMPLAINT_REASONS]} />
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-white/50">Комментарий (необязательно)</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-body text-sm text-white placeholder-white/30 focus:border-[#d4af37]/40 focus:outline-none"
          />
        </label>
        {error && <p className="font-body text-xs text-red-300">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/[0.08] px-4 py-2.5 font-body text-sm text-white/60 hover:bg-white/[0.04]">
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 font-body text-sm font-semibold text-black hover:bg-[#c49a2b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Отправляем…' : 'Отправить жалобу'}
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

export default function ModelReviewsPage() {
  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complaintTarget, setComplaintTarget] = useState<string | null>(null);
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);

  const openComplaint = (reviewId: string) => {
    setComplaintTarget(reviewId);
    requestAnimationFrame(() => setComplaintModalVisible(true));
  };
  const closeComplaint = () => {
    setComplaintModalVisible(false);
    setTimeout(() => setComplaintTarget(null), 300);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await api.getMyModelProfile();
      setProfile(p);
      if (!p) return;
      const res = await api.getModelReviews(p.id, 200);
      if (res?.accessMode === 'list') {
        setReviews(res.reviews as unknown as ReviewRow[]);
      } else {
        setReviews([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить отзывы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!loading && !profile) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
        <div className="font-body text-sm">
          <p className="font-medium text-amber-300">Анкета не привязана к аккаунту</p>
          <p className="mt-0.5 text-amber-300/50">Обратитесь к менеджеру.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Отзывы</h1>
        <p className="mt-1 font-body text-sm text-white/40">Отзывы клиентов о вас — публикуются после модерации.</p>
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
          <p className="font-body text-white/45">Пока нет отзывов.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/[0.06] bg-[#141414]/80 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center" aria-hidden>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? 'fill-[#d4af37] text-[#d4af37]' : 'text-white/15'}`} />
                  ))}
                  {r.isVerified ? (
                    <span className="ml-2 rounded-full bg-emerald-400/10 px-2 py-0.5 font-body text-[10px] font-medium text-emerald-300">
                      Подтверждённое бронирование
                    </span>
                  ) : null}
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

              {r.comment && <p className="mt-3 font-body text-sm italic text-white/60">«{r.comment}»</p>}

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="font-body text-xs text-white/25">
                  {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {r.complaintStatus === 'none' && r.moderationStatus === 'approved' ? (
                  <button
                    type="button"
                    onClick={() => openComplaint(r.id)}
                    className="inline-flex items-center gap-1.5 font-body text-xs text-white/40 hover:text-rose-300 transition-colors"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Пожаловаться
                  </button>
                ) : r.complaintStatus === 'open' ? (
                  <span className="font-body text-xs text-amber-300/80">Оспаривается</span>
                ) : r.complaintStatus === 'resolved' ? (
                  <span className="font-body text-xs text-white/30">Жалоба рассмотрена</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {complaintTarget ? (
        <ComplaintModal
          reviewId={complaintTarget}
          visible={complaintModalVisible}
          onClose={closeComplaint}
          onSubmitted={load}
        />
      ) : null}
    </div>
  );
}
