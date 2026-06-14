import { fetchPublicGirls } from '@/lib/public-girls-api';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';
import { NebesaGirls } from '@/components/tenant-sites/nebesa/NebesaGirls';

export const metadata = {
  title: 'Анкеты девушек — НЕБОСВОД · спа-салон эротического массажа',
  description: 'Анкеты мастеров салона НЕБОСВОД: реальные фото и параметры. Работаем 24/7 по записи.',
};

/**
 * (tenants)/nebesaspa/models — раздел анкет в едином стиле сайта НЕБОСВОД
 * (NebesaShell + фирменные flip-карточки NebesaGirls). Ростер — из NAS-каталога.
 */
export default async function ModelsPage() {
  const { data: girls } = await fetchPublicGirls('nebesaspa').catch(() => ({ data: [], total: 0 }));

  return (
    <NebesaShell>
      <NebesaGirls girls={girls} title="Анкеты девушек" />
    </NebesaShell>
  );
}
