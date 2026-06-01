/**
 * (tenants)/imperiumspa — публичная главная тенанта.
 *
 * M1: рендерит страницу `home`, собранную в ED, через публичный рендерер
 * `EdRenderer`. Если ED-страницы ещё нет / не опубликована — фоллбэк на
 * прежний `TenantSiteShell` (данные из tenants-real-content.json).
 *
 * Φ2: обе ветки оборачиваются в `TenantBrandShell` — инжекция brand-kit
 * CSS-vars (--bg / --acc-color / --head-font / …) применяется и к ED-странице,
 * и к legacy-секциям. Смена цвета в /admin/projects → весь сайт перекрашивается.
 */
import { fetchPublicTenant } from '@/lib/tenants';
import { fetchPublicCmsPage } from '@/lib/cms-public';
import { decodeTdParam } from '@/lib/td-overrides';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';
import { TenantBrandShell } from '@/components/tenant-site/TenantBrandShell';
import { TenantEditFab } from '@/components/tenant-site/TenantEditFab';
import { Models } from '@/components/tenant-site/sections/Models';
import { EdRenderer, extractEdSections } from '@/components/cms/ed-editor/EdRenderer';

const TENANT_SLUG = 'imperiumspa';

export const metadata = {
  title: 'Salon Massage',
  description: 'Премиальный салон массажа в Москве.',
};

export default async function ImperiumspaPage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;

  // Tenant fetch нужен в обеих ветках — для brand-kit (ED) и для shell (fallback).
  const [tenant, edPage] = await Promise.all([
    fetchPublicTenant(TENANT_SLUG),
    fetchPublicCmsPage('home', TENANT_SLUG).catch(() => null),
  ]);

  const overrides = decodeTdParam(td);
  const dt = overrides ? { ...tenant.designTokens, ...overrides } : tenant.designTokens;

  // 1. Пытаемся отдать ED-главную (собранную в редакторе).
  if (edPage) {
    const sections = extractEdSections(edPage.body);
    if (sections.length > 0) {
      return (
        <TenantBrandShell designTokens={dt} wrapperClassName="min-h-screen">
          <EdRenderer sections={sections} tenant={tenant} />
          {/* Ростер моделей из NAS-каталога — рендерится под ED-главной
              (ED-страница его не содержит; данные по slug тенанта). */}
          <Models tenant={tenant} />
          <TenantEditFab tenantSlug={TENANT_SLUG} />
        </TenantBrandShell>
      );
    }
  }

  // 2. Фоллбэк: ED-главной ещё нет — прежний рендер из tenant-данных.
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
