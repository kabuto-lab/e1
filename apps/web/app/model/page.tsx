'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Calendar, Images, Radio, Settings, AlertCircle, Loader2, Clock, XCircle } from 'lucide-react';
import { api, type ModelProfile } from '@/lib/api-client';

const SECTIONS = [
  { href: '/model/profile', icon: User, title: 'Мой профиль', desc: 'Имя, биография, ставки, параметры' },
  { href: '/model/bookings', icon: Calendar, title: 'Мои брони', desc: 'Заявки и история встреч' },
  { href: '/model/photos', icon: Images, title: 'Фото', desc: 'Портфолио и главное фото' },
  { href: '/model/status', icon: Radio, title: 'Статус', desc: 'Доступность: онлайн / занята / офлайн' },
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

export default function ModelDashboardPage() {
  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyModelProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

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
          <div className="font-body text-sm">
            <p className="font-medium text-amber-300">Анкета на проверке</p>
            <p className="mt-0.5 text-amber-300/50">
              Модератор проверит анкету в ближайшее время. После верификации анкета появится в каталоге.
            </p>
          </div>
        </div>
      )}

      {!loading && profile && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,auto))]">
          <Stat label="Встреч" value={String(profile.totalMeetings ?? 0)} />
          <Stat label="Рейтинг" value={Number(profile.ratingReliability ?? 0).toFixed(1)} />
          <Stat label="Верификация" value={profile.verificationStatus === 'verified' ? '✓' : '—'} dim={profile.verificationStatus !== 'verified'} />
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
      <p className={`mt-1 font-display text-xl font-bold ${dim ? 'text-white/30' : 'text-white'}`}>{value}</p>
    </div>
  );
}
