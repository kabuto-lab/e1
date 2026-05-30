import { Contacts } from '@/components/tenant-site/sections/Contacts';
import type { Tenant } from '@/lib/tenants';
import { PresetStub } from './PresetStub';

export function ContactsPreset({ tenant }: { props: Record<string, unknown>; mode?: 'editor' | 'render'; tenant?: Tenant }) {
  if (!tenant) return <PresetStub label="Contacts" />;
  return <Contacts tenant={tenant} />;
}
