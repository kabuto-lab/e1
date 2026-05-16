import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'NEBESA — Воздушные ритуалы высшего класса',
  description: 'Студия тишины и пара на 25-м этаже башни «Воздух».',
};

export default async function NebesaspaPage() {
  const tenant = await fetchPublicTenant('nebesaspa');
  return <TenantSiteShell tenant={tenant} />;
}
