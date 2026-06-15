import type { ReactNode } from 'react';
import { SmoothScroll } from '@/components/tenant-sites/shared/SmoothScroll';

/**
 * Layout группы (tenants) — общий для всех публичных сайтов тенантов (НЕ /admin).
 * Монтирует единый плавный скролл (Lenis) один раз на все страницы всех тенантов.
 */
export default function TenantsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SmoothScroll />
    </>
  );
}
