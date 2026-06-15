import { fetchPublicTenant } from '@/lib/tenants';
import { fetchPublicGirls } from '@/lib/public-girls-api';
import { VaniliaHome } from '@/components/tenant-sites/vanilia/VaniliaHome';

export const metadata = {
  title: 'VANILIA — салон эротического массажа в Москве · 5massage.ru',
  description:
    'Салон эротического массажа Vanilia. Реальные анкеты, программы релакса, выезд. Работаем по предварительной записи, 24/7.',
};

/**
 * (tenants)/5massage — bespoke-реплика статического прототипа VANILIA
 * (barbie/vanilia/index.html), рендерится VaniliaHome. Ростер девушек тянется из
 * общего NAS-каталога (GET /v1/public/girls?tenant=5massage); телефон/адрес — из
 * данных тенанта, иначе дефолты прототипа.
 */
export default async function FiveMassagePage() {
  const [tenant, girlsRes] = await Promise.all([
    fetchPublicTenant('5massage').catch(() => null),
    fetchPublicGirls('5massage').catch(() => ({ data: [], total: 0 })),
  ]);

  const phone = tenant?.phones?.[0];
  const address = tenant?.address?.street
    ? [tenant.address.city, tenant.address.street].filter(Boolean).join(', ')
    : undefined;

  return (
    <VaniliaHome
      girls={girlsRes.data}
      phone={phone}
      phoneHref={phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : undefined}
      address={address}
    />
  );
}
