import { getTenantByDomain } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'ETALON — Performance · Discretion · Результат',
  description: 'Закрытая операционная сеть. 12 профайлов, 9 городов. Диспетчер 24/7.',
};

export default function EtalonspaPage() {
  return <TenantSiteShell tenant={getTenantByDomain('etalonspa.ru')} />;
}
