import { getTranslations } from 'next-intl/server';
import { TenantGlobalSection } from '@/components/tenant-site/TenantGlobalSection';

export const metadata = { title: 'Мальчишник — NEBESA' };

export default async function MalchishnikPage() {
  const t = await getTranslations('nebesa');

  return (
    <TenantGlobalSection
      slug="nebesaspa"
      kicker={t('malchishnik.kicker')}
      title={t('malchishnik.title')}
      lead={t('malchishnik.lead')}
      cta={t('malchishnik.cta')}
    />
  );
}
