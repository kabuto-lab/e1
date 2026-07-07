'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { apiUrl } from '@/lib/api-url';
import { authFetch } from '@/lib/api-client';
import {
  Loader2, AlertCircle, Phone, Building2, Send,
  Clock, CheckCircle2, XCircle, Calendar, User,
} from 'lucide-react';

interface ManagerProfile {
  id: string;
  fullName: string;
  companyName: string | null;
  phone: string;
  telegramContact: string | null;
  reviewNote: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-5">
      <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/30">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/25" />
      <div>
        <p className="font-body text-xs text-white/30">{label}</p>
        <p className="font-body text-sm text-white/80">{value}</p>
      </div>
    </div>
  );
}

export default function ManagerProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ManagerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch(apiUrl('/managers/me'))
      .then(r => r.json())
      .then(setProfile)
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-body text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <p className="font-body text-sm text-red-300">{error}</p>
      </div>
    );
  }

  const initials = (profile?.fullName ?? user?.email ?? '?')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';

  const isPending = user?.status === 'pending_verification';
  const isRejected = user?.status === 'suspended' && !!profile?.rejectedAt;
  const isActive = user?.status === 'active';

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#d4af37]/[0.06] blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 ring-1 ring-[#d4af37]/20">
            <span className="font-display text-2xl font-bold text-[#d4af37]">{initials}</span>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-white">{profile?.fullName ?? '—'}</h1>
            {profile?.companyName && (
              <p className="mt-0.5 font-body text-sm text-white/35">{profile.companyName}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {isActive && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 font-body text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Одобрен
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 font-body text-xs font-semibold text-amber-400">
                  <Clock className="h-3 w-3" /> На проверке
                </span>
              )}
              {isRejected && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 font-body text-xs font-semibold text-rose-400">
                  <XCircle className="h-3 w-3" /> Отклонён
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-body text-xs font-semibold text-white/40">
                Менеджер
              </span>
            </div>
          </div>
        </div>

        {profile?.createdAt && (
          <p className="relative mt-4 flex items-center gap-1.5 font-body text-xs text-white/20">
            <Calendar className="h-3.5 w-3.5" />
            Заявка подана{' '}
            {new Date(profile.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* ── Контакты ── */}
      <Section title="Контакты">
        <div className="space-y-3">
          <InfoRow icon={User} label="Имя" value={profile?.fullName ?? '—'} />
          <InfoRow icon={Phone} label="Телефон" value={profile?.phone ?? '—'} />
          {profile?.telegramContact && (
            <InfoRow icon={Send} label="Telegram" value={profile.telegramContact} />
          )}
          {profile?.companyName && (
            <InfoRow icon={Building2} label="Компания" value={profile.companyName} />
          )}
        </div>
      </Section>

      {/* ── Аккаунт ── */}
      <Section title="Аккаунт">
        <div className="space-y-3">
          <InfoRow icon={User} label="Email" value={user?.email ?? '—'} />
          {profile?.approvedAt && (
            <InfoRow
              icon={CheckCircle2}
              label="Одобрен"
              value={new Date(profile.approvedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            />
          )}
        </div>
      </Section>

      {/* ── Заметка / отказ ── */}
      {isRejected && profile?.rejectionReason && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-5">
          <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-rose-400">Причина отклонения</h2>
          <p className="font-body text-sm text-rose-300">{profile.rejectionReason}</p>
        </div>
      )}

      {profile?.reviewNote && !isRejected && (
        <Section title="Заметка от команды">
          <p className="font-body text-sm text-white/70">{profile.reviewNote}</p>
        </Section>
      )}

    </div>
  );
}
