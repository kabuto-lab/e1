import { Rooms } from '@/components/tenant-site/sections/Rooms';
import type { Tenant } from '@/lib/tenants';
import { PresetStub } from './PresetStub';

export function RoomsPreset({ tenant }: { props: Record<string, unknown>; mode?: 'editor' | 'render'; tenant?: Tenant }) {
  if (!tenant) return <PresetStub label="Rooms" />;
  return <Rooms tenant={tenant} />;
}
