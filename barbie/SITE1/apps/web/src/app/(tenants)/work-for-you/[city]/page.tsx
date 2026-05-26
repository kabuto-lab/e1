/**
 * (tenants)/work-for-you/[city] — страница города wfy-тенанта.
 *
 * Phase C MVP: fetch bundle, найти city по slug, рендерить WfyCityShell с
 * найденным городом + общим списком vacancies (work-for-you предлагает
 * одни и те же позиции в каждом городе).
 *
 * Несуществующий city slug → 404.
 *
 * MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase C.
 */
import { notFound } from 'next/navigation';
import { fetchWfyBundle, WfyBundleNotFoundError } from '@/lib/wfy-public';
import { WfyCityShell } from '@/components/tenant-site/wfy/WfyCityShell';

const TENANT_SLUG = 'work-for-you';

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { city: citySlug } = await params;
  try {
    const bundle = await fetchWfyBundle(TENANT_SLUG);
    const city = bundle.cities.find((c) => c.slug === citySlug);
    if (!city) return { title: 'Город не найден' };
    return {
      title: city.extras.metaTitle ?? `${city.cityName} — Work-for-You`,
      description: city.extras.metaDescription ?? city.description ?? undefined,
    };
  } catch {
    return { title: 'Work-for-You' };
  }
}

export default async function WfyCityPage({ params }: PageProps) {
  const { city: citySlug } = await params;
  let bundle;
  try {
    bundle = await fetchWfyBundle(TENANT_SLUG);
  } catch (err) {
    if (err instanceof WfyBundleNotFoundError) notFound();
    throw err;
  }
  const city = bundle.cities.find((c) => c.slug === citySlug);
  if (!city) notFound();

  return <WfyCityShell tenantSlug={TENANT_SLUG} city={city} vacancies={bundle.vacancies} />;
}
