'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Globe, Lock, Users, ExternalLink, Trash2, Type, LayoutTemplate, ChevronDown, ChartBarIncreasing, Monitor, Tablet, Smartphone } from 'lucide-react';
import dynamic from 'next/dynamic';
import { TipTapEditor } from './TipTapEditor';

const SandboxPage = dynamic(() => import('@/app/sandbox/page'), { ssr: false });

function isSandboxContent(c: object | null): c is { _type: 'sandbox'; sections: unknown[] } {
  return !!c && '_type' in c && (c as { _type: unknown })._type === 'sandbox';
}
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { apiUrl } from '@/lib/api-url';
import { authFetch } from '@/lib/api-client';

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative flex items-center">
      {children}
      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <div className="whitespace-nowrap rounded bg-[#1a1a1a] px-2 py-1 text-[11px] font-medium text-white shadow-lg ring-1 ring-white/10">
          {label}
        </div>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#1a1a1a]" />
      </div>
    </div>
  );
}

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


type Visibility = 'public' | 'members' | 'private';

interface CmsPageData {
  id?: string;
  type: string;
  title: string;
  slug: string;
  content?: object | null;
  excerpt?: string;
  status: string;
  visibility: Visibility;
  publishedAt?: string | null;
  updatedAt?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
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
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [type] = useState(initialType);
  const [slugManual, setSlugManual] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'tiptap' | 'sandbox'>('tiptap');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [seoOpen, setSeoOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pageData, setPageData] = useState<CmsPageData | null>(null);
  const [loading, setLoading] = useState(!!pageId);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Load existing page
  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    authFetch(apiUrl(`/cms/pages/${pageId}`))
      .then((r) => r.json())
      .then((data: CmsPageData) => {
        setPageData(data);
        setTitle(data.title);
        setSlug(data.slug);
        setContent(data.content ?? null);
        setExcerpt(data.excerpt ?? '');
        setStatus(data.status);
        setVisibility((data.visibility as Visibility) ?? 'public');
        setMetaTitle(data.metaTitle ?? '');
        setMetaDescription(data.metaDescription ?? '');
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
      const body = { title, slug, content, excerpt, status: resolvedStatus, visibility, type, metaTitle: metaTitle || null, metaDescription: metaDescription || null };
      const isCreate = !pageId && !pageData?.id;
      const id = pageId ?? pageData?.id;

      const res = await authFetch(
        apiUrl(isCreate ? '/cms/pages' : `/cms/pages/${id}`),
        {
          method: isCreate ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
  }, [title, slug, content, excerpt, status, visibility, type, metaTitle, metaDescription, pageId, pageData, router]);

  const handleDelete = useCallback(async () => {
    const id = pageId ?? pageData?.id;
    if (!id) return;
    if (!confirm(`Удалить «${title || 'эту страницу'}»? Действие необратимо.`)) return;
    await authFetch(apiUrl(`/cms/pages/${id}`), { method: 'DELETE' });
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
    <div className={`flex flex-col min-h-dvh ${L ? '-m-9 bg-[#f0f0f1]' : '-m-4 lg:-m-6 lg:-mr-8 bg-[#0a0a0a]'}`}>
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

        {pageData?.id && isPublished && (
          <button
            type="button"
            onClick={() => save('draft')}
            disabled={saving}
            className={`${t.btnSecondary} h-7 px-2.5 py-0 text-xs`}
          >
            Снять с публикации
          </button>
        )}

        {pageData?.id && (
          <Tip label="Удалить страницу">
            <button
              type="button"
              onClick={handleDelete}
              className={`rounded p-1.5 transition-colors ${L ? 'text-[#a0a5aa] hover:bg-[#d63638]/10 hover:text-[#d63638]' : 'text-white/25 hover:bg-red-500/10 hover:text-red-400'}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tip>
        )}

        <div className="flex-1" />

        {saveError && (
          <span className="font-body text-xs text-red-400">{saveError}</span>
        )}

        {/* Device mode switcher — only in visual editor mode */}
        {editorMode === 'sandbox' && (
          <div className={`flex items-center rounded border overflow-hidden ${L ? 'border-[#8c8f94]' : 'border-white/15'}`}>
            {([
              { mode: 'desktop', Icon: Monitor, label: 'Десктоп' },
              { mode: 'tablet',  Icon: Tablet,  label: 'Планшет' },
              { mode: 'mobile',  Icon: Smartphone, label: 'Телефон' },
            ] as const).map(({ mode, Icon, label }) => (
              <Tip key={mode} label={label}>
                <button
                  type="button"
                  onClick={() => setDeviceMode(mode)}
                  className={`flex items-center px-2 py-1.5 transition-colors ${
                    deviceMode === mode
                      ? L ? 'bg-[#2271b1] text-white' : 'bg-white/10 text-white'
                      : L ? 'text-[#a0a5aa] hover:text-white hover:bg-white/10' : 'text-white/35 hover:text-white/70'
                  } ${mode !== 'desktop' ? `border-l ${L ? 'border-[#8c8f94]' : 'border-white/15'}` : ''}`}
                >
                  <Icon className="h-3 w-3" />
                </button>
              </Tip>
            ))}
          </div>
        )}

        {saving ? (
          <span className={`font-body text-xs ${L ? 'text-[#a0a5aa]' : 'text-white/30'}`}>Сохранение…</span>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusDropdownOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
                status === 'published'
                  ? L ? 'bg-[#edfaef] text-[#00a32a] hover:bg-[#d7f5dc]' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : status === 'trash'
                    ? L ? 'bg-[#fcf0f1] text-[#d63638] hover:bg-[#fad9da]' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : L ? 'bg-[#fcf9e8] text-[#996800] hover:bg-[#f5edca]' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <span className={`text-[10px] opacity-60 ${L ? '' : ''}`}>статус:</span>
              <span>{status === 'published' ? 'Опубликовано' : status === 'trash' ? 'Корзина' : 'Черновик'}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {statusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
                <div className={`absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded border shadow-lg ${
                  L ? 'border-[#c3c4c7] bg-white' : 'border-white/10 bg-[#1a1a1a]'
                }`}>
                  {([
                    { value: 'draft', label: 'Черновик' },
                    { value: 'published', label: 'Опубликовано' },
                    { value: 'trash', label: 'Корзина' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setStatus(opt.value); setStatusDropdownOpen(false); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                        status === opt.value
                          ? L ? 'bg-[#f0f6fc] font-semibold text-[#2271b1]' : 'bg-white/[0.08] font-semibold text-white'
                          : L ? 'text-[#2c3338] hover:bg-[#f6f7f7]' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        opt.value === 'published' ? 'bg-emerald-500' : opt.value === 'trash' ? 'bg-red-500' : 'bg-amber-400'
                      }`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Editor mode toggle */}
        <div className={`flex items-center rounded border overflow-hidden ${L ? 'border-[#8c8f94]' : 'border-white/15'}`}>
          <button
            type="button"
            onClick={() => setEditorMode('tiptap')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
              editorMode === 'tiptap'
                ? L ? 'bg-[#2271b1] text-white' : 'bg-white/10 text-white'
                : L ? 'text-[#a0a5aa] hover:text-white hover:bg-white/10' : 'text-white/35 hover:text-white/70'
            }`}
          >
            <Type className="h-3 w-3" />
            Редактор
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('sandbox')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors border-l ${
              editorMode === 'sandbox'
                ? L ? 'bg-[#2271b1] text-white border-[#2271b1]' : 'bg-white/10 text-white border-white/15'
                : L ? 'text-[#a0a5aa] hover:text-white hover:bg-white/10 border-[#8c8f94]' : 'text-white/35 hover:text-white/70 border-white/15'
            }`}
          >
            <LayoutTemplate className="h-3 w-3" />
            Визуальный
          </button>
        </div>

        {/* SEO panel toggle */}
        <Tip label="SEO настройки">
          <button
            type="button"
            onClick={() => setSeoOpen((v) => !v)}
            className={`rounded border px-2.5 py-1.5 transition-colors ${
              seoOpen
                ? L ? 'border-[#2271b1] bg-[#2271b1] text-white' : 'border-white/20 bg-white/10 text-white'
                : L ? 'border-[#8c8f94] text-[#a0a5aa] hover:bg-white/10 hover:text-white' : 'border-white/15 text-white/35 hover:text-white/70'
            }`}
          >
            <ChartBarIncreasing className="h-3 w-3" />
          </button>
        </Tip>

        {/* Secondary save (draft only) */}
        {!isPublished && (
          <button
            type="button"
            onClick={() => save('draft')}
            disabled={saving}
            className={`${t.btnSecondary} h-8 px-3 py-0 text-xs`}
          >
            Сохранить черновик
          </button>
        )}

        {/* Divider */}
        <div className={`h-5 w-px ${L ? 'bg-[#c3c4c7]' : 'bg-white/[0.1]'}`} />

        {/* Public link */}
        {pageData?.id && isPublished && visibility === 'public' && (
          <Tip label="Публичная ссылка">
            <a
              href={`/p/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded p-1.5 transition-colors ${L ? 'text-[#a0a5aa] hover:text-[#2271b1]' : 'text-white/30 hover:text-white/70'}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Tip>
        )}

        {/* Preview */}
        {pageData?.id && (
          <Tip label="Предпросмотр">
            <a
              href={`/p/preview/${pageData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded p-1.5 transition-colors ${L ? 'text-[#a0a5aa] hover:bg-[#32373c] hover:text-white' : 'text-white/30 hover:bg-white/[0.06] hover:text-white'}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </a>
          </Tip>
        )}

        {/* Main action */}
        <button
          type="button"
          onClick={() => save('published')}
          disabled={saving}
          className={L
            ? 'inline-flex items-center gap-1.5 rounded border border-[#2271b1] bg-[#2271b1] px-3 py-1.5 text-xs text-white hover:bg-[#135e96] disabled:opacity-50'
            : 'inline-flex items-center gap-1.5 rounded bg-[#d4af37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#c4a030] disabled:opacity-50'
          }
        >
          {isPublished ? 'Обновить' : 'Опубликовать'}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {editorMode === 'sandbox' ? (
          <div className="flex-1 overflow-hidden">
            <SandboxPage
              embedded
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              initialSections={isSandboxContent(content) ? (content.sections as any) : undefined}
              onChange={(sections) => setContent({ _type: 'sandbox', sections })}
              deviceMode={deviceMode}
              onDeviceModeChange={setDeviceMode}
            />
          </div>
        ) : (
        <>
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
          {seoOpen ? (
            <>
              <div className={`flex items-center justify-between px-4 py-3 ${L ? 'bg-[#f6f7f7]' : 'bg-white/[0.03]'}`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${L ? 'text-[#50575e]' : 'text-white/40'}`}>SEO</span>
              </div>
              <div className="space-y-4 px-4 py-4">
                <div>
                  <label className={`mb-1.5 block text-xs font-medium ${L ? 'text-[#50575e]' : 'text-white/50'}`}>
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={title || 'Заголовок страницы…'}
                    maxLength={70}
                    className={`${t.input} text-xs`}
                  />
                  <span className={`mt-1 block text-right text-[10px] ${metaTitle.length > 60 ? 'text-amber-400' : L ? 'text-[#646970]' : 'text-white/25'}`}>
                    {metaTitle.length}/70
                  </span>
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-medium ${L ? 'text-[#50575e]' : 'text-white/50'}`}>
                    Meta Description
                  </label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder={excerpt || 'Краткое описание для поисковиков…'}
                    rows={4}
                    maxLength={160}
                    className={`${t.textarea} text-xs`}
                  />
                  <span className={`mt-1 block text-right text-[10px] ${metaDescription.length > 140 ? 'text-amber-400' : L ? 'text-[#646970]' : 'text-white/25'}`}>
                    {metaDescription.length}/160
                  </span>
                </div>
                <div className={`rounded border p-3 text-[11px] ${L ? 'border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e]' : 'border-white/[0.08] bg-black/20 text-white/35'}`}>
                  <div className={`mb-1 font-medium ${L ? 'text-[#2271b1]' : 'text-[#d4af37]/80'}`}>
                    {metaTitle || title || 'Заголовок страницы'}
                  </div>
                  <div className={`text-[10px] ${L ? 'text-[#00a32a]' : 'text-emerald-500/70'}`}>
                    lovnge.ru/p/{slug || '…'}
                  </div>
                  <div className="mt-0.5 line-clamp-2">
                    {metaDescription || excerpt || 'Описание страницы появится здесь…'}
                  </div>
                </div>
              </div>
            </>
          ) : (
          <>
          {/* Status & visibility */}
          <div className={`border-b ${L ? 'border-[#c3c4c7]' : 'border-white/[0.08]'}`}>
            <div className={`flex items-center justify-between px-4 py-3 ${L ? 'bg-[#f6f7f7]' : 'bg-white/[0.03]'}`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${L ? 'text-[#50575e]' : 'text-white/40'}`}>
                Публикация
              </span>
            </div>
            <div className="space-y-3 px-4 py-3">
              {/* Visibility */}
              <div>
                <span className={`mb-1.5 block text-xs ${L ? 'text-[#50575e]' : 'text-white/50'}`}>Видимость</span>
                <div className={`flex flex-col gap-1 rounded border p-2 ${L ? 'border-[#c3c4c7] bg-[#f6f7f7]' : 'border-white/[0.08] bg-black/20'}`}>
                  {(
                    [
                      { value: 'public', label: 'Публичная', sub: 'Виден всем', Icon: Globe },
                      { value: 'members', label: 'Участники', sub: 'Только зарегистрированным', Icon: Users },
                      { value: 'private', label: 'Приватная', sub: 'Только администраторам', Icon: Lock },
                    ] as const
                  ).map(({ value, label, sub, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVisibility(value)}
                      className={`flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${
                        visibility === value
                          ? L
                            ? 'bg-[#2271b1]/10 text-[#2271b1]'
                            : 'bg-[#d4af37]/10 text-[#d4af37]'
                          : L
                            ? 'text-[#50575e] hover:bg-black/5'
                            : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">
                        <span className="block text-xs font-medium">{label}</span>
                        <span className={`block text-[10px] ${L ? 'text-[#646970]' : 'text-white/30'}`}>{sub}</span>
                      </span>
                      {visibility === value && (
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${L ? 'bg-[#2271b1]' : 'bg-[#d4af37]'}`} />
                      )}
                    </button>
                  ))}
                </div>
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
          </>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
