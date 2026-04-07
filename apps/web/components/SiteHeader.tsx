'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { MobileNavDrawer, MobileMenuTrigger } from '@/components/MobileNavDrawer';
import { useAuthOrGuest } from '@/components/AuthProvider';

const PRIMARY_NAV = [
  { href: '/#hero', label: 'Главная' },
  { href: '/#about', label: 'О нас' },
  { href: '/models', label: 'Модели' },
  { href: '/contacts', label: 'Контакты' },
  { href: '/help', label: 'Помощь' },
] as const;

export type SiteHeaderCrumb = { href?: string; label: string };

function DesktopNav({
  navExtras,
  onAnchor,
}: {
  navExtras?: ReactNode;
  onAnchor: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  return (
    <nav
      className="site-header-capsule-nav flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
      aria-label="Основное меню"
    >
      {PRIMARY_NAV.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={(e) => onAnchor(e, link.href)}
          className="site-header-nav-link font-body text-[13px] font-medium uppercase leading-none tracking-[0.12em] text-white transition-colors duration-200 hover:text-[#f5e6b8] focus:outline-none focus-visible:text-[#f5e6b8]"
        >
          {link.label}
        </Link>
      ))}
      {navExtras}
    </nav>
  );
}

export function SiteHeader({
  variant,
  segment,
  navExtras,
}: {
  variant: 'home' | 'page';
  segment?: { crumbs: SiteHeaderCrumb[]; hint?: ReactNode };
  navExtras?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuthOrGuest();

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('/#')) return;
    e.preventDefault();
    const hash = href.slice(1);
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const leftCluster = (
    <div className="relative z-[11] flex min-w-0 flex-1 items-center gap-2 md:gap-3">
      <Link href="/" className="-translate-y-px shrink-0 text-xl md:hidden">
        <Logo />
      </Link>
      {segment?.crumbs?.length ? (
        <>
          <span className="shrink-0 font-light text-white/30">/</span>
          {segment.crumbs.map((c, i) => (
            <span key={`${i}-${c.label}`} className="flex min-w-0 items-center gap-2">
              {i > 0 ? <span className="shrink-0 font-light text-white/30">:</span> : null}
              {c.href ? (
                <Link
                  href={c.href}
                  className="font-display truncate text-lg font-bold text-white/55 transition-colors hover:text-white md:text-xl"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="font-display truncate text-lg font-bold text-white md:text-xl">{c.label}</span>
              )}
            </span>
          ))}
          {segment.hint ? (
            <span className="ml-1 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">{segment.hint}</span>
          ) : null}
        </>
      ) : null}
    </div>
  );

  return (
    <div className="site-header-slot">
      <header
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] w-full bg-transparent"
        data-site-header={variant}
      >
        <div className="pointer-events-auto mx-auto max-w-[1200px] px-6 md:px-10 md:pt-3">
          <div className="relative flex items-center justify-between gap-3 py-4 md:py-3">
            {leftCluster}

            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-[9] hidden translate-y-[20px] items-center justify-center md:flex">
              <div className="pointer-events-auto flex max-w-[min(100vw-2.5rem,58rem)] items-center gap-3 md:gap-5">
                <Link
                  href="/"
                  className="site-header-capsule-logo hidden shrink-0 items-center leading-none text-xl md:inline-flex md:-translate-y-[4px] md:text-2xl"
                  aria-label="На главную"
                >
                  <Logo />
                </Link>
                <div className="site-header-nav-capsule min-w-0 max-w-[min(100vw-8rem,42rem)]">
                  <DesktopNav navExtras={navExtras} onAnchor={handleAnchor} />
                </div>
                <Link
                  href={user ? '/dashboard' : '/login'}
                  className="site-header-cta-enter btn-liquid-gold hidden shrink-0 md:inline-flex"
                >
                  <span className="site-header-cta-enter__label">{user ? 'Вход' : 'Войти'}</span>
                </Link>
              </div>
            </div>

            <div className="relative z-[11] flex flex-1 justify-end md:flex-1">
              <MobileMenuTrigger open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
            </div>
          </div>
        </div>
      </header>

      <MobileNavDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
}
