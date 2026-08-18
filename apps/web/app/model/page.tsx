'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { User, Calendar, Images, Radio, Settings, AlertCircle, Loader2, Clock, XCircle, MessageSquare, Quote, Upload } from 'lucide-react';
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
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoUpload = async (file: File) => {
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
      await api.confirmUpload(mediaId, { cdnUrl, modelId: profile.id, metadata: { originalName: file.name } });
      if (!profile.mainPhotoUrl) {
        await api.setMainPhoto(mediaId, profile.id);
        setProfile((p) => (p ? { ...p, mainPhotoUrl: cdnUrl } : p));
      }
    } catch (err: any) {
      setUploadError(err.message ?? 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoUpload(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">
            {loading ? 'Кабинет модели' : (profile?.displayName ?? 'Кабинет модели')}
          </h1>
          <p className="mt-2 font-body text-sm text-white/40">
            Управление анкетой, бронями и настройками.
          </p>
        </div>

        {!loading && profile && (
          <span className={`flex-shrink-0 rounded-full border px-3 py-1 font-body text-xs font-medium ${AVAILABILITY_COLOR[profile.availabilityStatus]}`}>
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
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
          <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1 font-body text-sm">
            <p className="font-medium text-amber-300">Анкета на проверке</p>
            <p className="mt-1 text-amber-300/60">
              Модератор проверит анкету в ближайшее время. Чтобы её одобрили быстрее, убедитесь, что:
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-amber-300/50">
              <li>загружено хотя бы одно чёткое фото, на котором видно лицо;</li>
              <li>фото соответствует реальной внешности;</li>
              <li>заполнены основные параметры анкеты (возраст, рост, вес и т.д.).</li>
            </ul>
            <p className="mt-1 text-amber-300/50">После верификации анкета появится в каталоге.</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
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
                className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {profile.mainPhotoUrl ? 'Загрузить ещё фото' : 'Загрузить фото'}
              </button>
              {uploadError && <span className="text-xs text-rose-300">{uploadError}</span>}
            </div>
          </div>
        </div>
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

function Stat({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141414]/80 p-4">
      <p className="font-body text-xs text-white/30">{label}</p>
      <p className={`mt-1 break-words font-display text-lg font-bold sm:text-xl ${dim ? 'text-white/30' : 'text-white'}`}>{value}</p>
    </div>
  );
}
