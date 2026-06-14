import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Выезд — DACHA' };

export default function VyezdPage() {
  return (
    <TenantGlobalSection
      slug="dachaspa"
      kicker="К вам"
      title="Выезд"
      lead="Выезд мастера к вам — на дом или в отель. Уточните адрес и удобное время, диспетчер согласует выезд."
      cta="Заказать выезд"
    />
  );
}
