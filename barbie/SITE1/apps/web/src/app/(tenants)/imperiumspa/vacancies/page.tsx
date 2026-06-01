/**
 * (tenants)/imperiumspa/vacancies — сквозной глобальный раздел «Вакансии»
 * (Class-G). Контент пока статичный — см. TODO в SmGlobalPage.
 *
 * NB: по content-model вакансии переосмысляются из tenant-scoped wfy_vacancies
 * в глобальные — это отдельная миграция, здесь только публичная витрина.
 */
import { SmGlobalPage } from '@/components/tenant-sites/salonmassage/SmGlobalPage';

export const metadata = { title: 'Вакансии — Salon Massage' };

export default function VacanciesPage() {
  return (
    <SmGlobalPage
      kicker="Карьера"
      title="Вакансии"
      lead="Открыт набор. Достойные условия, гибкий график, конфиденциальность. Свяжитесь с нами, чтобы обсудить детали и записаться на собеседование."
      cta="Откликнуться"
    />
  );
}
