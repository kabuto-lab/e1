import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'BARBIE SPA — Premium Luxury Couture',
  description: 'Розовый дворец удовольствий в самом сердце города.',
};

export default async function BarbiespaPage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;
  const tenant = await fetchPublicTenant('barbiespa');
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
