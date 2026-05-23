import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'ETALON — Performance · Discretion · Результат',
  description: 'Закрытая операционная сеть. 12 профайлов, 9 городов. Диспетчер 24/7.',
};

export default async function EtalonspaPage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;
  const tenant = await fetchPublicTenant('etalonspa');
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
