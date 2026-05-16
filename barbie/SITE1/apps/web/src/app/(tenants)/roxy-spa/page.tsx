import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'ROXY — Tokyo nightlife · Moscow nights',
  description: 'Закрытая ночная экосистема. Холо-залы, неоновые силуэты, синтвейв.',
};

export default async function RoxySpaPage() {
  const tenant = await fetchPublicTenant('roxy-spa');
  return <TenantSiteShell tenant={tenant} />;
}
