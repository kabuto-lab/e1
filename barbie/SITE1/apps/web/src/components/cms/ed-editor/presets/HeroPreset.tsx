/**
 * HeroPreset — обёртка legacy-секции `tenant-site/sections/Hero` для ED.
 *
 * Φ3: тонкий wrapper. Получает `tenant?: Tenant` от вызывающего рендерера
 * (EdRenderer пробрасывает дальше из public страницы, WidgetView пробрасывает
 * из редактора). В editor-режиме без tenant — показывает заглушку.
 *
 * Сама `Hero` уже brand-kit-aware (использует var(--acc-color), --acc-font),
 * так что preset автоматически реагирует на смену цветов в /admin/projects.
 */
import { Hero } from '@/components/tenant-site/sections/Hero';
import type { Tenant } from '@/lib/tenants';
import { PresetStub } from './PresetStub';

export function HeroPreset({ tenant }: { props: Record<string, unknown>; mode?: 'editor' | 'render'; tenant?: Tenant }) {
  if (!tenant) return <PresetStub label="Hero" />;
  return <Hero tenant={tenant} />;
}
