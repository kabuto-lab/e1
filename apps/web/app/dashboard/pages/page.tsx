'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, BookOpen, Pencil, Trash2, Eye, ChevronDown } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { apiUrl } from '@/lib/api-url';

interface CmsPage {
  id: string;
  type: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
  publishedAt?: string | null;
}

function authHeaders(): Record<string, string> {
  const t = typeof window !== 'undefined'
    ? localStorage.getItem('accessToken')?.replace(/^"|"$/g, '').replace(/^Bearer\s+/i, '')
    : undefined;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const STATUS_LABEL: Record<string, string> = {
  published: 'Опубликовано',
  draft: 'Черновик',
  trash: 'Корзина',
};

const STATUS_COLOR: Record<string, string> = {
  published: 'text-green-400',
  draft: 'text-yellow-400/80',
  trash: 'text-red-400/70',
};

export default function DashboardPagesPage() {
  const router = useRouter();
  const { isWpAdmin } = useDashboardTheme();
  const t = dashboardTone(isWpAdmin);
  const L = isWpAdmin;

  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'page' | 'post'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType !== 'all') params.set('type', filterType);
    if (filterStatus !== 'all') params.set('status', filterStatus);

    setLoading(true);
    fetch(apiUrl(`/cms/pages?${params.toString()}`), { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setPages(Array.isArray(data) ? data : []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, [filterType, filterStatus]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить страницу?')) return;
    await fetch(apiUrl(`/cms/pages/${id}`), { method: 'DELETE', headers: authHeaders() });
    setPages((p) => p.filter((pg) => pg.id !== id));
  };

  const pagesCount = pages.filter((p) => p.type === 'page').length;
  const postsCount = pages.filter((p) => p.type === 'post').length;

  return (
    <div className={`space-y-5 ${t.page}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={t.h1}>Страницы</h1>
          <p className={`mt-0.5 text-sm ${t.muted}`}>
            {pagesCount} страниц · {postsCount} записей
          </p>
        </div>

        {/* Create dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className={`${t.btnPrimary} gap-2`}
          >
            <Plus className="h-4 w-4" />
            Создать
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className={`absolute right-0 top-full z-50 mt-1.5 w-44 rounded-lg border shadow-xl ${
              L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.1] bg-[#1e1e1e]'
            }`}>
              <Link
                href="/dashboard/pages/new?type=page"
                onClick={() => setDropdownOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  L ? 'text-[#2c3338] hover:bg-[#f6f7f7]' : 'text-white/80 hover:bg-white/[0.06]'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 opacity-60" />
                Страница
              </Link>
              <Link
                href="/dashboard/pages/new?type=post"
                onClick={() => setDropdownOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  L ? 'text-[#2c3338] hover:bg-[#f6f7f7]' : 'text-white/80 hover:bg-white/[0.06]'
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0 opacity-60" />
                Запись
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'page', 'post'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilterType(v)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterType === v
                ? L ? 'bg-[#2271b1] text-white' : 'bg-[#d4af37] text-black'
                : L ? 'border border-[#c3c4c7] bg-white text-[#50575e] hover:bg-[#f0f0f1]' : 'border border-white/[0.08] text-white/40 hover:text-white'
            }`}
          >
            {{ all: 'Все', page: 'Страницы', post: 'Записи' }[v]}
          </button>
        ))}
        <span className={`mx-1 h-4 w-px ${L ? 'bg-[#c3c4c7]' : 'bg-white/[0.1]'}`} />
        {(['all', 'published', 'draft'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilterStatus(v)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === v
                ? L ? 'bg-[#2271b1] text-white' : 'bg-white/10 text-white'
                : L ? 'border border-[#c3c4c7] bg-white text-[#50575e] hover:bg-[#f0f0f1]' : 'border border-white/[0.08] text-white/40 hover:text-white'
            }`}
          >
            {{ all: 'Все статусы', published: 'Опубликованные', draft: 'Черновики' }[v]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={t.tableWrap}>
        <table className="w-full">
          <thead>
            <tr>
              <th className={t.th}>Заголовок</th>
              <th className={`${t.th} hidden sm:table-cell`}>Тип</th>
              <th className={`${t.th} hidden md:table-cell`}>Адрес</th>
              <th className={t.th}>Статус</th>
              <th className={`${t.th} hidden lg:table-cell`}>Изменено</th>
              <th className={t.th} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className={t.tr}>
                  <td className={t.td} colSpan={6}>
                    <div className={`h-4 w-48 rounded ${L ? 'bg-[#f0f0f1]' : 'bg-white/[0.05]'} animate-pulse`} />
                  </td>
                </tr>
              ))
            ) : pages.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${t.td} py-12 text-center ${t.muted}`}>
                  Страниц нет. Создайте первую.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className={t.tr}>
                  <td className={t.td}>
                    <Link
                      href={`/dashboard/pages/${page.id}/edit`}
                      className={`font-medium ${t.link}`}
                    >
                      {page.title || <span className="opacity-40">Без заголовка</span>}
                    </Link>
                  </td>
                  <td className={`${t.td} hidden sm:table-cell`}>
                    <span className={`text-xs ${t.muted}`}>
                      {page.type === 'post' ? 'Запись' : 'Страница'}
                    </span>
                  </td>
                  <td className={`${t.td} hidden md:table-cell font-mono text-xs ${t.muted}`}>
                    /p/{page.slug}
                  </td>
                  <td className={t.td}>
                    <span className={`text-xs font-medium ${L ? '' : STATUS_COLOR[page.status] ?? 'text-white/40'}`}>
                      {STATUS_LABEL[page.status] ?? page.status}
                    </span>
                  </td>
                  <td className={`${t.td} hidden lg:table-cell text-xs ${t.muted}`}>
                    {new Date(page.updatedAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className={t.td}>
                    <div className="flex items-center justify-end gap-1">
                      {page.status === 'published' && (
                        <a
                          href={`/p/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${L ? 'text-[#646970] hover:bg-[#f0f0f1] hover:text-[#1d2327]' : 'text-white/30 hover:bg-white/[0.06] hover:text-white'}`}
                          title="Открыть"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      )}
                      <Link
                        href={`/dashboard/pages/${page.id}/edit`}
                        className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${L ? 'text-[#646970] hover:bg-[#f0f0f1] hover:text-[#2271b1]' : 'text-white/30 hover:bg-white/[0.06] hover:text-[#d4af37]'}`}
                        title="Редактировать"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(page.id)}
                        className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${L ? 'text-[#646970] hover:bg-[#fcf0f1] hover:text-[#d63638]' : 'text-white/30 hover:bg-red-500/10 hover:text-red-400'}`}
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
