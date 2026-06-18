import { fetchPublicGirls } from '@/lib/public-girls-api';
import { BarbieArticleShell } from '@/components/tenant-sites/barbiespa/BarbieArticleShell';
import { BarbieModels } from '@/components/tenant-sites/barbiespa/BarbieModels';

export const metadata = { title: 'Анкеты — BARBIE SPA' };

export default async function ModelsPage() {
  const girlsRes = await fetchPublicGirls('barbiespa').catch(() => ({ data: [], total: 0 }));
  return (
    <BarbieArticleShell>
      <BarbieModels girls={girlsRes.data} />
    </BarbieArticleShell>
  );
}
