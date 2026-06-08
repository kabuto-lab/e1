import type { ReactNode } from 'react';
import Link from 'next/link';
import { fetchPublicTenant, fetchPublicMenu } from '@/lib/tenants';
import { TenantBrandShell } from './TenantBrandShell';
import { Navigation } from './Navigation';
import { Footer } from './sections/Footer';

interface TenantGlobalSectionProps {
  /** Slug тенанта (= имя папки роута). */
  slug: string;
  kicker: string;
  title: string;
  lead: string;
  cta?: string;
  children?: ReactNode;
}

/**
 * TenantGlobalSection — генерик сквозной (Class-G) страницы для тенантов на
 * data-driven рендере (Выезд / Мальчишник / Вакансии). Аналог salonmassage-
 * скоупного SmGlobalPage, но темизуется дизайн-токенами тенанта через
 * TenantBrandShell (а не хардкод .sm-site).
 *
 * Контент пока статичный — одинаков на всех салонах. TODO (как и в SmGlobalPage):
 * вынести в NAS-управляемое глобальное хранилище Class-G, чтобы platform-admin
 * правил один раз для всех тенантов.
 */
export async function TenantGlobalSection({
  slug,
  kicker,
  title,
  lead,
  cta = 'Записаться',
  children,
}: TenantGlobalSectionProps) {
  const tenant = await fetchPublicTenant(slug);
  const menu = await fetchPublicMenu(slug).catch(() => ({
    template: 'top-classic' as const,
    items: [],
  }));

  return (
    <TenantBrandShell designTokens={tenant.designTokens}>
      <Navigation tenant={tenant} menu={menu} />
      <main className="container py-20 md:py-28 text-center">
        <div className="text-xs uppercase tracking-[0.3em] opacity-50 mb-4">{kicker}</div>
        <h1 className="text-4xl md:text-6xl mb-6">{title}</h1>
        <p className="max-w-2xl mx-auto text-lg opacity-80 leading-relaxed">{lead}</p>
        {children}
        <div className="mt-10">
          <Link
            href={`/${slug}#contacts`}
            className="inline-block px-8 py-3 rounded-full font-medium"
            style={{ background: 'var(--acc-color)', color: 'var(--bg)' }}
          >
            {cta}
          </Link>
        </div>
      </main>
      <Footer tenant={tenant} />
    </TenantBrandShell>
  );
}
