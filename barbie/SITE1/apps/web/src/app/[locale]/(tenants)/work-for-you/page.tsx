/**
 * (tenants)/work-for-you — главная wfy-city-dir тенанта.
 *
 * Phase C MVP: рендерит WfyHomeShell с данными из API /v1/public/tenants/
 * by-slug/work-for-you/wfy-bundle. ED-fallback (как у imperiumspa) пока
 * не подключён — добавится в Phase F когда WfyHomeShell завернут как
 * Section preset в block-registry.
 *
 * MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase C.
 */
import { notFound } from 'next/navigation';
import { fetchWfyBundle, WfyBundleNotFoundError } from '@/lib/wfy-public';
import { WfyHomeShell } from '@/components/tenant-site/wfy/WfyHomeShell';

const TENANT_SLUG = 'work-for-you';

export const metadata = {
  title: 'Work-for-You — работа для девушек в Москве',
  description:
    'Администратор, массажистка, хостес — работа в спа-салонах и гостиницах в центре Москвы. Ежедневные выплаты, проживание для иногородних.',
};

export default async function WfyHomePage() {
  let bundle;
  try {
    bundle = await fetchWfyBundle(TENANT_SLUG);
  } catch (err) {
    if (err instanceof WfyBundleNotFoundError) notFound();
    throw err;
  }
  return <WfyHomeShell bundle={bundle} />;
}
