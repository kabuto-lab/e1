import { getTenantByDomain } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'ROXY — Tokyo nightlife · Moscow nights',
  description: 'Закрытая ночная экосистема. Холо-залы, неоновые силуэты, синтвейв.',
};

export default function RoxySpaPage() {
  return <TenantSiteShell tenant={getTenantByDomain('roxy-spa.ru')} />;
}
