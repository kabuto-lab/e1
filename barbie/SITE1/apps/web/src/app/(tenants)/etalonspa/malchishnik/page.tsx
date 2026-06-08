import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Мальчишник — ETALON' };

export default function MalchishnikPage() {
  return (
    <TenantGlobalSection
      slug="etalonspa"
      kicker="Особый случай"
      title="Мальчишник"
      lead="Организуем программу мальчишника под ваш сценарий. Состав, продолжительность и детали согласуем заранее — свяжитесь с нами."
      cta="Обсудить программу"
    />
  );
}
