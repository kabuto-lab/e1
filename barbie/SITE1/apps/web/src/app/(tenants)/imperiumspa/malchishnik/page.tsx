/**
 * (tenants)/imperiumspa/malchishnik — сквозной глобальный раздел «Мальчишник»
 * (Class-G, одинаков на всех салонах). Контент пока статичный — см. TODO в
 * SmGlobalPage (вынос в NAS-управляемое глобальное хранилище).
 */
import { SmGlobalPage } from '@/components/tenant-sites/salonmassage/SmGlobalPage';

export const metadata = { title: 'Мальчишник — Salon Massage' };

export default function MalchishnikPage() {
  return (
    <SmGlobalPage
      kicker="Особый случай"
      title="Мальчишник"
      lead="Организуем программу мальчишника под ваш сценарий. Состав, продолжительность и детали согласуем заранее — свяжитесь с нами."
      cta="Обсудить программу"
    />
  );
}
