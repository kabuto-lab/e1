import { getTenantByDomain } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'BARBIE SPA — Premium Luxury Couture',
  description: 'Розовый дворец удовольствий в самом сердце города.',
};

export default function BarbiespaPage() {
  return <TenantSiteShell tenant={getTenantByDomain('barbiespa.ru')} />;
}
