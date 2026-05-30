/**
 * makeTenantPreset — фабрика тонких tenant-coupled Section preset'ов.
 *
 * Track H · C: раньше каждый из 6 пресетов (Hero/Staff/Programs/Rooms/Contacts/
 * Footer) был отдельным near-identical wrapper'ом, который без `tenant`
 * показывал PresetStub. Теперь общая логика здесь:
 *   - есть `tenant` (публичный рендер) → рендерим секцию с ним;
 *   - нет, но mode='editor' → рендерим с SAMPLE_TENANT (живой предпросмотр);
 *   - нет и не editor → PresetStub (fallback, на практике не случается).
 */
import type { ComponentType } from 'react';
import type { Tenant } from '@/lib/tenants';
import type { BlockRenderProps } from '../block-registry';
import { PresetStub } from './PresetStub';
import { SAMPLE_TENANT } from './sample-tenant';

export function makeTenantPreset(Section: ComponentType<{ tenant: Tenant }>, label: string) {
  function TenantPreset({ mode, tenant }: BlockRenderProps) {
    const t = tenant ?? (mode === 'editor' ? SAMPLE_TENANT : undefined);
    if (!t) return <PresetStub label={label} />;
    return <Section tenant={t} />;
  }
  TenantPreset.displayName = `TenantPreset(${label})`;
  return TenantPreset;
}
