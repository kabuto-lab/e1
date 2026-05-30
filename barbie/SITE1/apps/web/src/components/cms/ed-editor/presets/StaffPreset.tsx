/**
 * StaffPreset — tenant-coupled Section preset поверх `tenant-site/sections/Staff`.
 */
import { Staff } from '@/components/tenant-site/sections/Staff';
import { makeTenantPreset } from './make-tenant-preset';

export const StaffPreset = makeTenantPreset(Staff, 'Staff');
