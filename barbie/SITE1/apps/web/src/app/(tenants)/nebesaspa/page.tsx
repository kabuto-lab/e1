import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'NEBESA — Воздушные ритуалы высшего класса',
  description: 'Студия тишины и пара на 25-м этаже башни «Воздух».',
};

export default async function NebesaspaPage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;
  const tenant = await fetchPublicTenant('nebesaspa');
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
