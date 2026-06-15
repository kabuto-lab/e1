import { fetchPublicTenant } from '@/lib/tenants';
import { BarbiePrograms } from '@/components/tenant-sites/barbiespa/BarbiePrograms';

export const metadata = {
  title: 'Программы — BARBIE SPA · салон эротического массажа в Москве',
  description:
    'Программы салона Barbie Spa: основные, VIP, для пар, для девушек, Delux и дополнения. Цены и длительность.',
};

/**
 * (tenants)/barbiespa/programmy — страница «Программы» тенанта barbiespa
 * (порт barbie/barbiespa/programmy.html). Часть bespoke-сайта BARBIE SPA.
 */
export default async function BarbiespaProgramsPage() {
  const tenant = await fetchPublicTenant('barbiespa').catch(() => null);
  const phone = tenant?.phones?.[0];
  return (
    <BarbiePrograms
      phone={phone}
      phoneHref={phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : undefined}
    />
  );
}
