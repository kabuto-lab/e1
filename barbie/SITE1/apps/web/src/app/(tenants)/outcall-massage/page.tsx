import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'OUTCALL — Выездной массаж · Москва и область',
  description: 'Выездной массаж · мастер приедет к вам · на дом или в отель · круглосуточно.',
};

export default async function OutcallMassagePage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;
  const tenant = await fetchPublicTenant('outcall-massage');
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
