import { getTenantByDomain } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'NEBESA — Воздушные ритуалы высшего класса',
  description: 'Студия тишины и пара на 25-м этаже башни «Воздух».',
};

export default function NebesaspaPage() {
  return <TenantSiteShell tenant={getTenantByDomain('nebesaspa.com')} />;
}
