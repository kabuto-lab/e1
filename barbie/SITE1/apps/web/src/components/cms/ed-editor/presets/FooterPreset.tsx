import { Footer } from '@/components/tenant-site/sections/Footer';
import type { Tenant } from '@/lib/tenants';
import { PresetStub } from './PresetStub';

export function FooterPreset({ tenant }: { props: Record<string, unknown>; mode?: 'editor' | 'render'; tenant?: Tenant }) {
  if (!tenant) return <PresetStub label="Footer" />;
  return <Footer tenant={tenant} />;
}
