import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Вакансии — OUTCALL' };

export default function VacanciesPage() {
  return (
    <TenantGlobalSection
      slug="outcall-massage"
      kicker="Карьера"
      title="Вакансии"
      lead="Открыт набор. Достойные условия, гибкий график, конфиденциальность. Свяжитесь с нами, чтобы обсудить детали и записаться на собеседование."
      cta="Откликнуться"
    />
  );
}
