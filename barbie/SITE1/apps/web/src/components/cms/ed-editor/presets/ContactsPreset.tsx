/**
 * ContactsPreset — tenant-coupled Section preset поверх `tenant-site/sections/Contacts`.
 */
import { Contacts } from '@/components/tenant-site/sections/Contacts';
import { makeTenantPreset } from './make-tenant-preset';

export const ContactsPreset = makeTenantPreset(Contacts, 'Contacts');
