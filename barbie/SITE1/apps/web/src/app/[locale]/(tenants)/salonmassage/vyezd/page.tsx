/**
 * (tenants)/salonmassage/vyezd — сквозной глобальный раздел «Выезд» (Class-G).
 */
import { SmGlobalPage } from '@/components/tenant-sites/salonmassage/SmGlobalPage';

export const metadata = { title: 'Выезд — Salon Massage' };

export default function Page() {
  return (
    <SmGlobalPage
      base="salonmassage"
      kicker="К вам"
      title="Выезд"
      lead="Выезд мастера к вам — на дом или в отель. Уточните адрес и удобное время, диспетчер согласует выезд."
      cta="Заказать выезд"
    />
  );
}
