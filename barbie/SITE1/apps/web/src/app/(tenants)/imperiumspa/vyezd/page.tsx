/**
 * (tenants)/imperiumspa/vyezd — сквозной глобальный раздел «Выезд» (Class-G).
 * Контент пока статичный — см. TODO в SmGlobalPage.
 */
import { SmGlobalPage } from '@/components/tenant-sites/salonmassage/SmGlobalPage';

export const metadata = { title: 'Выезд — Salon Massage' };

export default function VyezdPage() {
  return (
    <SmGlobalPage
      kicker="К вам"
      title="Выезд"
      lead="Выезд мастера к вам — на дом или в отель. Уточните адрес и удобное время, диспетчер согласует выезд."
      cta="Заказать выезд"
    />
  );
}
