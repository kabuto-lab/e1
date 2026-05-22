'use client';

/**
 * /admin/cms/[id]?tenant=<slug> — редактирование существующей CMS-страницы в ED.
 *
 * Загружает страницу по id (getPage — с auth + X-Tenant-Slug), затем хостит
 * `EditorHost` в режиме edit. tenant берётся из `?tenant=` — тот же контракт,
 * что у `/admin/cms/new`.
 */
import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { getPage, type CmsPageDTO } from '@/lib/cms-api';
import { EditorHost } from '@/components/cms/ed-editor/EditorHost';

export default function EditCmsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-mute">loading…</div>}>
      <EditCmsPageInner />
    </Suspense>
  );
}

function EditCmsPageInner() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const tenantSlug = useSearchParams().get('tenant')?.trim() ?? '';

  const [page, setPage] = useState<CmsPageDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !tenantSlug) return;
    let cancelled = false;
    getPage(id, tenantSlug)
      .then((p) => {
        if (!cancelled) setPage(p);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? (err.body.message ?? `HTTP ${err.status}`) : String(err),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, tenantSlug]);

  if (!id || !tenantSlug) {
    return (
      <div className="p-8 text-sm text-text-mute">
        Нужны id страницы и тенант:{' '}
        <code className="font-mono">/admin/cms/&lt;id&gt;?tenant=&lt;slug&gt;</code>
      </div>
    );
  }
  if (error) return <div className="p-8 text-sm text-red-300">{error}</div>;
  if (!page) return <div className="p-8 text-sm text-text-mute">Загрузка страницы…</div>;

  return <EditorHost mode="edit" tenantSlug={tenantSlug} initialPage={page} />;
}
