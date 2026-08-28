'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { User, Calendar, Images, Radio, Settings, AlertCircle, Loader2, Clock, XCircle, MessageSquare, Quote, Upload, CheckCircle2, X, FileText } from 'lucide-react';
import { api, resolveUploadMimeType } from '@/lib/api-client';
import { ModelProfile } from '@/types/model';

const SECTIONS = [
  { href: '/model/profile', icon: User, title: 'Профиль', desc: 'Имя, биография, ставки, параметры' },
  { href: '/model/bookings', icon: Calendar, title: 'Мои брони', desc: 'Заявки и история встреч' },
  { href: '/model/photos', icon: Images, title: 'Фото', desc: 'Портфолио и главное фото' },
  { href: '/model/status', icon: Radio, title: 'Статус', desc: 'Доступность: онлайн / занята / офлайн' },
  { href: '/model/messages', icon: MessageSquare, title: 'Сообщения', desc: 'Переписка' },
  { href: '/model/reviews', icon: Quote, title: 'Отзывы', desc: 'Отзывы клиентов о вас' },
  { href: '/model/settings', icon: Settings, title: 'Настройки', desc: 'Telegram и уведомления' },
];

const AVAILABILITY_LABEL: Record<ModelProfile['availabilityStatus'], string> = {
  offline: 'Офлайн',
  online: 'Онлайн',
  in_shift: 'На смене',
  busy: 'Занята',
};

const AVAILABILITY_COLOR: Record<ModelProfile['availabilityStatus'], string> = {
  offline: 'text-white/40 bg-white/[0.06] border-white/10',
  online: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
  in_shift: 'text-sky-300 bg-sky-400/10 border-sky-400/25',
  busy: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
};

const VERIFICATION_LABEL: Record<ModelProfile['verificationStatus'], string> = {
  verified: 'Проверено',
  pending: 'На проверке',
  video_required: 'Нужно видео',
  document_required: 'Нужны документы',
  rejected: 'Отклонено',
};

export default function ModelDashboardPage() {
  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [meetingsCount, setMeetingsCount] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<string | null>(null);
  const [verificationPhotoUrl, setVerificationPhotoUrl] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const refreshVerificationPhoto = (modelId: string) => {
    api.getProfileMedia(modelId)
      .then((media) => {
        const verificationPhoto = media.find((m: any) => m.albumCategory === 'verified' && m.cdnUrl?.trim());
        setVerificationPhotoUrl(verificationPhoto?.cdnUrl ?? null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    api.getMyModelProfile()
      .then((p) => {
        setProfile(p);
        if (!p) return;
        // totalMeetings/ratingReliability в самой анкете нигде не пересчитываются —
        // берём реальные цифры из брони и отзывов напрямую.
        api.getMyModelBookings()
          .then((bookings) => setMeetingsCount(bookings.filter((b) => b.status === 'completed').length))
          .catch(() => setMeetingsCount(0));
        api.getPublicModelReviews(p.id)
          .then((r) => setAverageRating(r.averageRating))
          .catch(() => setAverageRating('0.00'));
        refreshVerificationPhoto(p.id);
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * Верификационное фото — отдельная категория media (albumCategory: 'verified',
   * isPublicVisible: false), чтобы оно попадало модератору на проверку, но никогда
   * не показывалось в публичной галерее/каталоге и не становилось главным фото.
   */
  const uploadVerificationPhoto = async (file: File) => {
    if (!profile) return;
    setUploading(true);
    setUploadError(null);

    try {
      const mimeType = resolveUploadMimeType(file);
      const { uploadUrl, cdnUrl, mediaId } = await api.generatePresignedUrl({
        fileName: file.name,
        mimeType: mimeType as any,
        fileSize: file.size,
        modelId: profile.id,
      });
      await api.uploadToMinIO(uploadUrl, file, mimeType);
      await api.confirmUpload(mediaId, {
        cdnUrl,
        modelId: profile.id,
        metadata: { originalName: file.name },
        isPublicVisible: false,
        albumCategory: 'verified',
      });
      setVerificationPhotoUrl(cdnUrl);
    } catch (err: any) {
      setUploadError(err.message ?? 'Ошибка загрузки');
    }

    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadVerificationPhoto(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (!lightboxUrl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxUrl]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-bold text-white md:text-3xl">
            {loading ? 'Кабинет модели' : (profile?.displayName ?? 'Кабинет модели')}
          </h1>
          <p className="mt-2 font-body text-sm text-white/40">
            Управление анкетой, бронями и настройками.
          </p>
        </div>

        {!loading && profile && (
          <span className={`inline-flex flex-shrink-0 self-start rounded-full border px-3 py-1 font-body text-xs font-medium ${AVAILABILITY_COLOR[profile.availabilityStatus]}`}>
            {AVAILABILITY_LABEL[profile.availabilityStatus]}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 font-body text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаем профиль…
        </div>
      )}

      {!loading && !profile && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div className="font-body text-sm text-amber-200/80">
            <p className="font-medium">Анкета не привязана к аккаунту</p>
            <p className="mt-0.5 text-amber-200/50">
              Обратитесь к менеджеру — он создаст анкету и свяжет её с вашим аккаунтом.
            </p>
          </div>
        </div>
      )}

      {!loading && profile && profile.verificationStatus === 'rejected' && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4">
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-400" />
          <div className="font-body text-sm">
            <p className="font-medium text-rose-300">Анкета отклонена</p>
            <p className="mt-0.5 text-rose-300/50">
              Свяжитесь с менеджером для уточнения причины и повторной подачи.
            </p>
          </div>
        </div>
      )}

      {!loading && profile && profile.verificationStatus !== 'verified' && profile.verificationStatus !== 'rejected' && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414]/80">
          <div className="flex items-center gap-3 border-b border-white/[0.06] bg-amber-400/[0.05] px-5 py-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-white">Анкета на проверке</p>
              <p className="mt-0.5 font-body text-xs text-white/40">Нужно загрузить верификационное фото</p>
            </div>
          </div>

          <div className="space-y-5 p-5 font-body">
            <p className="text-sm text-white/50">
              Чтобы подтвердить, что фотографии принадлежат вам, загрузите верификационное фото — на нём одновременно должны быть хорошо видны:
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <RequirementItem icon={User} label="Ваше лицо" />
              <RequirementItem icon={FileText} label={<>Лист с надписью «My&nbsp;Muse»</>} />
              <RequirementItem icon={Calendar} label="Текущая дата" />
            </div>

            <p className="text-xs text-white/35">
              Фото должно быть чётким, без фильтров и обработки — надпись и дата должны хорошо читаться.
            </p>

            <div>
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-white/30">
                Пример правильного фото
              </p>
              <div className="flex flex-wrap gap-3">
                <img
                  src="/images/models/magnific_generate-a-verification-s_Doh5jdrpcl.jpg"
                  alt="Пример верификационного фото"
                  onClick={() => setLightboxUrl('/images/models/magnific_generate-a-verification-s_Doh5jdrpcl.jpg')}
                  className="h-20 w-20 flex-shrink-0 cursor-zoom-in rounded-lg border border-white/10 object-cover transition-opacity hover:opacity-80 sm:h-24 sm:w-24"
                />
                <img
                  src="/images/models/magnific_generate-a-verification-s_rgJ2WL5xtc.jpg"
                  alt="Пример верификационного фото"
                  onClick={() => setLightboxUrl('/images/models/magnific_generate-a-verification-s_rgJ2WL5xtc.jpg')}
                  className="h-20 w-20 flex-shrink-0 cursor-zoom-in rounded-lg border border-white/10 object-cover transition-opacity hover:opacity-80 sm:h-24 sm:w-24"
                />
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-5">
              <div className="flex flex-wrap items-center gap-3">
                {verificationPhotoUrl && (
                  <img
                    src={verificationPhotoUrl}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#c49a2b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? 'Загрузка…' : verificationPhotoUrl ? 'Загрузить другое фото' : 'Загрузить верификационное фото'}
                </button>

                {!uploading && verificationPhotoUrl && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Фото загружено
                  </span>
                )}

                {uploadError && <span className="text-xs text-rose-300">{uploadError}</span>}
              </div>

              <p className="mt-3 text-xs text-white/30">
                После загрузки фотографию проверит модератор. После успешной верификации анкета получит подтверждение и появится в каталоге.
              </p>
            </div>
          </div>
        </div>
      )}

      {lightboxUrl && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-black/70 p-4 sm:p-8"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="Закрыть"
            className="fixed right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={lightboxUrl} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>,
        document.body,
      )}

      {!loading && profile && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,auto))]">
          <Stat label="Встреч" value={meetingsCount != null ? String(meetingsCount) : '…'} />
          <Stat label="Рейтинг" value={averageRating != null ? Number(averageRating).toFixed(1) : '…'} />
          <Stat
            label="Верификация"
            value={VERIFICATION_LABEL[profile.verificationStatus]}
            dim={profile.verificationStatus !== 'verified'}
          />
          <Stat label="Статус" value={profile.isPublished ? 'Опубликована' : 'Черновик'} dim={!profile.isPublished} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-[#141414]/80 p-5 transition-colors hover:border-[#d4af37]/25"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-[#d4af37]">{s.title}</h2>
              <p className="mt-0.5 font-body text-sm text-white/35">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function RequirementItem({ icon: Icon, label }: { icon: React.ElementType; label: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#d4af37]/10 text-[#d4af37]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-sm text-white/70">{label}</span>
    </div>
  );
}

function Stat({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141414]/80 p-4">
      <p className="font-body text-xs text-white/30">{label}</p>
      <p className={`mt-1 break-words font-display text-lg font-bold sm:text-xl ${dim ? 'text-white/30' : 'text-white'}`}>{value}</p>
    </div>
  );
}
