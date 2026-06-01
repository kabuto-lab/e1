import type { Tenant } from '@/lib/tenants';
import { fetchPublicGirls } from '@/lib/public-girls-api';
import { ModelsGrid } from './ModelsGrid';

/**
 * Models — публичная секция «Девушки» на сайте тенанта.
 *
 * Server-component: тянет активные модели тенанта из NAS-каталога
 * (GET /v1/public/girls?tenant=slug, фильтр по params.activeTenants) и отдаёт
 * клиентскому гриду ModelsGrid (фильтры + лайтбокс). Если моделей нет /
 * API недоступен — секция не рендерится.
 *
 * Заменяет статичный Staff: ростер берётся из раздела «Модели» NAS, а не из
 * tenant.staff (см. Class-G, content-model §1.1).
 */
export async function Models({ tenant }: { tenant: Tenant }) {
  if (!tenant.slug) return null;

  const { data } = await fetchPublicGirls(tenant.slug).catch(() => ({ data: [], total: 0 }));
  if (data.length === 0) return null;

  return (
    <section
      id="models"
      className="container py-16 md:py-24 border-t"
      style={{ borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }}
    >
      <div className="flex items-baseline justify-between mb-10 flex-wrap gap-4">
        <h2 className="text-3xl md:text-5xl" style={{ fontFamily: 'var(--head-font)' }}>
          Девушки
        </h2>
        <div className="text-xs uppercase tracking-[0.3em] opacity-50">{data.length} анкет</div>
      </div>
      <ModelsGrid girls={data} />
    </section>
  );
}
