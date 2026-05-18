'use client';

/**
 * /admin/cms/new?tenant=<slug> — создание CMS-страницы через ED-editor.
 *
 * Хостит SandboxEditor (Elementor-style page builder, 1016 строк, скопировано
 * из escort-platform/apps/web/components/cms/SandboxEditor.tsx; см. README того
 * проекта). Save → POST /v1/cms/pages с body=[{type:'custom', data:{ed: sections}}]
 * в X-Tenant-Slug контексте указанного тенанта.
 *
 * Block-mapping: ED-state (sections×columns×elements) кладётся в один блок
 * type='custom' внутри CmsBlocks union. Текущий public-renderer NAS его не
 * рисует — публикация работает, но рендер требует отдельной задачи (ED-Renderer,
 * который читает `data.ed` и воспроизводит layout). Phase 0 — store-only.
 *
 * Tenant выбирается query-param'ом, фоллбэк — селект-список из /v1/platform/tenants.
 */

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { SandboxEditor, type Section } from '@/components/cms/ed-editor/SandboxEditor';

export default function NewCmsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-mute">loading…</div>}>
      <NewCmsPageInner />
    </Suspense>
  );
}

interface TenantLite {
  id: string;
  slug: string;
  name: string;
}

function NewCmsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialTenant = sp.get('tenant') ?? '';

  const [tenants, setTenants] = useState<TenantLite[]>([]);
  const [tenantSlug, setTenantSlug] = useState(initialTenant);
  const [slug, setSlug] = useState('home');
  const [title, setTitle] = useState('Главная');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Тенант-список для select (только если query-param пустой)
  useEffect(() => {
    if (initialTenant) return;
    apiFetch<{ data: TenantLite[] }>('/v1/platform/tenants?status=active&limit=100')
      .then((r) => setTenants(r.data ?? []))
      .catch(() => {
        /* silent — пользователь может ввести slug вручную */
      });
  }, [initialTenant]);

  const onChange = useCallback((next: Section[]) => {
    setSections(next);
  }, []);

  async function save(publish: boolean) {
    if (!tenantSlug.trim()) {
      setError('Укажи tenant slug');
      return;
    }
    if (!slug.trim() || !title.trim()) {
      setError('Slug и title обязательны');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 1. Create page (status=draft)
      const created = await apiFetch<{ id: string; slug: string }>('/v1/cms/pages', {
        method: 'POST',
        tenantSlug,
        body: {
          slug: slug.trim(),
          locale: 'ru',
          title: title.trim(),
          body: [{ type: 'custom', data: { ed: sections } }],
        },
      });

      // 2. Publish, если попросили
      if (publish) {
        await apiFetch(`/v1/cms/pages/${created.id}/publish`, {
          method: 'POST',
          tenantSlug,
        });
      }

      setStatus(publish ? 'published' : 'draft');
      setNotice(publish ? 'Сохранено и опубликовано' : 'Сохранено как черновик');
      setTimeout(() => {
        router.push(`/admin/projects`);
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body.message ?? `HTTP ${err.status} (${err.body.code ?? 'unknown'})`);
      } else {
        setError(String(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-1px)]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-bg-elev flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[11px] uppercase tracking-widest text-text-mute">ED-editor</div>
          {initialTenant ? (
            <span className="text-[12px] font-mono text-gold">{initialTenant}</span>
          ) : (
            <select
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              className="px-2 py-1 text-[12px] bg-bg border border-line rounded-md outline-none"
            >
              <option value="">— выбрать tenant —</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name} · {t.slug}
                </option>
              ))}
            </select>
          )}
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug страницы"
            className="px-2 py-1 text-[12px] font-mono bg-bg border border-line rounded-md outline-none w-[140px]"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title"
            className="px-2 py-1 text-[12px] bg-bg border border-line rounded-md outline-none w-[220px]"
          />
          {status === 'published' && (
            <span className="text-[10.5px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400">
              published
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notice && (
            <span className="text-[11.5px] text-green-300">{notice}</span>
          )}
          {error && <span className="text-[11.5px] text-red-300">{error}</span>}
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="px-3 py-1.5 text-[12px] bg-bg border border-line rounded-md hover:bg-surface-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : 'Сохранить'}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="px-3 py-1.5 text-[12px] bg-accent text-bg font-semibold rounded-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save size={12} /> Опубликовать
          </button>
        </div>
      </div>

      {/* Editor canvas */}
      <div className="flex-1 overflow-hidden">
        <SandboxEditor embedded initialSections={sections} onChange={onChange} />
      </div>
    </div>
  );
}
