import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'DACHA — Тишина · Свет · Дерево',
  description: 'Загородный ретрит. 62 км от МКАД по Новой Риге.',
};

export default async function DachaspaPage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;
  const tenant = await fetchPublicTenant('dachaspa');
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
