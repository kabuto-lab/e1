import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Мальчишник — SOHO' };

export default function MalchishnikPage() {
  return (
    <TenantGlobalSection
      slug="soho-spa"
      kicker="Особый случай"
      title="Мальчишник"
      lead="Организуем программу мальчишника под ваш сценарий. Состав, продолжительность и детали согласуем заранее — свяжитесь с нами."
      cta="Обсудить программу"
    />
  );
}
