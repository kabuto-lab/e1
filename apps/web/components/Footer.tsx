'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { AnchorLink } from '@/components/AnchorLink';
import { useAuthOrGuest } from '@/components/AuthProvider';
import { useMassageMode } from '@/hooks/useMassageMode';

interface FooterProps {
  variant?: 'default' | 'home';
}

export function Footer({ variant = 'default' }: FooterProps) {
  const isMassageMode = useMassageMode();
  const { privateAreaHref, privateAreaLabel } = useAuthOrGuest();
  const isMainHome = variant === 'home' && !isMassageMode.enabled;

  if (isMainHome) {
    return (
      <footer className="border-t border-white/[0.08] py-10 md:py-12">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-6 md:grid-cols-2 md:px-10">
          <div>
            <Logo className="text-xl" />
            <p className="mt-2 font-body text-sm text-white/55">Бронирование встреч с безопасной оплатой</p>
            <div className="mt-4 flex flex-col gap-2 font-body text-sm text-white/65">
              <a href="tel:+79168614508" className="w-fit underline-offset-4 hover:text-white hover:underline">+7 (916) 861-45-08</a>
              <a href="mailto:ssuppor7mail@yandex.ru" className="w-fit break-all underline-offset-4 hover:text-white hover:underline">ssuppor7mail@yandex.ru</a>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <nav aria-label="Навигация в подвале" className="flex flex-col items-start gap-2 font-body text-sm text-white/65">
              <Link href="/models" className="hover:text-[#d4af37]">Модели</Link>
              <AnchorLink href="/#steps" className="hover:text-[#d4af37]">Как работает безопасная сделка</AnchorLink>
              <Link href="/for-models" className="hover:text-[#d4af37]">Для моделей</Link>
              <Link href="/contacts" className="hover:text-[#d4af37]">Поддержка</Link>
              <Link href="/help" className="hover:text-[#d4af37]">Вопросы и ответы</Link>
            </nav>
            <nav aria-label="Юридические документы" className="flex flex-col items-start gap-2 font-body text-sm text-white/65">
              <a href="/legal/oferta.pdf" download className="text-left leading-relaxed hover:text-[#d4af37]">Правила безопасной сделки и публичная оферта</a>
              <a href="/legal/privacy-policy.pdf" download className="text-left leading-relaxed hover:text-[#d4af37]">Политика обработки персональных данных</a>
              <a href="/legal/pd-consent.pdf" download className="text-left leading-relaxed hover:text-[#d4af37]">Согласие на обработку персональных данных</a>
            </nav>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-[1200px] flex-col gap-3 border-t border-white/[0.06] px-6 pt-5 font-body text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between md:px-10">
          <span>© {new Date().getFullYear()} My Muse</span>
          <Link href={privateAreaHref} className="hover:text-white">{privateAreaLabel}</Link>
        </div>
      </footer>
    );
  }

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
            <Link href="/models" className="hover:text-[#d4af37] transition-colors">
                {isMassageMode.enabled ? "Мастера" : "Модели"}
            </Link>
            <Link href="/contacts" className="hover:text-[#d4af37] transition-colors">Поддержка</Link>
            <Link href={privateAreaHref} className="hover:text-[#d4af37] transition-colors">
              {privateAreaLabel}
            </Link>
          </nav>
          <p className="font-body text-xs text-white/15">
            &copy; {new Date().getFullYear()} My Muse
          </p>
        </div>
        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-[11px] text-white/20">
          <a href="/legal/oferta.pdf" download className="hover:text-[#d4af37] transition-colors">
            Публичная оферта
          </a>
          <a href="/legal/privacy-policy.pdf" download className="hover:text-[#d4af37] transition-colors">
            Политика обработки персональных данных
          </a>
          <a href="/legal/pd-consent.pdf" download className="hover:text-[#d4af37] transition-colors">
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
