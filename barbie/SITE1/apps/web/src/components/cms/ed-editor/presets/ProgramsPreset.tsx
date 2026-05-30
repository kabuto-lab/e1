/**
 * ProgramsPreset — tenant-coupled Section preset поверх `tenant-site/sections/Programs`.
 */
import { Programs } from '@/components/tenant-site/sections/Programs';
import { makeTenantPreset } from './make-tenant-preset';

export const ProgramsPreset = makeTenantPreset(Programs, 'Programs');
