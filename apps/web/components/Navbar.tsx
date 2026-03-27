'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

const NAV_LINKS = [
  { href: '#hero', label: 'Главная', fx: 'nav-fx-shimmer' },
  { href: '#about', label: 'О нас', fx: 'nav-fx-expand' },
  { href: '/models', label: 'Модели', fx: 'nav-fx-glitch' },
  { href: '#contact', label: 'Контакты', fx: 'nav-fx-neon' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a0a]/90 backdrop-blur-xl py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 flex items-center justify-between">
        <Link href="/" className="text-xl md:text-2xl">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchor(e, link.href)}
              className={`font-body text-[13px] font-medium text-white/50 transition-colors uppercase tracking-[0.12em] ${link.fx}`}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="btn-primary ml-2 !py-2.5 !px-6 !text-[12px]">
            Войти
          </Link>
        </nav>

        <button
          className="md:hidden flex flex-col gap-[5px] p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span className={`block w-5 h-[2px] bg-[#d4af37] transition-all ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block w-5 h-[2px] bg-[#d4af37] transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-[2px] bg-[#d4af37] transition-all ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-6 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchor(e, link.href)}
              className="font-body text-base text-white/60 hover:text-[#d4af37] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="btn-primary mt-2 text-center">
            Войти
          </Link>
        </div>
      )}
    </header>
  );
}
