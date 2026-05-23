/**
 * (tenants)/imperiumspa — публичная главная тенанта.
 *
 * M1: рендерит страницу `home`, собранную в ED, через публичный рендерер
 * `EdRenderer`. Если ED-страницы ещё нет / не опубликована — фоллбэк на
 * прежний `TenantSiteShell` (данные из tenants-real-content.json).
 *
 * Тенант пока `imperiumspa` (рейм в sal-nmas — отдельная задача, см. план).
 */
import { fetchPublicTenant } from '@/lib/tenants';
import { fetchPublicCmsPage } from '@/lib/cms-public';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';
import { TenantEditFab } from '@/components/tenant-site/TenantEditFab';
import { EdRenderer, extractEdSections } from '@/components/cms/ed-editor/EdRenderer';

const TENANT_SLUG = 'imperiumspa';

export const metadata = {
  title: 'Salon Massage',
  description: 'Премиальный салон массажа в Москве.',
};

export default async function ImperiumspaPage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;

  // 1. Пытаемся отдать ED-главную (собранную в редакторе).
  // `?td=` overrides в ED-режиме игнорируются — ED-виджеты используют
  // inline-styles, не CSS-vars. Override actionable только для TenantSiteShell.
  const edPage = await fetchPublicCmsPage('home', TENANT_SLUG).catch(() => null);
  if (edPage) {
    const sections = extractEdSections(edPage.body);
    if (sections.length > 0) {
      return (
        <main style={{ background: '#0E0F12', minHeight: '100vh' }}>
          <EdRenderer sections={sections} />
          <TenantEditFab tenantSlug={TENANT_SLUG} />
        </main>
      );
    }
  }

  // 2. Фоллбэк: ED-главной ещё нет — прежний рендер из tenant-данных.
  const tenant = await fetchPublicTenant(TENANT_SLUG);
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
