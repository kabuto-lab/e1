'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { useAuthOrGuest } from '@/components/AuthProvider';

export function Footer() {
  const { privateAreaHref, privateAreaLabel } = useAuthOrGuest();

  return (
    <footer className="border-t border-white/[0.04] py-6">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 max-[768px]:items-center">
          <div className='max-[768px]:text-center'>
            <Logo className="text-xl" />
            <p className="font-body text-xs text-white/20 mt-1">
              Премиальная платформа сопровождения
            </p>
          </div>
          <nav className="flex items-center gap-6 font-body text-xs text-white/25">
            <Link href="/models" className="hover:text-[#d4af37] transition-colors">Модели</Link>
            <Link href="/contacts" className="hover:text-[#d4af37] transition-colors">Контакты</Link>
            <Link href={privateAreaHref} className="hover:text-[#d4af37] transition-colors">
              {privateAreaLabel}
            </Link>
            {/* <Link href="/sandbox" className="hover:text-[#d4af37] transition-colors">Песочница</Link> */}
          </nav>
          <p className="font-body text-xs text-white/15">
            &copy; {new Date().getFullYear()} Lovnge
          </p>
        </div>
        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-[11px] text-white/20">
          <a href="/legal/oferta.docx" download className="hover:text-[#d4af37] transition-colors">
            Публичная оферта
          </a>
          <a href="/legal/privacy-policy.docx" download className="hover:text-[#d4af37] transition-colors">
            Политика обработки персональных данных
          </a>
          <a href="/legal/pd-consent.docx" download className="hover:text-[#d4af37] transition-colors">
            Согласие на обработку персональных данных
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-[11px] text-white/20">
          <a href="tel:+79168614508" className="hover:text-[#d4af37] transition-colors">
            +7 (916) 861-45-08
          </a>
          <a href="mailto:ssuppor7mail@yandex.ru" className="hover:text-[#d4af37] transition-colors">
            ssuppor7mail@yandex.ru
          </a>
        </div>
      </div>
    </footer>
  );
}
