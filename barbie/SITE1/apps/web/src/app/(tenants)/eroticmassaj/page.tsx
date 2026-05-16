import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'PODIUM — Театр Желания',
  description: 'Авторский салон в Москве с 1999 года. Шесть актрис, шесть художественных языков.',
};

export default async function EroticmassajPage() {
  const tenant = await fetchPublicTenant('eroticmassaj');
  return <TenantSiteShell tenant={tenant} />;
}
