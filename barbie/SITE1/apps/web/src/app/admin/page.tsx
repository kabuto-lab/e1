'use client';

import { PageHeader } from '@/components/admin/primitives/PageHeader';
import { KpiRow } from '@/components/admin/sections/KpiRow';
import { ActivityStream } from '@/components/admin/sections/ActivityStream';
import { Heatmap } from '@/components/admin/sections/Heatmap';
import { StaffGrid } from '@/components/admin/sections/StaffGrid';

/**
 * /admin — главный dashboard NAS. Структура секций повторяет
 * dashboard-2077.html без блока "Выручка / 7Д" (по запросу).
 *
 *  ─ KPI row (4 tiles, реальные счётчики из API)
 *  ─ Activity stream (mock) + Heatmap (mock) — двухколоночный r-7-5 на >1280px
 *  ─ Staff grid (реальные мастера, синтетический live-статус)
 *
 * Font: JetBrains Mono на весь content (user-override 2026-05-17, см.
 * SESSION_LOG). Rail/Topbar остаются на RF Rufo — обёртка локальная.
 */
export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-5 font-mono">
      <PageHeader
        title="Dashboard"
        sub="общая сводка по тенанту"
      />

      <KpiRow />

      <section className="grid gap-4 grid-cols-[1.4fr_1fr] max-[1280px]:grid-cols-1">
        <Heatmap />
        <ActivityStream />
      </section>

      <StaffGrid />
    </div>
  );
}
