'use client';

/**
 * /admin/tenants — platform-admin страница: список всех тенантов платформы.
 *
 * Не путать с `/admin/projects` (визитки-бренды) — это сугубо административный
 * взгляд: статус, домен, время создания, действия (suspend / restore / archive).
 *
 * Доступ — только platform-admin / platform-support (как и backend endpoint).
 * Tenant-admin'ы при попытке зайти получат 403 от API.
 *
 * Создание новых тенантов — через `/admin/projects/new` wizard (UI там удобнее,
 * с детектом WP/HTML донора). Здесь — только management existing.
 */
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  FilePlus2,
  Loader2,
  Pause,
  Play,
  Search,
} from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import {
  tenantsApi,
  type TenantStatus,
  type TenantSummary,
} from '@/lib/tenants-api';

const STATUSES: { value: TenantStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'suspended', label: 'Приостановленные' },
  { value: 'archived', label: 'Архивные' },
];

const STATUS_PILL: Record<TenantStatus, string> = {
  active: 'bg-green-500/10 text-green-400',
  suspended: 'bg-amber-500/10 text-amber-400',
  archived: 'bg-red-500/10 text-red-400',
};

const STATUS_RU: Record<TenantStatus, string> = {
  active: 'Активен',
  suspended: 'Приостановлен',
  archived: 'В архиве',
};

type SortKey = 'slug' | 'name' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';

export default function TenantsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-mute">loading…</div>}>
      <TenantsPageInner />
    </Suspense>
  );
}

function TenantsPageInner() {
  const [items, setItems] = useState<TenantSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'all'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'createdAt',
    dir: 'desc',
  });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tenantsApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: q.trim() || undefined,
        limit: 200,
      });
      setItems(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? `HTTP ${err.status}`) : String(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q]);

  useEffect(() => {
    reload();
  }, [reload]);

  function flashNotice(text: string): void {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3000);
  }
  function showError(err: unknown): void {
    setError(err instanceof ApiError ? (err.body.message ?? `HTTP ${err.status}`) : String(err));
    window.setTimeout(() => setError(null), 5000);
  }

  async function onToggleSuspend(t: TenantSummary) {
    const next: TenantStatus = t.status === 'suspended' ? 'active' : 'suspended';
    const verb = next === 'active' ? 'разморожен' : 'заморожен';
    if (!window.confirm(`${next === 'active' ? 'Размо' : 'Замо'}розить салон «${t.name}» (${t.slug})?`)) return;
    setBusyId(t.id);
    try {
      await tenantsApi.update(t.id, { status: next });
      flashNotice(`${t.slug} ${verb}`);
      await reload();
    } catch (err) {
      showError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function onArchive(t: TenantSummary) {
    if (
      !window.confirm(
        `Архивировать салон «${t.name}» (${t.slug})?\n\nЭто soft-delete — данные не удаляются, но салон перестаёт обслуживаться. Восстановление возможно через смену статуса.`,
      )
    ) {
      return;
    }
    setBusyId(t.id);
    try {
      await tenantsApi.archive(t.id);
      flashNotice(`${t.slug} архивирован`);
      await reload();
    } catch (err) {
      showError(err);
    } finally {
      setBusyId(null);
    }
  }

  function onSort(key: SortKey) {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: key === 'createdAt' || key === 'updatedAt' ? 'desc' : 'asc' };
    });
  }

  const sorted = useMemo(() => {
    const copy = [...items];
    const mul = sort.dir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      return String(av).localeCompare(String(bv)) * mul;
    });
    return copy;
  }, [items, sort]);

  const counts = useMemo(() => {
    const out: Record<TenantStatus, number> = { active: 0, suspended: 0, archived: 0 };
    for (const t of items) out[t.status] += 1;
    return out;
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Салоны платформы</h1>
          <span className="text-[11px] text-text-mute">
            {loading ? '…' : `${total} всего`}
            {!loading && items.length > 0 && (
              <>
                {' · '}
                <span className="text-green-400">{counts.active} active</span>
                {counts.suspended > 0 && (
                  <>
                    {' · '}
                    <span className="text-amber-400">{counts.suspended} suspended</span>
                  </>
                )}
                {counts.archived > 0 && (
                  <>
                    {' · '}
                    <span className="text-red-400">{counts.archived} archived</span>
                  </>
                )}
              </>
            )}
          </span>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-gold text-bg font-semibold rounded-md hover:opacity-90"
        >
          <FilePlus2 size={13} /> Новый салон
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-surface border border-line rounded-md overflow-hidden">
          {STATUSES.map((s) => {
            const active = statusFilter === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-2.5 py-1 text-[11px] uppercase tracking-widest transition-colors ${
                  active ? 'bg-accent-2/15 text-accent-2' : 'text-text-dim hover:text-text'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-line rounded-md">
          <Search size={12} className="text-text-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="поиск по slug / name"
            className="bg-transparent text-[12px] outline-none w-[220px]"
          />
        </div>

        {notice && <span className="text-[11px] text-green-400">{notice}</span>}
        {error && <span className="text-[11px] text-red-400">{error}</span>}
      </div>

      {/* Table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead className="bg-bg-elev">
            <tr className="text-[10.5px] uppercase tracking-widest text-text-mute">
              <SortableTh sortKey="slug" current={sort} onSort={onSort} label="Slug" />
              <SortableTh sortKey="name" current={sort} onSort={onSort} label="Name" />
              <th className="text-left px-3 py-2 font-normal">Status</th>
              <th className="text-left px-3 py-2 font-normal">Domain</th>
              <SortableTh sortKey="createdAt" current={sort} onSort={onSort} label="Created" />
              <th className="text-right px-3 py-2 font-normal w-[200px]">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-text-mute">
                  <Loader2 size={16} className="inline animate-spin mr-2" /> Загрузка…
                </td>
              </tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-text-mute">
                  Салонов нет. Создайте первый →{' '}
                  <Link className="text-gold underline" href="/admin/projects/new">
                    Новый салон
                  </Link>
                </td>
              </tr>
            )}
            {sorted.map((t) => {
              const isBusy = busyId === t.id;
              const isArchived = t.status === 'archived';
              const publicHref = `/${t.slug}`;
              return (
                <tr key={t.id} className="border-t border-line hover:bg-bg-elev transition-colors">
                  <td className="px-3 py-2 font-mono text-[12px] text-gold">{t.slug}</td>
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md ${STATUS_PILL[t.status]}`}
                    >
                      {STATUS_RU[t.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-dim text-[11.5px]">
                    {t.primaryDomain ?? <span className="text-text-mute">—</span>}
                  </td>
                  <td className="px-3 py-2 text-text-dim text-[11.5px]">
                    {formatRelative(t.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <a
                        href={publicHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Открыть публичный сайт салона"
                        className="p-1.5 text-text-dim hover:text-accent-2 transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <Link
                        href={`/admin/cms?tenant=${encodeURIComponent(t.slug)}`}
                        title="CMS-страницы салона"
                        className="p-1.5 text-text-dim hover:text-accent-2 transition-colors"
                      >
                        <span className="text-[10px] font-mono">CMS</span>
                      </Link>
                      {!isArchived && (
                        <button
                          onClick={() => onToggleSuspend(t)}
                          disabled={isBusy}
                          title={t.status === 'suspended' ? 'Разморозить' : 'Заморозить'}
                          className="p-1.5 text-text-dim hover:text-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {t.status === 'suspended' ? <Play size={13} /> : <Pause size={13} />}
                        </button>
                      )}
                      {!isArchived && (
                        <button
                          onClick={() => onArchive(t)}
                          disabled={isBusy}
                          title="Архивировать (soft-delete)"
                          className="p-1.5 text-text-dim hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Archive size={13} />
                        </button>
                      )}
                      {isBusy && <Loader2 size={13} className="animate-spin text-text-mute" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SortableThProps {
  sortKey: SortKey;
  current: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  label: string;
}

function SortableTh({ sortKey, current, onSort, label }: SortableThProps) {
  const active = current.key === sortKey;
  const Icon = !active ? ArrowUpDown : current.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className="text-left px-3 py-2 font-normal">
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-widest text-[10.5px] hover:text-text transition-colors ${
          active ? 'text-text' : 'text-text-mute'
        }`}
      >
        {label}
        <Icon size={11} className={active ? '' : 'opacity-50'} />
      </button>
    </th>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}
