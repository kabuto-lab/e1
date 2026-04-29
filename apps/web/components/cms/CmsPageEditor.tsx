'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Trash2, Globe, Lock, ExternalLink } from 'lucide-react';
import { TipTapEditor } from './TipTapEditor';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { apiUrl } from '@/lib/api-url';

const RU_MAP: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function slugify(text: string): string {
  return text.toLowerCase()
    .split('').map((c) => RU_MAP[c] ?? c).join('')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const t = localStorage.getItem('accessToken')?.replace(/^"|"$/g, '').replace(/^Bearer\s+/i, '');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface CmsPageData {
  id?: string;
  type: string;
  title: string;
  slug: string;
  content?: object | null;
  excerpt?: string;
  status: string;
  publishedAt?: string | null;
  updatedAt?: string;
}

interface CmsPageEditorProps {
  /** undefined = create mode */
  pageId?: string;
  initialType?: string;
}

export function CmsPageEditor({ pageId, initialType = 'page' }: CmsPageEditorProps) {
  const router = useRouter();
  const { isWpAdmin } = useDashboardTheme();
  const t = dashboardTone(isWpAdmin);
  const L = isWpAdmin;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState<object | null>(null);
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState('draft');
  const [type] = useState(initialType);
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pageData, setPageData] = useState<CmsPageData | null>(null);
  const [loading, setLoading] = useState(!!pageId);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Load existing page
  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    fetch(apiUrl(`/cms/pages/${pageId}`), { headers: authHeaders() })
      .then((r) => r.json())
      .then((data: CmsPageData) => {
        setPageData(data);
        setTitle(data.title);
        setSlug(data.slug);
        setContent(data.content ?? null);
        setExcerpt(data.excerpt ?? '');
        setStatus(data.status);
        setSlugManual(true);
      })
      .catch(() => setSaveError('Не удалось загрузить страницу'))
      .finally(() => setLoading(false));
  }, [pageId]);

  // Auto-derive slug from title (only if slug not manually edited)
  useEffect(() => {
    if (!slugManual && title) setSlug(slugify(title));
  }, [title, slugManual]);

  const save = useCallback(async (targetStatus?: string) => {
    const resolvedStatus = targetStatus ?? status;
    setSaving(true);
    setSaveError(null);
    try {
      const body = { title, slug, content, excerpt, status: resolvedStatus, type };
      const isCreate = !pageId && !pageData?.id;
      const id = pageId ?? pageData?.id;

      const res = await fetch(
        apiUrl(isCreate ? '/cms/pages' : `/cms/pages/${id}`),
        {
          method: isCreate ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(Array.isArray(err.message) ? err.message[0] : err.message ?? `HTTP ${res.status}`);
      }

      const saved: CmsPageData = await res.json();
      setPageData(saved);
      setStatus(saved.status);
      if (isCreate) {
        router.replace(`/dashboard/pages/${saved.id}/edit`);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }, [title, slug, content, excerpt, status, type, pageId, pageData, router]);

  const handleDelete = useCallback(async () => {
    const id = pageId ?? pageData?.id;
    if (!id) return;
    if (!confirm('Удалить страницу? Действие необратимо.')) return;
    await fetch(apiUrl(`/cms/pages/${id}`), { method: 'DELETE', headers: authHeaders() });
    router.push('/dashboard/pages');
  }, [pageId, pageData, router]);

  const typeLabel = type === 'post' ? 'Запись' : 'Страница';
  const isDraft = status === 'draft';
  const isPublished = status === 'published';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className={`h-8 w-8 animate-spin rounded-full border-2 ${L ? 'border-[#2271b1]/30 border-t-[#2271b1]' : 'border-[#d4af37]/30 border-t-[#d4af37]'}`} />
      </div>
    );
  }

  return (
    <div className={`-m-4 lg:-m-6 lg:-mr-8 flex flex-col min-h-dvh ${L ? 'bg-[#f0f0f1]' : 'bg-[#0a0a0a]'}`}>
      {/* ── Top bar ── */}
      <div className={`sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 ${
        L ? 'border-[#c3c4c7] bg-[#23282d]' : 'border-white/[0.08] bg-[#111]'
      }`}>
        <Link
          href="/dashboard/pages"
          className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
            L ? 'text-[#a0a5aa] hover:text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Все страницы
        </Link>

        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
          L ? 'bg-[#32373c] text-[#a0a5aa]' : 'bg-white/[0.06] text-white/40'
        }`}>
          {typeLabel}
        </span>

        <div className="flex-1" />

        {saveError && (
          <span className="font-body text-xs text-red-400">{saveError}</span>
        )}

        <span className={`font-body text-xs ${L ? 'text-[#a0a5aa]' : 'text-white/30'}`}>
          {saving ? 'Сохранение…' : isPublished ? 'Опубликовано' : 'Черновик'}
        </span>

        {isPublished ? (
          <>
            <button
              type="button"
              onClick={() => save('draft')}
              disabled={saving}
              className={`${t.btnSecondary} h-8 px-3 py-0 text-xs`}
            >
              Снять с публикации
            </button>
            <button
              type="button"
              onClick={() => save('published')}
              disabled={saving}
              className={`${L
                ? 'inline-flex items-center gap-1.5 rounded border border-[#2271b1] bg-[#2271b1] px-3 py-1.5 text-xs text-white hover:bg-[#135e96] disabled:opacity-50'
                : 'inline-flex items-center gap-1.5 rounded bg-[#d4af37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#c4a030] disabled:opacity-50'
              }`}
            >
              Обновить
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => save('draft')}
              disabled={saving}
              className={`${t.btnSecondary} h-8 px-3 py-0 text-xs`}
            >
              Сохранить черновик
            </button>
            <button
              type="button"
              onClick={() => save('published')}
              disabled={saving}
              className={`${L
                ? 'inline-flex items-center gap-1.5 rounded border border-[#2271b1] bg-[#2271b1] px-3 py-1.5 text-xs text-white hover:bg-[#135e96] disabled:opacity-50'
                : 'inline-flex items-center gap-1.5 rounded bg-[#d4af37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#c4a030] disabled:opacity-50'
              }`}
            >
              Опубликовать
            </button>
          </>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main editor area */}
        <div className={`flex-1 overflow-y-auto px-8 py-8 ${L ? 'bg-[#f0f0f1]' : ''}`}>
          <div className="mx-auto max-w-3xl">
            {/* Title */}
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              placeholder="Добавить заголовок"
              rows={1}
              className={`mb-4 w-full resize-none overflow-hidden border-0 bg-transparent text-4xl font-bold leading-tight outline-none placeholder:opacity-30 ${
                L ? 'font-[system-ui] text-[#1d2327] placeholder:text-[#1d2327]' : 'font-display text-white'
              }`}
              style={{ minHeight: '3rem' }}
            />

            <div className={`mb-6 h-px ${L ? 'bg-[#c3c4c7]' : 'bg-white/[0.08]'}`} />

            {/* TipTap editor */}
            <div className={`rounded-lg border ${L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.08] bg-[#141414]'}`}>
              <TipTapEditor
                key={pageId ?? 'new'}
                content={content}
                onChange={setContent}
                isWpAdmin={isWpAdmin}
                placeholder="Начните писать здесь…"
              />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className={`w-72 shrink-0 overflow-y-auto border-l ${L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.08] bg-[#141414]'}`}>
          {/* Status & visibility */}
          <div className={`border-b ${L ? 'border-[#c3c4c7]' : 'border-white/[0.08]'}`}>
            <div className={`flex items-center justify-between px-4 py-3 ${L ? 'bg-[#f6f7f7]' : 'bg-white/[0.03]'}`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${L ? 'text-[#50575e]' : 'text-white/40'}`}>
                Публикация
              </span>
            </div>
            <div className="space-y-3 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs ${L ? 'text-[#50575e]' : 'text-white/50'}`}>Видимость</span>
                <span className={`flex items-center gap-1 text-xs font-medium ${L ? 'text-[#2c3338]' : 'text-white'}`}>
                  <Globe className="h-3.5 w-3.5" />
                  Публичная
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${L ? 'text-[#50575e]' : 'text-white/50'}`}>Статус</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`rounded border px-2 py-0.5 text-xs ${
                    L ? 'border-[#8c8f94] bg-white text-[#2c3338]' : 'border-white/15 bg-black/40 text-white/80'
                  }`}
                >
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликовано</option>
                  <option value="trash">Корзина</option>
                </select>
              </div>
              {pageData?.updatedAt && (
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${L ? 'text-[#50575e]' : 'text-white/50'}`}>Изменено</span>
                  <span className={`text-xs ${L ? 'text-[#646970]' : 'text-white/35'}`}>
                    {new Date(pageData.updatedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
            </div>
            <div className={`flex items-center gap-2 border-t px-4 py-2.5 ${L ? 'border-[#c3c4c7] bg-[#f6f7f7]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              {pageData?.id && (
                <a
                  href={`/p/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 text-xs font-medium ${L ? 'text-[#2271b1] hover:underline' : 'text-[#d4af37] hover:underline'}`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Просмотр
                </a>
              )}
              {pageData?.id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`ml-auto text-xs ${L ? 'text-[#d63638] hover:underline' : 'text-red-400 hover:underline'}`}
                >
                  В корзину
                </button>
              )}
            </div>
          </div>

          {/* Permalink */}
          <div className={`border-b ${L ? 'border-[#c3c4c7]' : 'border-white/[0.08]'}`}>
            <div className={`flex items-center justify-between px-4 py-3 ${L ? 'bg-[#f6f7f7]' : 'bg-white/[0.03]'}`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${L ? 'text-[#50575e]' : 'text-white/40'}`}>
                Адрес страницы
              </span>
            </div>
            <div className="space-y-2 px-4 py-3">
              <div className={`flex items-center gap-1 rounded px-2 py-1 font-mono text-[11px] ${L ? 'bg-[#f6f7f7] text-[#646970]' : 'bg-black/30 text-white/35'}`}>
                /p/
                <span className={L ? 'text-[#2271b1]' : 'text-[#d4af37]'}>{slug || '—'}</span>
                {slug && pageData?.status === 'published' && (
                  <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer" className="ml-auto">
                    <ExternalLink className={`h-3 w-3 ${L ? 'text-[#2271b1]' : 'text-[#d4af37]'}`} />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                placeholder="url-адрес"
                className={`${t.input} font-mono text-xs`}
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <div className={`flex items-center justify-between px-4 py-3 ${L ? 'bg-[#f6f7f7]' : 'bg-white/[0.03]'}`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${L ? 'text-[#50575e]' : 'text-white/40'}`}>
                Краткое описание
              </span>
            </div>
            <div className="px-4 py-3">
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Краткое описание для SEO и превью…"
                rows={3}
                className={`${t.textarea} text-xs`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
