import { getTenantByDomain } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'SOHO — Артистический бутик-салон · Москва · с 2018',
  description: 'Особняк начала XX века на Чистопрудном бульваре. Сезон Зима MMXXVI.',
};

export default function SohoSpaPage() {
  return <TenantSiteShell tenant={getTenantByDomain('soho-spa.com')} />;
}
