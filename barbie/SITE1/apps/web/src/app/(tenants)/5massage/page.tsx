import { getTenantByDomain } from '@/lib/tenants';
import { TenantSiteShell } from '@/components/tenant-site/TenantSiteShell';

export const metadata = {
  title: 'VANILIA — Тёплый дом для особенных вечеров',
  description: 'Авторский массаж · 7 уютных комнат · Москва.',
};

export default function FiveMassagePage() {
  return <TenantSiteShell tenant={getTenantByDomain('5massage.ru')} />;
}
