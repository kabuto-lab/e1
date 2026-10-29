'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Ссылка на якорь главной страницы (`/#steps`). На самой главной прокручивает к секции
 * без перехода, с других страниц ведёт обычной ссылкой (как handleAnchor в Header).
 */
export function AnchorLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const hash = href.startsWith('/#') ? href.slice(1) : null;

  if (!hash) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        if (pathname !== '/') return;
        e.preventDefault();
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      }}
    >
      {children}
    </a>
  );
}
