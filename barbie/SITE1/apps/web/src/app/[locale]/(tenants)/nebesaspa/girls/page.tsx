import { fetchPublicGirls } from '@/lib/public-girls-api';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';
import { NebesaGirls } from '@/components/tenant-sites/nebesa/NebesaGirls';

export const metadata = {
  title: 'Наши девушки — НЕБОСВОД · спа-салон эротического массажа',
  description: 'Анкеты мастеров салона НЕБОСВОД: реальные фото и параметры. Работаем 24/7 по записи.',
};

/**
 * (tenants)/nebesaspa/girls — внутренняя страница тенанта nebesaspa в едином
 * стиле с главной (NebesaShell + nebesa.css). Ростер — из NAS-каталога.
 */
export default async function Page() {
  const { data: girls } = await fetchPublicGirls('nebesaspa').catch(() => ({ data: [], total: 0 }));

  return (
    <NebesaShell>
      <NebesaGirls girls={girls} />
    </NebesaShell>
  );
}
