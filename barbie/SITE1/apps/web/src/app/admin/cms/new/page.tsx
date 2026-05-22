'use client';

/**
 * /admin/cms/new?tenant=<slug> — создание CMS-страницы через ED-editor.
 *
 * Тонкая обёртка: резолвит tenant из query-параметра и хостит `EditorHost`
 * в режиме create. Вся логика редактора/сохранения — в `EditorHost`.
 * Редактирование существующей страницы — `/admin/cms/[id]`.
 */
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EditorHost } from '@/components/cms/ed-editor/EditorHost';

export default function NewCmsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-mute">loading…</div>}>
      <NewCmsPageInner />
    </Suspense>
  );
}

function NewCmsPageInner() {
  const tenantSlug = useSearchParams().get('tenant')?.trim() ?? '';

  if (!tenantSlug) {
    return (
      <div className="p-8 text-sm text-text-mute">
        Укажи тенант в адресе: <code className="font-mono">/admin/cms/new?tenant=&lt;slug&gt;</code>
      </div>
    );
  }

  return <EditorHost mode="create" tenantSlug={tenantSlug} />;
}
