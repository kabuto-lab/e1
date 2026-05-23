import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'VANILIA — Тёплый дом для особенных вечеров',
  description: 'Авторский массаж · 7 уютных комнат · Москва.',
};

export default async function FiveMassagePage({ searchParams }: { searchParams: Promise<{ td?: string }> }) {
  const { td } = await searchParams;
  const tenant = await fetchPublicTenant('5massage');
  return <TenantSiteShell tenant={tenant} tdParam={td} />;
}
