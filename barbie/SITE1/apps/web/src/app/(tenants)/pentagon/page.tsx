import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'PENTAGON — Мужское сопровождение · тактический класс',
  description: 'Закрытое подразделение элитного эскорт-сервиса.',
};

export default async function PentagonPage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;
  const tenant = await fetchPublicTenant('pentagon');
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
