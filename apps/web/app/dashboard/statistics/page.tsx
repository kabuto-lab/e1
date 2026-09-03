'use client';

/**
 * Статистика менеджера: агрегат по всем привязанным моделям + разбивка по каждой анкете.
 * Данные — GET /models/me/manager-stats (см. ModelStatsService.getStatsForManager на бэкенде).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Eye, Heart, MessageCircle, Users, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StatCard } from '@/components/StatCard';
import { ManagerStats, ManagerModelStat } from '@/types/model';

const CHANNEL_LABEL: Record<'click' | 'telegram' | 'platform', string> = {
  click: 'Открыли форму связи',
  telegram: 'Telegram',
  platform: 'Сообщение на платформе',
};

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#141414] p-6">
      <div className="flex items-center gap-2">
        <span className="text-[#d4af37]/80">{icon}</span>
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/30">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ContactBars({ byChannel }: { byChannel: ManagerStats['totals']['contacts']['byChannel'] }) {
  const max = Math.max(1, byChannel.click, byChannel.telegram, byChannel.platform);
  const rows: Array<keyof typeof CHANNEL_LABEL> = ['click', 'telegram', 'platform'];

  return (
    <div className="space-y-2.5">
      {rows.map((key) => {
        const value = byChannel[key];
        const pct = Math.round((value / max) * 100);
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-[168px] shrink-0 font-body text-xs text-white/50">{CHANNEL_LABEL[key]}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d4af37]/40 to-[#d4af37]"
                style={{ width: `${value > 0 ? Math.max(pct, 4) : 0}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-body text-xs font-semibold text-white/80">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="font-body text-[10px] uppercase tracking-wide text-white/30">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-bold ${accent ? 'text-[#d4af37]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function ModelStatCard({ model }: { model: ManagerModelStat }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414] transition-colors hover:border-[#d4af37]/20">
      <Link
        href={`/dashboard/models/${model.id}/edit`}
        className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5 transition-colors hover:bg-[#d4af37]/[0.03]"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
          {model.mainPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.mainPhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Users className="h-4 w-4 text-white/20" />
          )}
        </div>
        <p className="min-w-0 flex-1 truncate font-display text-base font-semibold text-white/90">{model.displayName}</p>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-white/20" />
      </Link>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-2.5">
          <MiniStat label="Просмотры (30д)" value={model.views.last30Days} accent />
          <MiniStat label="В избранном" value={model.favorites.current} />
          <MiniStat label="Обращения (30д)" value={model.contacts.total30Days} />
        </div>
      </div>
    </div>
  );
}

function ManagerStatisticsContent() {
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.getManagerStats();
      setStats(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Статистика</h1>
        <p className="mt-1 font-body text-sm text-white/35">
          Просмотры, избранное и обращения по всем вашим анкетам.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 font-body text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && stats && stats.modelsCount === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#141414] px-4 py-6 text-center font-body text-sm text-white/40">
          К вам ещё не привязано ни одной анкеты — статистика появится после добавления моделей.
        </div>
      )}

      {!loading && !error && stats && stats.modelsCount > 0 && (
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/25">
              Портфель — все анкеты вместе
            </h2>

            <div className="space-y-4">
              <SectionCard title="Просмотры" icon={<Eye className="h-4 w-4" />}>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Всего" value={String(stats.totals.views.total)} suffix="" />
                  <StatCard label="За 7 дней" value={String(stats.totals.views.last7Days)} suffix="" />
                  <StatCard label="За 30 дней" value={String(stats.totals.views.last30Days)} suffix="" accent />
                </div>
              </SectionCard>

              <SectionCard title="Избранное" icon={<Heart className="h-4 w-4" />}>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Сейчас" value={String(stats.totals.favorites.current)} suffix="" accent />
                  <StatCard label="+7 дней" value={String(stats.totals.favorites.added7Days)} suffix="" />
                  <StatCard label="+30 дней" value={String(stats.totals.favorites.added30Days)} suffix="" />
                </div>
              </SectionCard>

              <SectionCard title="Обращения" icon={<MessageCircle className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="За 7 дней" value={String(stats.totals.contacts.total7Days)} suffix="" />
                  <StatCard label="За 30 дней" value={String(stats.totals.contacts.total30Days)} suffix="" accent />
                </div>
                <ContactBars byChannel={stats.totals.contacts.byChannel} />
              </SectionCard>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest text-white/25">
              <Users className="h-3.5 w-3.5 text-[#d4af37]/80" />
              По анкетам ({stats.modelsCount})
            </h2>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {stats.models.map((model) => (
                <ModelStatCard key={model.id} model={model} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagerStatisticsPage() {
  return (
    <ProtectedRoute requiredRoles={['manager']} redirectOnRoleMismatch="/dashboard">
      <ManagerStatisticsContent />
    </ProtectedRoute>
  );
}
