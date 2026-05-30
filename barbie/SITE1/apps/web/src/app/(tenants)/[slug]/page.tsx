/**
 * (tenants)/[slug] — динамический catch-all для тенант-публики.
 *
 * Φ4 — закрывает дыру: до этого только 10 хардкоженных тенантов имели роуты
 * (`imperiumspa`, `roxy-spa`, …). Новые тенанты, созданные через
 * `/admin/projects/new`, отдавали 404 на публичной странице — что ломало
 * workflow "создал тенант → CMS-страница → опубликовал → посмотрел".
 *
 * Next.js routing precedence: static-сегмент выигрывает у dynamic-сегмента
 * на одном уровне. Значит `/imperiumspa` по-прежнему берёт
 * `(tenants)/imperiumspa/page.tsx`; `/hi1` (новый тенант) — этот файл.
 *
 * Поведение:
 *   - API не нашло тенанта → `notFound()` (стандартный Next 404 page).
 *   - Тенант есть, есть опубликованная ED-страница `home` → рендер ED через
 *     `EdRenderer` в брендкит-обёртке `TenantBrandShell`.
 *   - Тенант есть, главной страницы нет → плейсхолдер с именем бренда.
 */
import { notFound } from 'next/navigation';
import { fetchPublicTenant } from '@/lib/tenants';
import { fetchPublicCmsPage } from '@/lib/cms-public';
import { TenantBrandShell } from '@/components/tenant-site/TenantBrandShell';
import { TenantEditFab } from '@/components/tenant-site/TenantEditFab';
import { EdRenderer, extractEdSections } from '@/components/cms/ed-editor/EdRenderer';

export default async function DynamicTenantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tenant = await fetchPublicTenant(slug).catch(() => null);
  if (!tenant) notFound();

  const edPage = await fetchPublicCmsPage('home', slug).catch(() => null);

  if (edPage) {
    const sections = extractEdSections(edPage.body);
    if (sections.length > 0) {
      return (
        <TenantBrandShell designTokens={tenant.designTokens} wrapperClassName="min-h-screen">
          <EdRenderer sections={sections} tenant={tenant} />
          <TenantEditFab tenantSlug={slug} />
        </TenantBrandShell>
      );
    }
  }

  // Тенант есть, но опубликованной главной ещё нет.
  return (
    <TenantBrandShell designTokens={tenant.designTokens} wrapperClassName="min-h-screen">
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 24px',
          textAlign: 'center',
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 48, margin: 0 }}>{tenant.brand || tenant.name || slug}</h1>
        <p style={{ opacity: 0.6, fontSize: 16, margin: 0 }}>
          Главная страница ещё не опубликована.
        </p>
        <p style={{ opacity: 0.4, fontSize: 13, marginTop: 16 }}>
          /admin/cms/new?tenant={slug}
        </p>
      </div>
      <TenantEditFab tenantSlug={slug} />
    </TenantBrandShell>
  );
}
