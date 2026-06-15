import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Выезд — OUTCALL' };

export default function VyezdPage() {
  return (
    <TenantGlobalSection
      slug="outcall-massage"
      kicker="К вам"
      title="Выезд"
      lead="Выезд мастера к вам — на дом или в отель, круглосуточно по Москве и области. Уточните адрес и удобное время, диспетчер согласует выезд."
      cta="Заказать выезд"
    />
  );
}
