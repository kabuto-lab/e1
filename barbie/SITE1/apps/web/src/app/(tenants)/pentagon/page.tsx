import { getTenantByDomain } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'PENTAGON — Мужское сопровождение · тактический класс',
  description: 'Закрытое подразделение элитного эскорт-сервиса.',
};

export default function PentagonPage() {
  return <TenantSiteShell tenant={getTenantByDomain('pentagon.ru')} />;
}
