/**
 * FooterPreset — tenant-coupled Section preset поверх `tenant-site/sections/Footer`.
 */
import { Footer } from '@/components/tenant-site/sections/Footer';
import { makeTenantPreset } from './make-tenant-preset';

export const FooterPreset = makeTenantPreset(Footer, 'Footer');
