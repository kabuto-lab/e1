import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Мальчишник — OUTCALL' };

export default function MalchishnikPage() {
  return (
    <TenantGlobalSection
      slug="outcall-massage"
      kicker="Особый случай"
      title="Мальчишник"
      lead="Организуем выездную программу мальчишника под ваш сценарий. Состав, продолжительность и детали согласуем заранее — свяжитесь с нами."
      cta="Обсудить программу"
    />
  );
}
