import { Suspense } from 'react';
import { CmsEditorNewWrapper } from './CmsEditorNewWrapper';

export default function NewCmsPage() {
  return (
    <Suspense>
      <CmsEditorNewWrapper />
    </Suspense>
  );
}
