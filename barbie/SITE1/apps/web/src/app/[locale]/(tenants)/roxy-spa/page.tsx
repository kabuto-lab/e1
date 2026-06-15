import { fetchPublicTenant } from '@/lib/tenants';
import { fetchPublicGirls } from '@/lib/public-girls-api';
import { RoxyHome } from '@/components/tenant-sites/roxy/RoxyHome';

export const metadata = {
  title: 'ROXY — Men\'s Relax Club · эротический массаж в Москве',
  description: 'Салон эротического массажа ROXY. Топовые девушки, программы релакса, VIP-комнаты. Круглосуточно.',
};

/**
 * (tenants)/roxy-spa — bespoke-реплика статического прототипа ROXY
 * (barbie/roxy/index.html), рендерится RoxyHome. Ростер (hero-стрип + мастера)
 * тянется из общего NAS-каталога (GET /v1/public/girls?tenant=roxy-spa);
 * телефон/адрес — из данных тенанта, иначе дефолты прототипа.
 */
export default async function RoxySpaPage() {
  const [tenant, girlsRes] = await Promise.all([
    fetchPublicTenant('roxy-spa').catch(() => null),
    fetchPublicGirls('roxy-spa').catch(() => ({ data: [], total: 0 })),
  ]);

  const phone = tenant?.phones?.[0];
  const address = tenant?.address?.street
    ? [tenant.address.city, tenant.address.street].filter(Boolean).join(', ')
    : undefined;

  return (
    <RoxyHome
      girls={girlsRes.data}
      phone={phone}
      phoneHref={phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : undefined}
      address={address}
    />
  );
}
