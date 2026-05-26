/**
 * (tenants)/work-for-you/policy — статичная страница политики.
 * Phase C MVP: placeholder-контент; real content в cms_pages slug='policy'
 * подключится в Phase F через EdRenderer fallback.
 *
 * MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase C.
 */
import { notFound } from 'next/navigation';
import { fetchWfyBundle, WfyBundleNotFoundError } from '@/lib/wfy-public';
import { WfyPolicyShell } from '@/components/tenant-site/wfy/WfyPolicyShell';

const TENANT_SLUG = 'work-for-you';

export const metadata = {
  title: 'Политика конфиденциальности — Work-for-You',
};

export default async function WfyPolicyPage() {
  let bundle;
  try {
    bundle = await fetchWfyBundle(TENANT_SLUG);
  } catch (err) {
    if (err instanceof WfyBundleNotFoundError) notFound();
    throw err;
  }
  return <WfyPolicyShell tenantSlug={TENANT_SLUG} tenantName={bundle.tenant.name} />;
}
