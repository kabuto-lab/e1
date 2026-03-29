/**
 * Модерация — колонки: анкеты (верификация), фото, видео/файлы, отзывы.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, X, User, Image as ImageIcon, Star, Film, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { api } from '@/lib/api-client';

interface ModProfile {
  id: string;
  displayName: string;
  slug: string;
  verificationStatus: string;
  createdAt: string;
  mainPhotoUrl?: string | null;
  isPublished?: boolean;
}

interface ModMedia {
  id: string;
  modelId: string | null;
  cdnUrl: string | null;
  fileType: string;
  mimeType?: string;
  createdAt: string;
  displayName?: string | null;
  slug?: string | null;
  metadata?: { originalName?: string } | null;
}

interface ModReview {
  id: string;
  modelId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  modelName: string;
  slug?: string | null;
}

function verificationLabel(s: string) {
  switch (s) {
    case 'pending':
      return 'Ожидает проверки';
    case 'video_required':
      return 'Нужно видео';
    case 'document_required':
      return 'Нужны документы';
    default:
      return s;
  }
}

export default function ModerationPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const [profiles, setProfiles] = useState<ModProfile[]>([]);
  const [media, setMedia] = useState<ModMedia[]>([]);
  const [reviews, setReviews] = useState<ModReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.getModerationQueue();
      setProfiles(Array.isArray(data.profiles) ? (data.profiles as ModProfile[]) : []);
      setMedia(Array.isArray(data.media) ? (data.media as ModMedia[]) : []);
      setReviews(Array.isArray(data.reviews) ? (data.reviews as ModReview[]) : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить очередь');
      setProfiles([]);
      setMedia([]);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const photos = useMemo(() => media.filter((m) => m.fileType === 'photo'), [media]);
  const videos = useMemo(() => media.filter((m) => m.fileType === 'video'), [media]);
  const documents = useMemo(() => media.filter((m) => m.fileType === 'document'), [media]);

  const accentLink = L ? 'text-[#2271b1] hover:underline' : 'text-[#d4af37] hover:underline';

  const cardShell = `${t.formSection} flex max-h-[min(72vh,640px)] flex-col`;

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await loadQueue();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  const colTitle = (icon: ReactNode, title: string, count: number) => (
    <div className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-current/10 pb-2">
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-white'}`}>
        <span className={L ? 'text-[#2271b1]' : 'text-[#d4af37]'}>{icon}</span>
        {title}
      </div>
      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${L ? 'bg-[#f0f0f1] text-[#50575e]' : 'bg-white/10 text-gray-400'}`}>
        {count}
      </span>
    </div>
  );

  const scrollList = 'min-h-0 flex-1 space-y-2 overflow-y-auto pr-1';

  return (
    <div className={`flex-1 font-body ${t.page}`}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
            Модерация
          </h1>
          <p className={`text-sm ${t.muted}`}>Очереди из API: верификация анкет, медиа, отзывы.</p>
        </div>
        <button
          type="button"
          onClick={() => loadQueue()}
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 rounded border px-4 py-2 text-sm font-semibold ${t.btnSecondary}`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {error && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            L ? 'border-[#d63638] bg-[#fcf0f1] text-[#d63638]' : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && profiles.length === 0 && media.length === 0 && reviews.length === 0 ? (
        <div className={`py-16 text-center text-sm ${t.muted}`}>Загрузка очереди…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Анкеты */}
          <section className={cardShell} aria-label="Анкеты на верификацию">
            {colTitle(<User className="h-4 w-4" />, 'Анкеты', profiles.length)}
            <div className={scrollList}>
              {profiles.length === 0 ? (
                <p className={`text-xs ${t.muted}`}>Нет анкет в очереди верификации.</p>
              ) : (
                profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-lg border p-2.5 ${L ? 'border-[#dcdcde] bg-[#fcfcfc]' : 'border-white/[0.08] bg-black/20'}`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/dashboard/models/${p.id}/edit`} className={`text-sm font-semibold ${accentLink}`}>
                          {p.displayName}
                        </Link>
                        <div className={`text-[10px] ${t.muted}`}>{p.slug}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          L ? 'bg-[#fcf9e8] text-[#996800]' : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {verificationLabel(p.verificationStatus)}
                      </span>
                    </div>
                    <div className={`mb-2 text-[10px] ${t.muted}`}>
                      {new Date(p.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === `p-${p.id}`}
                        onClick={() => run(`p-${p.id}`, () => api.moderateProfileVerification(p.id, 'verified'))}
                        className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                          L
                            ? 'border-[#00a32a] bg-[#edfaef] text-[#00a32a]'
                            : 'border-green-500/30 bg-green-500/15 text-green-400'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Верифицировать
                      </button>
                      <button
                        type="button"
                        disabled={busyId === `p-${p.id}`}
                        onClick={() => run(`p-${p.id}`, () => api.moderateProfileVerification(p.id, 'rejected'))}
                        className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                          L
                            ? 'border-[#d63638] bg-[#fcf0f1] text-[#d63638]'
                            : 'border-red-500/30 bg-red-500/15 text-red-400'
                        }`}
                      >
                        <X className="h-3.5 w-3.5" />
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Фото */}
          <section className={cardShell} aria-label="Фото на модерации">
            {colTitle(<ImageIcon className="h-4 w-4" />, 'Фото', photos.length)}
            <div className={scrollList}>
              {photos.length === 0 ? (
                <p className={`text-xs ${t.muted}`}>Нет фото в статусе «на проверке».</p>
              ) : (
                photos.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-2.5 ${L ? 'border-[#dcdcde] bg-[#fcfcfc]' : 'border-white/[0.08] bg-black/20'}`}
                  >
                    {m.cdnUrl ? (
                      <div className="mb-2 overflow-hidden rounded-md border border-black/10">
                        <img src={m.cdnUrl} alt="" className="h-36 w-full object-cover" />
                      </div>
                    ) : null}
                    <div className={`mb-2 text-[11px] ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>
                      {m.displayName || 'Модель'}{' '}
                      {m.modelId ? (
                        <Link href={`/dashboard/models/${m.modelId}/photos`} className={accentLink}>
                          (фото)
                        </Link>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === `m-${m.id}`}
                        onClick={() => run(`m-${m.id}`, () => api.approveProfileMedia(m.id))}
                        className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                          L
                            ? 'border-[#00a32a] bg-[#edfaef] text-[#00a32a]'
                            : 'border-green-500/30 bg-green-500/15 text-green-400'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Одобрить
                      </button>
                      <button
                        type="button"
                        disabled={busyId === `m-${m.id}`}
                        onClick={() => {
                          const reason = window.prompt('Причина отклонения (необязательно):') ?? '';
                          run(`m-${m.id}`, () => api.rejectProfileMedia(m.id, reason || 'Content violates guidelines'));
                        }}
                        className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                          L
                            ? 'border-[#d63638] bg-[#fcf0f1] text-[#d63638]'
                            : 'border-red-500/30 bg-red-500/15 text-red-400'
                        }`}
                      >
                        <X className="h-3.5 w-3.5" />
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Видео и файлы */}
          <section className={cardShell} aria-label="Видео и документы">
            {colTitle(<Film className="h-4 w-4" />, 'Видео и файлы', videos.length + documents.length)}
            <div className={scrollList}>
              {videos.length === 0 && documents.length === 0 ? (
                <p className={`text-xs ${t.muted}`}>Нет видео или документов на модерации.</p>
              ) : (
                <>
                  {videos.map((m) => (
                    <div
                      key={m.id}
                      className={`mb-2 rounded-lg border p-2.5 ${L ? 'border-[#dcdcde] bg-[#fcfcfc]' : 'border-white/[0.08] bg-black/20'}`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-[11px]">
                        <Film className="h-4 w-4 shrink-0 opacity-70" />
                        <span className={L ? 'text-[#2c3338]' : 'text-gray-300'}>
                          Видео · {m.displayName || 'Модель'}
                        </span>
                      </div>
                      {m.modelId ? (
                        <div className={`mb-2 text-[10px] ${t.muted}`}>
                          <Link href={`/dashboard/models/${m.modelId}/photos`} className={accentLink}>
                            Открыть медиа модели
                          </Link>
                        </div>
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === `m-${m.id}`}
                          onClick={() => run(`m-${m.id}`, () => api.approveProfileMedia(m.id))}
                          className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                            L
                              ? 'border-[#00a32a] bg-[#edfaef] text-[#00a32a]'
                              : 'border-green-500/30 bg-green-500/15 text-green-400'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Одобрить
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `m-${m.id}`}
                          onClick={() => {
                            const reason = window.prompt('Причина отклонения (необязательно):') ?? '';
                            run(`m-${m.id}`, () => api.rejectProfileMedia(m.id, reason || 'Content violates guidelines'));
                          }}
                          className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                            L
                              ? 'border-[#d63638] bg-[#fcf0f1] text-[#d63638]'
                              : 'border-red-500/30 bg-red-500/15 text-red-400'
                          }`}
                        >
                          <X className="h-3.5 w-3.5" />
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ))}
                  {documents.map((m) => (
                    <div
                      key={m.id}
                      className={`mb-2 rounded-lg border p-2.5 ${L ? 'border-[#dcdcde] bg-[#fcfcfc]' : 'border-white/[0.08] bg-black/20'}`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-[11px]">
                        <FileText className="h-4 w-4 shrink-0 opacity-70" />
                        <span className={L ? 'text-[#2c3338]' : 'text-gray-300'}>
                          {m.metadata?.originalName || 'Документ'} · {m.displayName || 'Модель'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === `m-${m.id}`}
                          onClick={() => run(`m-${m.id}`, () => api.approveProfileMedia(m.id))}
                          className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                            L
                              ? 'border-[#00a32a] bg-[#edfaef] text-[#00a32a]'
                              : 'border-green-500/30 bg-green-500/15 text-green-400'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Одобрить
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `m-${m.id}`}
                          onClick={() => {
                            const reason = window.prompt('Причина отклонения (необязательно):') ?? '';
                            run(`m-${m.id}`, () => api.rejectProfileMedia(m.id, reason || 'Content violates guidelines'));
                          }}
                          className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                            L
                              ? 'border-[#d63638] bg-[#fcf0f1] text-[#d63638]'
                              : 'border-red-500/30 bg-red-500/15 text-red-400'
                          }`}
                        >
                          <X className="h-3.5 w-3.5" />
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>

          {/* Отзывы */}
          <section className={cardShell} aria-label="Отзывы">
            {colTitle(<Star className="h-4 w-4" />, 'Отзывы', reviews.length)}
            <div className={scrollList}>
              {reviews.length === 0 ? (
                <p className={`text-xs ${t.muted}`}>Нет отзывов на модерации.</p>
              ) : (
                reviews.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-lg border p-2.5 ${L ? 'border-[#dcdcde] bg-[#fcfcfc]' : 'border-white/[0.08] bg-black/20'}`}
                  >
                    <div className="mb-1 text-sm font-semibold">{r.modelName}</div>
                    {r.slug ? (
                      <div className={`mb-2 text-[10px] ${t.muted}`}>
                        <Link href={`/models/${r.slug}`} className={accentLink} target="_blank" rel="noreferrer">
                          Публичная анкета
                        </Link>
                        {' · '}
                        <Link href={`/dashboard/models/${r.modelId}/edit`} className={accentLink}>
                          Редактор
                        </Link>
                      </div>
                    ) : null}
                    <div className="mb-1 text-[11px]">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          className={i < r.rating ? (L ? 'text-[#b8941f]' : 'text-[#d4af37]') : L ? 'text-[#c3c4c7]' : 'text-white/15'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p className={`mb-2 line-clamp-4 text-[11px] leading-snug ${L ? 'text-[#2c3338]' : 'text-gray-300'}`}>
                      {r.comment?.trim() || 'Без текста'}
                    </p>
                    <div className={`mb-2 text-[10px] ${t.muted}`}>
                      {new Date(r.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === `r-${r.id}`}
                        onClick={() => run(`r-${r.id}`, () => api.moderateReview(r.id, 'approved'))}
                        className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                          L
                            ? 'border-[#00a32a] bg-[#edfaef] text-[#00a32a]'
                            : 'border-green-500/30 bg-green-500/15 text-green-400'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Одобрить
                      </button>
                      <button
                        type="button"
                        disabled={busyId === `r-${r.id}`}
                        onClick={() => {
                          const reason = window.prompt('Причина отклонения (необязательно):') ?? '';
                          run(`r-${r.id}`, () => api.moderateReview(r.id, 'rejected', reason || undefined));
                        }}
                        className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                          L
                            ? 'border-[#d63638] bg-[#fcf0f1] text-[#d63638]'
                            : 'border-red-500/30 bg-red-500/15 text-red-400'
                        }`}
                      >
                        <X className="h-3.5 w-3.5" />
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
