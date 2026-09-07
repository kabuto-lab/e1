'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiUrl } from '@/lib/api-url';
import { authFetch } from '@/lib/api-client';
import { Users, CalendarDays, MessageSquare, ArrowRight } from 'lucide-react';

export default function EmployeeHomePage() {
  return (
    <ProtectedRoute requiredRoles={['employee']} redirectOnRoleMismatch="/dashboard">
      <EmployeeHomeContent />
    </ProtectedRoute>
  );
}

function EmployeeHomeContent() {
  const [profile, setProfile] = useState<{ fullName: string | null; login: string | null } | null>(null);
  const [modelsCount, setModelsCount] = useState<number>(0);
  const [bookingsCount, setBookingsCount] = useState<number>(0);

  useEffect(() => {
    authFetch(apiUrl('/auth/me'))
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => null);

    authFetch(apiUrl('/models/my'))
      .then((r) => r.json())
      .then((data: unknown[]) => setModelsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => null);

    authFetch(apiUrl('/bookings/all'))
      .then((r) => r.json())
      .then((data: unknown[]) => setBookingsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => null);
  }, []);

  const displayName = profile?.fullName ?? profile?.login ?? 'Сотрудник';
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414] p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#d4af37]/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d4af37]/10 to-transparent" />

        <div className="relative flex flex-wrap items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4af37]/25 to-[#d4af37]/[0.08] ring-1 ring-[#d4af37]/20">
            <span className="font-display text-xl font-bold text-[#d4af37]">{initials}</span>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold leading-tight text-white">{displayName}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-body text-xs font-medium text-white/35">
                Сотрудник
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#141414] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d4af37]/10">
              <Users className="h-3.5 w-3.5 text-[#d4af37]" />
            </div>
            <span className="font-body text-xs text-white/35">Моделей команды</span>
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

      {/* ── Quick actions ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-5">
        <h2 className="mb-4 font-display text-[10px] font-bold uppercase tracking-widest text-white/25">Действия</h2>
        <div className="space-y-2">
          <Link
            href="/dashboard/models"
            className="group flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-3 transition-colors hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] transition-colors group-hover:border-[#d4af37]/20 group-hover:bg-[#d4af37]/10">
                <Users className="h-3.5 w-3.5 text-white/40 group-hover:text-[#d4af37]" />
              </div>
              <span className="font-body text-sm text-white/60 group-hover:text-white/90">Модели</span>
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

          <Link
            href="/dashboard/messages"
            className="group flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-3 transition-colors hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] transition-colors group-hover:border-[#d4af37]/20 group-hover:bg-[#d4af37]/10">
                <MessageSquare className="h-3.5 w-3.5 text-white/40 group-hover:text-[#d4af37]" />
              </div>
              <span className="font-body text-sm text-white/60 group-hover:text-white/90">Сообщения</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-white/20 transition-colors group-hover:text-[#d4af37]/60" />
          </Link>
        </div>
      </div>
    </div>
  );
}
