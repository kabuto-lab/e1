'use client';

import { useSearchParams } from 'next/navigation';
import { CmsPageEditor } from '@/components/cms/CmsPageEditor';

export function CmsEditorNewWrapper() {
  const params = useSearchParams();
  const type = params?.get('type') ?? 'page';
  return <CmsPageEditor initialType={type} />;
}
