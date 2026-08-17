'use client';

/**
 * Статистика анкеты модели: просмотры (с графиком по дням), избранное, обращения.
 * Данные — GET /models/me/stats (см. ModelStatsService на бэкенде).
 */

import { useCallback, useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Eye, Heart, MessageCircle } from 'lucide-react';
import { api, type ModelStats } from '@/lib/api-client';
import { StatCard } from '@/components/StatCard';

const CHANNEL_LABEL: Record<'click' | 'telegram' | 'platform', string> = {
  click: 'Открыли форму связи',
  telegram: 'Telegram',
  platform: 'Сообщение на платформе',
};

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-6">
      <div className="flex items-center gap-2">
        <span className="text-[#d4af37]/80">{icon}</span>
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/30">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ViewsChart({ daily }: { daily: { date: string; count: number }[] }) {
  const data = daily.map((d) => ({
    date: d.date,
    label: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    count: d.count,
  }));
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <p className="font-body text-sm text-white/30">Пока нет просмотров за последние 30 дней</p>
    );
  }

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4af37" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="0" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={Math.ceil(data.length / 6)}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(212,175,55,0.35)', strokeWidth: 1 }}
            contentStyle={{
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
            itemStyle={{ color: '#f5e6b8' }}
            formatter={(value) => [value, 'Просмотры']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#d4af37"
            strokeWidth={2}
            fill="url(#viewsFill)"
            activeDot={{ r: 4, fill: '#d4af37', stroke: '#0a0a0a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ContactBars({ byChannel }: { byChannel: ModelStats['contacts']['byChannel'] }) {
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

export default function ModelStatsPage() {
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const s = await api.getModelStats();
      setStats(s);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('404')) {
        setNotFound(true);
      } else {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить статистику');
      }
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
          Просмотры анкеты, добавления в избранное и обращения клиентов.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 font-body text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      )}

      {!loading && notFound && (
        <div className="rounded-xl border border-white/[0.06] bg-[#141414]/80 px-4 py-6 text-center font-body text-sm text-white/40">
          Анкета ещё не создана — статистика появится после публикации.
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !notFound && !error && stats && (
        <div className="space-y-6">
          <SectionCard title="Просмотры" icon={<Eye className="h-4 w-4" />}>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Всего" value={String(stats.views.total)} suffix="" />
              <StatCard label="За 7 дней" value={String(stats.views.last7Days)} suffix="" />
              <StatCard label="За 30 дней" value={String(stats.views.last30Days)} suffix="" accent />
            </div>
            <ViewsChart daily={stats.views.daily} />
          </SectionCard>

          <SectionCard title="Избранное" icon={<Heart className="h-4 w-4" />}>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Сейчас" value={String(stats.favorites.current)} suffix="" accent />
              <StatCard label="+7 дней" value={String(stats.favorites.added7Days)} suffix="" />
              <StatCard label="+30 дней" value={String(stats.favorites.added30Days)} suffix="" />
            </div>
          </SectionCard>

          <SectionCard title="Обращения" icon={<MessageCircle className="h-4 w-4" />}>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="За 7 дней" value={String(stats.contacts.total7Days)} suffix="" />
              <StatCard label="За 30 дней" value={String(stats.contacts.total30Days)} suffix="" accent />
            </div>
            <ContactBars byChannel={stats.contacts.byChannel} />
          </SectionCard>
        </div>
      )}
    </div>
  );
}
