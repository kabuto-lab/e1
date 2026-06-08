import { fetchPublicTenant, fetchPublicMenu } from '@/lib/tenants';
import { fetchPublicGirls } from '@/lib/public-girls-api';
import { TenantBrandShell } from './TenantBrandShell';
import { Navigation } from './Navigation';
import { ModelsGrid } from './sections/ModelsGrid';
import { Footer } from './sections/Footer';

/**
 * TenantModelsPage — генерик листинг моделей (сквозной раздел «Анкеты»/«Модели»)
 * для тенантов на data-driven рендере. Ростер тянется из общего пула NAS
 * (GET /v1/public/girls?tenant=<slug>) и отдаётся клиентскому ModelsGrid
 * (фильтры + лайтбокс). Темизация — дизайн-токенами тенанта.
 *
 * Аналог salonmassage-скоупной /models, но без .sm-site — на TenantBrandShell.
 */
export async function TenantModelsPage({ slug }: { slug: string }) {
  const tenant = await fetchPublicTenant(slug);
  const menu = await fetchPublicMenu(slug).catch(() => ({
    template: 'top-classic' as const,
    items: [],
  }));
  const { data: girls } = await fetchPublicGirls(slug).catch(() => ({ data: [], total: 0 }));

  return (
    <TenantBrandShell designTokens={tenant.designTokens}>
      <Navigation tenant={tenant} menu={menu} />
      <main className="container py-16 md:py-24">
        <div className="flex items-baseline justify-between mb-10 flex-wrap gap-4">
          <h1 className="text-4xl md:text-6xl">Анкеты</h1>
          <div className="text-xs uppercase tracking-[0.3em] opacity-50">{girls.length} анкет</div>
        </div>
        {girls.length > 0 ? (
          <ModelsGrid girls={girls} />
        ) : (
          <p className="opacity-60">Каталог скоро появится.</p>
        )}
      </main>
      <Footer tenant={tenant} />
    </TenantBrandShell>
  );
}
