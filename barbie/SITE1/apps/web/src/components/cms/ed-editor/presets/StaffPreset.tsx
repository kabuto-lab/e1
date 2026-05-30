import { Staff } from '@/components/tenant-site/sections/Staff';
import type { Tenant } from '@/lib/tenants';
import { PresetStub } from './PresetStub';

export function StaffPreset({ tenant }: { props: Record<string, unknown>; mode?: 'editor' | 'render'; tenant?: Tenant }) {
  if (!tenant) return <PresetStub label="Staff" />;
  return <Staff tenant={tenant} />;
}
