import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Выезд — ETALON' };

export default function VyezdPage() {
  return (
    <TenantGlobalSection
      slug="etalonspa"
      kicker="К вам"
      title="Выезд"
      lead="Выезд мастера к вам — на дом или в отель. Уточните адрес и удобное время, диспетчер согласует выезд."
      cta="Заказать выезд"
    />
  );
}
