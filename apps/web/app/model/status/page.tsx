'use client';

import { useState, useEffect } from 'react';
import { api, type ModelProfile } from '@/lib/api-client';
import { AlertCircle, Loader2, WifiOff, Zap, Radio, Clock } from 'lucide-react';

type AvailabilityStatus = ModelProfile['availabilityStatus'];

const STATUSES: {
  value: AvailabilityStatus;
  label: string;
  desc: string;
  Icon: React.ElementType;
  color: string;
  ring: string;
  bg: string;
  iconColor: string;
}[] = [
  {
    value: 'online',
    label: 'Онлайн',
    desc: 'Готова к встречам, принимаю заявки',
    Icon: Zap,
    color: 'text-emerald-300',
    ring: 'ring-emerald-400/50',
    bg: 'border-emerald-400/25 bg-emerald-400/[0.06]',
    iconColor: 'text-emerald-400 bg-emerald-400/10',
  },
  {
    value: 'in_shift',
    label: 'На смене',
    desc: 'Работаю, но могу ответить',
    Icon: Radio,
    color: 'text-sky-300',
    ring: 'ring-sky-400/50',
    bg: 'border-sky-400/25 bg-sky-400/[0.06]',
    iconColor: 'text-sky-400 bg-sky-400/10',
  },
  {
    value: 'busy',
    label: 'Занята',
    desc: 'Сейчас недоступна, не беспокоить',
    Icon: Clock,
    color: 'text-amber-300',
    ring: 'ring-amber-400/50',
    bg: 'border-amber-400/25 bg-amber-400/[0.06]',
    iconColor: 'text-amber-400 bg-amber-400/10',
  },
  {
    value: 'offline',
    label: 'Офлайн',
    desc: 'Не принимаю заявки',
    Icon: WifiOff,
    color: 'text-white/40',
    ring: 'ring-white/20',
    bg: 'border-white/[0.08] bg-white/[0.02]',
    iconColor: 'text-white/30 bg-white/[0.05]',
  },
];

export default function ModelStatusPage() {
  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<AvailabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMyModelProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (status: AvailabilityStatus) => {
    if (!profile || status === profile.availabilityStatus || updating) return;
    if (profile.verificationStatus !== 'verified' && status !== 'offline') return;
    setUpdating(status);
    setError(null);
    try {
      const updated = await api.updateMyAvailability(profile.id, status);
      setProfile(updated);
    } catch (err: any) {
      setError(err.message ?? 'Не удалось обновить статус');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-body text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="font-body text-sm text-amber-200/80">
          <p className="font-medium">Анкета не привязана к аккаунту</p>
          <p className="mt-0.5 text-amber-200/50">Обратитесь к менеджеру.</p>
        </div>
      </div>
    );
  }

  const current = STATUSES.find((s) => s.value === profile.availabilityStatus);
  const isUnverified = profile.verificationStatus !== 'verified';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Статус доступности</h1>
        <p className="mt-1 font-body text-sm text-white/35">
          Выберите статус — он сразу обновится в каталоге.
        </p>
      </div>

      {isUnverified && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div className="font-body text-sm">
            <p className="font-medium text-amber-300">Анкета ещё не верифицирована</p>
            <p className="mt-0.5 text-amber-300/50">
              До прохождения верификации доступен только статус «Офлайн».
            </p>
          </div>
        </div>
      )}

      {/* Current status */}
      {current && (
        <div className="flex items-center gap-3">
          <span className="font-body text-sm text-white/40">Сейчас:</span>
          <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-sm font-medium ${current.bg} ${current.color}`}>
            <current.Icon className="h-3.5 w-3.5" />
            {current.label}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Status cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {STATUSES.map((s) => {
          const isActive = profile.availabilityStatus === s.value;
          const isLoading = updating === s.value;
          const isLocked = isUnverified && s.value !== 'offline';

          return (
            <button
              key={s.value}
              type="button"
              onClick={() => handleSelect(s.value)}
              disabled={!!updating || isLocked}
              title={isLocked ? 'Доступно после верификации' : undefined}
              className={`group relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all disabled:cursor-wait ${
                isLocked ? 'opacity-35 cursor-not-allowed' : ''
              } ${
                isActive
                  ? `${s.bg} ring-2 ${s.ring}`
                  : 'border-white/[0.06] bg-[#141414]/80 hover:border-white/15'
              }`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isActive ? s.iconColor : 'bg-white/[0.05] text-white/25 group-hover:bg-white/[0.08] group-hover:text-white/40'
              }`}>
                {isLoading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <s.Icon className="h-5 w-5" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-display text-base font-semibold transition-colors ${
                  isActive ? s.color : 'text-white/50 group-hover:text-white/70'
                }`}>
                  {s.label}
                </p>
                <p className="mt-0.5 font-body text-sm text-white/30">{s.desc}</p>
              </div>
              {isActive && (
                <div className={`absolute right-4 top-4 h-2 w-2 rounded-full ${
                  s.value === 'online' ? 'bg-emerald-400'
                  : s.value === 'in_shift' ? 'bg-sky-400'
                  : s.value === 'busy' ? 'bg-amber-400'
                  : 'bg-white/20'
                }`} />
              )}
            </button>
          );
        })}
      </div>

      {profile.nextAvailableAt && profile.availabilityStatus === 'offline' && (
        <p className="font-body text-sm text-white/30">
          Следующая доступность:{' '}
          <span className="text-white/50">
            {new Date(profile.nextAvailableAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </p>
      )}
    </div>
  );
}
