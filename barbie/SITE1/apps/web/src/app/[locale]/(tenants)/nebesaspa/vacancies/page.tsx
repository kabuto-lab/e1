import { getTranslations } from 'next-intl/server';
import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Вакансии — NEBESA' };

export default async function VacanciesPage() {
  const t = await getTranslations('nebesa');

  return (
    <TenantGlobalSection
      slug="nebesaspa"
      kicker={t('vacancies.kicker')}
      title={t('vacancies.title')}
      lead={t('vacancies.lead')}
      cta={t('vacancies.cta')}
    />
  );
}
