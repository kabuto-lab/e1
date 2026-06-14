import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Вакансии — DACHA' };

export default function VacanciesPage() {
  return (
    <TenantGlobalSection
      slug="dachaspa"
      kicker="Карьера"
      title="Вакансии"
      lead="Открыт набор. Достойные условия, гибкий график, конфиденциальность. Свяжитесь с нами, чтобы обсудить детали и записаться на собеседование."
      cta="Откликнуться"
    />
  );
}
