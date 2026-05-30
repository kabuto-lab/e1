/**
 * HeroPreset — tenant-coupled Section preset поверх `tenant-site/sections/Hero`.
 * Логика (real tenant / sample-в-редакторе / stub) — в makeTenantPreset.
 */
import { Hero } from '@/components/tenant-site/sections/Hero';
import { makeTenantPreset } from './make-tenant-preset';

export const HeroPreset = makeTenantPreset(Hero, 'Hero');
