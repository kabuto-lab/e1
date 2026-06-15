/**
 * (tenants)/pentagon/[slug] — публичный SSR-рендер CMS-страниц pentagon
 * (всё что не home). Использует ED-renderer.
 */
import { notFound } from 'next/navigation';
import { fetchPublicCmsPage } from '@/lib/cms-public';
import { EdRenderer, extractEdSections } from '@/components/cms/ed-editor/EdRenderer';
import { TenantEditFab } from '@/components/tenant-site/TenantEditFab';

const TENANT_SLUG = 'pentagon';

export default async function PentagonSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await fetchPublicCmsPage(slug, TENANT_SLUG).catch(() => null);
  if (!page) notFound();
  const sections = extractEdSections(page.body);
  return (
    <main style={{ background: '#0E0F12', minHeight: '100vh' }}>
      <EdRenderer sections={sections} />
      <TenantEditFab tenantSlug={TENANT_SLUG} />
    </main>
  );
}
