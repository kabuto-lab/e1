import { fetchPublicTenant } from '@/lib/tenants';
import { fetchPublicGirls } from '@/lib/public-girls-api';
import { NebesaHome } from '@/components/tenant-sites/nebesa/NebesaHome';

export const metadata = {
  title: 'NEBOSVOD — спа-салон эротического массажа в Москве · nebesaspa.com',
  description:
    'Спа-салон эротического массажа Небосвод у м. Бауманская. Программы релакса, выезд, реальные анкеты. Работаем по предварительной записи.',
};

/**
 * (tenants)/nebesaspa — bespoke-реплика прототипа NEBOSVOD
 * (barbie/NON_PROJECT/nebosvod-landing.html), рендерится NebesaHome. Контент снят
 * с nebesaspa.com; ростер девушек — из NAS-каталога; телефон/адрес — из тенанта.
 */
export default async function NebesaspaPage() {
  const [tenant, girlsRes] = await Promise.all([
    fetchPublicTenant('nebesaspa').catch(() => null),
    fetchPublicGirls('nebesaspa').catch(() => ({ data: [], total: 0 })),
  ]);

  const phone = tenant?.phones?.[0];
  const address = tenant?.address?.street
    ? [tenant.address.city, tenant.address.street].filter(Boolean).join(', ')
    : undefined;

  return (
    <NebesaHome
      girls={girlsRes.data}
      phone={phone}
      phoneHref={phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : undefined}
      address={address}
    />
  );
}
