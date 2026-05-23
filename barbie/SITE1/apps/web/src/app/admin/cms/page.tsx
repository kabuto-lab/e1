'use client';

/**
 * /admin/cms?tenant=<slug> — индекс CMS-страниц тенанта.
 *
 * Слева — таблица: slug · title · status · updated. Клик в строку → edit.
 * Сверху — фильтры (статус, search) + «+ Новая страница».
 * Действия: открыть → /admin/cms/<id>, посмотреть публику, архивировать.
 *
 * Tenant берётся из `?tenant=<slug>` (как у /admin/cms/new и [id]). Если
 * параметра нет — показывается подсказка с примером URL.
 */
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, Eye, FilePlus2, Loader2, Search } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { getAuth } from '@/lib/auth';
import {
  listPages,
  archivePage,
  type CmsPageDTO,
  type CmsPageStatus,
} from '@/lib/cms-api';

const STATUSES: { value: CmsPageStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_PILL: Record<CmsPageStatus, string> = {
  draft: 'bg-text-mute/15 text-text-dim',
  published: 'bg-green-500/10 text-green-400',
  archived: 'bg-red-500/10 text-red-400',
};

export default function CmsIndexPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-mute">loading…</div>}>
      <CmsIndexInner />
    </Suspense>
  );
}

function CmsIndexInner() {
  const router = useRouter();
  const tenantSlug = useSearchParams().get('tenant')?.trim() ?? '';

  // Если в URL нет ?tenant — пробуем подставить из auth-сессии (tenant-admin
  // обычно прибинден к одному тенанту). Так клик из rail без параметров
  // работает естественно. Platform-admin без tenant'а увидит подсказку.
  useEffect(() => {
    if (tenantSlug) return;
    const auth = getAuth();
    if (auth?.tenantSlug) {
      router.replace(`/admin/cms?tenant=${encodeURIComponent(auth.tenantSlug)}`);
    }
  }, [tenantSlug, router]);

  const [items, setItems] = useState<CmsPageDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<CmsPageStatus | 'all'>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listPages(tenantSlug, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: q.trim() || undefined,
        limit: 100,
      });
      setItems(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? `HTTP ${err.status}`) : String(err));
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, statusFilter, q]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onArchive(p: CmsPageDTO) {
    if (!window.confirm(`Архивировать страницу «${p.title}» (${p.slug})?`)) return;
    try {
      await archivePage(p.id, tenantSlug);
      setNotice(`Архивировано: ${p.slug}`);
      setTimeout(() => setNotice(null), 3000);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? `HTTP ${err.status}`) : String(err));
    }
  }

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [items],
  );

  if (!tenantSlug) {
    return (
      <div className="p-8 text-sm text-text-mute">
        Укажи тенант в адресе:{' '}
        <code className="font-mono">/admin/cms?tenant=&lt;slug&gt;</code>
        <div className="mt-2 text-xs">
          Например{' '}
          <Link className="text-gold underline" href="/admin/cms?tenant=imperiumspa">
            /admin/cms?tenant=imperiumspa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">CMS-страницы</h1>
          <span className="text-[12px] font-mono text-gold">{tenantSlug}</span>
          <span className="text-[11px] text-text-mute">
            {loading ? '…' : `${total} ${pluralize(total)}`}
          </span>
        </div>
        <Link
          href={`/admin/cms/new?tenant=${encodeURIComponent(tenantSlug)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-gold text-bg font-semibold rounded-md hover:opacity-90"
        >
          <FilePlus2 size={13} /> Новая страница
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
            placeholder="поиск по title / slug"
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
              <th className="text-left px-3 py-2 font-normal">Slug</th>
              <th className="text-left px-3 py-2 font-normal">Title</th>
              <th className="text-left px-3 py-2 font-normal">Locale</th>
              <th className="text-left px-3 py-2 font-normal">Status</th>
              <th className="text-left px-3 py-2 font-normal">Updated</th>
              <th className="text-right px-3 py-2 font-normal w-[160px]">Действия</th>
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
                  Страниц нет. Создай первую →{' '}
                  <Link
                    className="text-gold underline"
                    href={`/admin/cms/new?tenant=${encodeURIComponent(tenantSlug)}`}
                  >
                    Новая страница
                  </Link>
                </td>
              </tr>
            )}
            {sorted.map((p) => {
              const editHref = `/admin/cms/${p.id}?tenant=${encodeURIComponent(tenantSlug)}`;
              const publicHref =
                p.slug === 'home' ? `/${tenantSlug}` : `/${tenantSlug}/${p.slug}`;
              return (
                <tr key={p.id} className="border-t border-line hover:bg-bg-elev transition-colors">
                  <td className="px-3 py-2 font-mono text-[12px]">
                    <Link href={editHref} className="hover:text-gold">
                      {p.slug}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={editHref} className="hover:text-gold">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-text-dim">{p.locale}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md ${STATUS_PILL[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-dim text-[11.5px]">
                    {formatRelative(p.updatedAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <a
                        href={publicHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Посмотреть публичную страницу"
                        className="p-1.5 text-text-dim hover:text-accent-2 transition-colors"
                      >
                        <Eye size={13} />
                      </a>
                      {p.status !== 'archived' && (
                        <button
                          onClick={() => onArchive(p)}
                          title="Архивировать"
                          className="p-1.5 text-text-dim hover:text-red-400 transition-colors"
                        >
                          <Archive size={13} />
                        </button>
                      )}
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

function pluralize(n: number): string {
  const last = n % 10;
  const teens = n % 100 >= 11 && n % 100 <= 14;
  if (teens) return 'страниц';
  if (last === 1) return 'страница';
  if (last >= 2 && last <= 4) return 'страницы';
  return 'страниц';
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
