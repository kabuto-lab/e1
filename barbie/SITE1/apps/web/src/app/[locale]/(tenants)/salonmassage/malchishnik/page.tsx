/**
 * (tenants)/salonmassage/malchishnik — сквозной глобальный раздел «Мальчишник» (Class-G).
 */
import { SmGlobalPage } from '@/components/tenant-sites/salonmassage/SmGlobalPage';

export const metadata = { title: 'Мальчишник — Salon Massage' };

export default function Page() {
  return (
    <SmGlobalPage
      base="salonmassage"
      kicker="Особый случай"
      title="Мальчишник"
      lead="Организуем программу мальчишника под ваш сценарий. Состав, продолжительность и детали согласуем заранее — свяжитесь с нами."
      cta="Обсудить программу"
    />
  );
}
