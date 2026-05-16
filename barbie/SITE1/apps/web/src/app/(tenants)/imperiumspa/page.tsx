import { getTenantByDomain } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'IMPERIUM — Возвращение к величию',
  description: 'Закрытое собрание. Девять апартаментов. Est. MMXXVI.',
};

export default function ImperiumspaPage() {
  return <TenantSiteShell tenant={getTenantByDomain('imperiumspa.ru')} />;
}
