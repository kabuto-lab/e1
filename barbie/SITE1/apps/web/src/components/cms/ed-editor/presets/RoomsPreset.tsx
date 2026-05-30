/**
 * RoomsPreset — tenant-coupled Section preset поверх `tenant-site/sections/Rooms`.
 */
import { Rooms } from '@/components/tenant-site/sections/Rooms';
import { makeTenantPreset } from './make-tenant-preset';

export const RoomsPreset = makeTenantPreset(Rooms, 'Rooms');
