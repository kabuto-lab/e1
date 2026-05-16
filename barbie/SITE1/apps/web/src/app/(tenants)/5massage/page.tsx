import { fetchPublicTenant } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'VANILIA — Тёплый дом для особенных вечеров',
  description: 'Авторский массаж · 7 уютных комнат · Москва.',
};

export default async function FiveMassagePage() {
  const tenant = await fetchPublicTenant('5massage');
  return <TenantSiteShell tenant={tenant} />;
}
