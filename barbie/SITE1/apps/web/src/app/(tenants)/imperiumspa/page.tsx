import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'IMPERIUM — Возвращение к величию',
  description: 'Закрытое собрание. Девять апартаментов. Est. MMXXVI.',
};

export default async function ImperiumspaPage() {
  const tenant = await fetchPublicTenant('imperiumspa');
  return <TenantSiteShell tenant={tenant} />;
}
