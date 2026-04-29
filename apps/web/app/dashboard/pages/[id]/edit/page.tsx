'use client';

import { use } from 'react';
import { CmsPageEditor } from '@/components/cms/CmsPageEditor';

export default function EditCmsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CmsPageEditor pageId={id} />;
}
