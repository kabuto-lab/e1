'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { MobileNavDrawer, MobileMenuTrigger } from '@/components/MobileNavDrawer';
import { useAuthOrGuest } from '@/components/AuthProvider';

const PRIMARY_NAV = [
  { href: '/', label: 'О нас' },
  { href: '/models', label: 'Модели' },
  { href: '/contacts', label: 'Контакты' },
  { href: '/help', label: 'Помощь' },
] as const;

export type SiteHeaderCrumb = { href?: string; label: string };

function SiteHeaderCrumbs({
  crumbs,
  hint,
  className,
}: {
  crumbs: SiteHeaderCrumb[];
  hint?: ReactNode;
  className?: string;
}) {
  if (!crumbs.length && !hint) return null;
  const lastIdx = crumbs.length - 1;
  const inner = (
    <>
      {crumbs.map((c, i) => {
        const isLast = i === lastIdx;
        const segmentRow = isLast
          ? 'flex min-w-0 flex-1 items-center gap-2'
          : 'flex shrink-0 items-center gap-2';
        const textCommon =
          'font-body text-[13px] font-bold leading-normal text-white/90 transition-colors hover:text-white md:text-[14px] whitespace-nowrap';
        /* flex-1 min-w-0 + truncate: полный текст, пока есть место; «…» только когда ряд сжат (до отступа под бургер) */
        const textLast = `${textCommon} min-w-0 flex-1 truncate`;
        const textMid = `${textCommon} shrink-0`;
        return (
          <span key={`${i}-${c.label}`} className={segmentRow}>
            <span className="shrink-0 font-light text-white/35" aria-hidden>
              /
            </span>
            {c.href ? (
              <Link href={c.href} className={isLast ? textLast : textMid} title={isLast ? c.label : undefined}>
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? textLast : textMid} title={isLast ? c.label : undefined}>
                {c.label}
              </span>
            )}
          </span>
        );
      })}
      {hint ? (
        <span className="ml-1 min-w-0 max-w-[32%] shrink truncate whitespace-nowrap md:max-w-[min(12rem,40vw)]">
          {hint}
        </span>
      ) : null}
    </>
  );
  if (crumbs.length) {
    return (
      <nav
        className={`flex min-w-0 max-w-full flex-nowrap items-center gap-x-2 gap-y-1 ${className ?? ''}`}
        aria-label="Хлебные крошки"
      >
        {inner}
      </nav>
    );
  }
  return (
    <div className={`flex min-w-0 max-w-full flex-nowrap items-center gap-x-2 gap-y-1 ${className ?? ''}`}>{inner}</div>
  );
}

function DesktopNav({
  onAnchor,
}: {
  onAnchor: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  return (
    <nav
      className="site-header-capsule-nav flex flex-nowrap items-center justify-center gap-x-4 md:gap-x-5"
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
    </nav>
  );
}

export function SiteHeader({
  variant,
  segment,
  /** Слот справа от золотой кнопки «Войти» / «Вход» (только md+), вне капсулы меню */
  afterLoginCta,
}: {
  variant: 'home' | 'page';
  segment?: { crumbs: SiteHeaderCrumb[]; hint?: ReactNode };
  afterLoginCta?: ReactNode;
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

  const crumbs = segment?.crumbs ?? [];
  const crumbHint = segment?.hint;

  const showMobileCrumbs = crumbs.length > 0 || Boolean(crumbHint);

  const leftCluster = (
    <div className="relative z-[11] flex min-w-0 flex-1 items-center md:gap-3">
      <div className="site-header-mobile-brand-capsule md:hidden">
        <Link href="/" className="-translate-y-px shrink-0 text-xl leading-none" aria-label="На главную">
          <Logo />
        </Link>
        {showMobileCrumbs ? (
          <div className="min-w-0 flex-1 overflow-hidden">
            <SiteHeaderCrumbs crumbs={crumbs} hint={crumbHint} className="items-center" />
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="site-header-slot">
      <header
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] w-full border-0 bg-transparent shadow-none"
        data-site-header={variant}
      >
        <div className="pointer-events-auto mx-auto max-w-[1200px] px-6 md:px-10 md:pt-3">
          <div className="relative flex items-center justify-between gap-3 py-4 md:py-3">
            {leftCluster}

            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-[9] hidden translate-y-[20px] items-center justify-center md:flex">
              {/* Ширина ряда ≈ контентная зона под max-w-[1200px]; раньше max 58rem + капсула max 42rem сжимали меню и включали flex-wrap */}
              <div className="pointer-events-auto flex w-full max-w-full items-center justify-center gap-2 md:gap-4 lg:gap-5">
                <Link
                  href="/"
                  className="site-header-capsule-logo hidden shrink-0 items-center leading-none text-xl md:inline-flex md:-translate-y-[4px] md:text-2xl"
                  aria-label="На главную"
                >
                  <Logo />
                </Link>
                <div className="hidden min-w-0 max-w-[min(46vw,14rem)] shrink md:block lg:max-w-[min(40vw,20rem)]">
                  <SiteHeaderCrumbs crumbs={crumbs} hint={crumbHint} />
                </div>
                <div className="site-header-nav-capsule shrink-0">
                  <DesktopNav onAnchor={handleAnchor} />
                </div>
                <div className="hidden shrink-0 items-center gap-2 md:flex">
                  <Link
                    href={user ? '/dashboard' : '/login'}
                    className="site-header-cta-enter btn-liquid-gold inline-flex"
                  >
                    <span className="site-header-cta-enter__label">{user ? 'Вход' : 'Войти'}</span>
                  </Link>
                  {afterLoginCta ? <div className="flex shrink-0 items-center">{afterLoginCta}</div> : null}
                </div>
              </div>
            </div>

            {/* max-md: shrink-0 — только ширина кнопки; иначе flex-1 делил шапку пополам и крошки усечены «раньше» бургера */}
            <div className="relative z-[11] flex shrink-0 justify-end md:flex-1">
              <MobileMenuTrigger open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
            </div>
          </div>
        </div>
      </header>

      <MobileNavDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
}
