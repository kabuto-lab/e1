import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Мальчишник — ROXY' };

export default function MalchishnikPage() {
  return (
    <TenantGlobalSection
      slug="roxy-spa"
      kicker="Особый случай"
      title="Мальчишник"
      lead="Организуем программу мальчишника под ваш сценарий. Состав, продолжительность и детали согласуем заранее — свяжитесь с нами."
      cta="Обсудить программу"
    />
  );
}
