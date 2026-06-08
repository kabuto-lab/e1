import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Выезд — PARA' };

export default function VyezdPage() {
  return (
    <TenantGlobalSection
      slug="massazh-dlya-par"
      kicker="К вам"
      title="Выезд"
      lead="Выезд мастеров к вам — на дом или в отель, программа для пары. Уточните адрес и удобное время, диспетчер согласует выезд."
      cta="Заказать выезд"
    />
  );
}
