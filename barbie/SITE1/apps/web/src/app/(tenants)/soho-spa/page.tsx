import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'SOHO — Артистический бутик-салон · Москва · с 2018',
  description: 'Особняк начала XX века на Чистопрудном бульваре. Сезон Зима MMXXVI.',
};

export default async function SohoSpaPage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;
  const tenant = await fetchPublicTenant('soho-spa');
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
