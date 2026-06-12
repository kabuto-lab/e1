/**
 * (tenants)/salonmassage/vacancies — сквозной глобальный раздел «Вакансии» (Class-G).
 */
import { SmGlobalPage } from '@/components/tenant-sites/salonmassage/SmGlobalPage';

export const metadata = { title: 'Вакансии — Salon Massage' };

export default function Page() {
  return (
    <SmGlobalPage
      base="salonmassage"
      kicker="Карьера"
      title="Вакансии"
      lead="Открыт набор. Достойные условия, гибкий график, конфиденциальность. Свяжитесь с нами, чтобы обсудить детали и записаться на собеседование."
      cta="Откликнуться"
    />
  );
}
