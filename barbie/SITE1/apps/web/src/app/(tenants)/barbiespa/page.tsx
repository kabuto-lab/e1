import { fetchPublicTenant } from '@/lib/tenants';
import { fetchPublicGirls } from '@/lib/public-girls-api';
import { BarbieSpaHome } from '@/components/tenant-sites/barbiespa/BarbieSpaHome';

export const metadata = {
  title: 'BARBIE SPA — салон эротического массажа в центре Москвы',
  description:
    'Салон эротического массажа Barbie Spa в центре Москвы. Реальные анкеты, программы релакса, конфиденциальность. Работаем 24/7.',
};

/**
 * (tenants)/barbiespa — bespoke-реплика прототипа BARBIE SPA
 * (barbie/barbiespa/index.html), рендерится BarbieSpaHome. Ростер мастеров —
 * из общего NAS-каталога (GET /v1/public/girls?tenant=barbiespa);
 * телефон/адрес — из данных тенанта, иначе дефолты прототипа.
 */
export default async function BarbiespaPage() {
  const [tenant, girlsRes] = await Promise.all([
    fetchPublicTenant('barbiespa').catch(() => null),
    fetchPublicGirls('barbiespa').catch(() => ({ data: [], total: 0 })),
  ]);

  const phone = tenant?.phones?.[0];
  const address = tenant?.address?.street
    ? [tenant.address.city, tenant.address.street].filter(Boolean).join(', ')
    : undefined;

  return (
    <BarbieSpaHome
      girls={girlsRes.data}
      phone={phone}
      phoneHref={phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : undefined}
      address={address}
    />
  );
}
