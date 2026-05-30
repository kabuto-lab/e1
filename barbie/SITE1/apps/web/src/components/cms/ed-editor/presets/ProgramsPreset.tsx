import { Programs } from '@/components/tenant-site/sections/Programs';
import type { Tenant } from '@/lib/tenants';
import { PresetStub } from './PresetStub';

export function ProgramsPreset({ tenant }: { props: Record<string, unknown>; mode?: 'editor' | 'render'; tenant?: Tenant }) {
  if (!tenant) return <PresetStub label="Programs" />;
  return <Programs tenant={tenant} />;
}
