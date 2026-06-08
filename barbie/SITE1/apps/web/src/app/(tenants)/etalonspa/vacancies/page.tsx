import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Вакансии — ETALON' };

export default function VacanciesPage() {
  return (
    <TenantGlobalSection
      slug="etalonspa"
      kicker="Карьера"
      title="Вакансии"
      lead="Открыт набор. Достойные условия, гибкий график, конфиденциальность. Свяжитесь с нами, чтобы обсудить детали и записаться на собеседование."
      cta="Откликнуться"
    />
  );
}
