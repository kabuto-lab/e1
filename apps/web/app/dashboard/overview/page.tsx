'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { apiUrl } from '@/lib/api-url';
import { authFetch } from '@/lib/api-client';
import {
  Users, CalendarDays, Clock, CheckCircle2, XCircle,
  Plus, Phone, Building2, Send, User, Calendar, ArrowRight,
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

export default function ManagerMainPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ManagerProfile | null>(null);
  const [modelsCount, setModelsCount] = useState<number>(0);
  const [bookingsCount, setBookingsCount] = useState<number>(0);

  useEffect(() => {
    authFetch(apiUrl('/managers/me'))
      .then(r => r.json())
      .then(setProfile)
      .catch(() => null);

    authFetch(apiUrl('/models/my'))
      .then(r => r.json())
      .then((data: unknown[]) => setModelsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => null);

    authFetch(apiUrl('/bookings/all'))
      .then(r => r.json())
      .then((data: unknown[]) => setBookingsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => null);
  }, []);

  const isPending = user?.status === 'pending_verification';
  const isRejected = user?.status === 'suspended' && !!profile?.rejectedAt;
  const isActive = user?.status === 'active';

  const displayName = profile?.fullName ?? user?.email?.split('@')[0] ?? 'Менеджер';
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414] p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#d4af37]/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d4af37]/10 to-transparent" />

        <div className="relative flex flex-wrap items-start gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4af37]/25 to-[#d4af37]/[0.08] ring-1 ring-[#d4af37]/20">
            <span className="font-display text-xl font-bold text-[#d4af37]">{initials}</span>
          </div>

          {/* Name + badges */}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold leading-tight text-white">{displayName}</h1>
            {profile?.companyName && (
              <p className="mt-0.5 font-body text-sm text-white/35">{profile.companyName}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isActive && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-body text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Активен
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 font-body text-xs font-medium text-amber-400">
                  <Clock className="h-3 w-3" /> На проверке
                </span>
              )}
              {isRejected && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 font-body text-xs font-medium text-rose-400">
                  <XCircle className="h-3 w-3" /> Отклонён
                </span>
              )}
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-body text-xs font-medium text-white/35">
                Менеджер
              </span>
            </div>
          </div>

          {/* Created date */}
          {profile?.createdAt && (
            <div className="ml-auto shrink-0 text-right">
              <p className="font-body text-[10px] uppercase tracking-widest text-white/20">Заявка подана</p>
              <p className="mt-0.5 font-body text-xs text-white/40">
                {new Date(profile.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#141414] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d4af37]/10">
              <Users className="h-3.5 w-3.5 text-[#d4af37]" />
            </div>
            <span className="font-body text-xs text-white/35">Моделей</span>
          </div>
          <p className="font-display text-3xl font-bold text-white">{modelsCount}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#141414] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d4af37]/10">
              <CalendarDays className="h-3.5 w-3.5 text-[#d4af37]" />
            </div>
            <span className="font-body text-xs text-white/35">Бронирований</span>
          </div>
          <p className="font-display text-3xl font-bold text-white">{bookingsCount}</p>
        </div>
      </div>

      {/* ── Main grid: Actions + Contacts ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Quick actions */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-5">
          <h2 className="mb-4 font-display text-[10px] font-bold uppercase tracking-widest text-white/25">Действия</h2>
          <div className="space-y-2">
            <Link
              href="/dashboard/models/create"
              aria-disabled={isPending}
              className={`group flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                isPending
                  ? 'pointer-events-none border-white/[0.04] opacity-35'
                  : 'border-white/[0.06] hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] transition-colors group-hover:border-[#d4af37]/20 group-hover:bg-[#d4af37]/10">
                  <Plus className="h-3.5 w-3.5 text-white/40 group-hover:text-[#d4af37]" />
                </div>
                <span className="font-body text-sm text-white/60 group-hover:text-white/90">Добавить модель</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-white/20 transition-colors group-hover:text-[#d4af37]/60" />
            </Link>

            <Link
              href="/dashboard/models/list"
              className="group flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-3 transition-colors hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] transition-colors group-hover:border-[#d4af37]/20 group-hover:bg-[#d4af37]/10">
                  <Users className="h-3.5 w-3.5 text-white/40 group-hover:text-[#d4af37]" />
                </div>
                <span className="font-body text-sm text-white/60 group-hover:text-white/90">Мои модели</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-white/20 transition-colors group-hover:text-[#d4af37]/60" />
            </Link>

            <Link
              href="/dashboard/bookings"
              className="group flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-3 transition-colors hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] transition-colors group-hover:border-[#d4af37]/20 group-hover:bg-[#d4af37]/10">
                  <CalendarDays className="h-3.5 w-3.5 text-white/40 group-hover:text-[#d4af37]" />
                </div>
                <span className="font-body text-sm text-white/60 group-hover:text-white/90">Бронирования</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-white/20 transition-colors group-hover:text-[#d4af37]/60" />
            </Link>
          </div>
        </div>

        {/* Contact info */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-5">
          <h2 className="mb-4 font-display text-[10px] font-bold uppercase tracking-widest text-white/25">Контакты</h2>
          {profile ? (
            <div className="space-y-4">
              {[
                { icon: User,      label: 'Имя',      value: profile.fullName },
                { icon: Phone,     label: 'Телефон',  value: profile.phone },
                ...(profile.telegramContact ? [{ icon: Send,      label: 'Telegram', value: profile.telegramContact }] : []),
                ...(profile.companyName     ? [{ icon: Building2, label: 'Компания', value: profile.companyName }] : []),
                { icon: User,      label: 'Email',    value: user?.email ?? '—' },
                ...(profile.approvedAt ? [{
                  icon: Calendar,
                  label: 'Одобрен',
                  value: new Date(profile.approvedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
                }] : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-white/20" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-[10px] uppercase tracking-wide text-white/25">{label}</p>
                    <p className="mt-0.5 truncate font-body text-sm text-white/75">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-6 shrink-0 animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-8 flex-1 animate-pulse rounded-lg bg-white/[0.04]" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Rejection reason ── */}
      {isRejected && profile?.rejectionReason && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-5">
          <h2 className="mb-2 font-display text-[10px] font-bold uppercase tracking-widest text-rose-400/70">Причина отклонения</h2>
          <p className="font-body text-sm leading-relaxed text-rose-300/80">{profile.rejectionReason}</p>
        </div>
      )}

    </div>
  );
}
