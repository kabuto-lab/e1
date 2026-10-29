'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
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
      <footer className="border-t border-white/[0.06] py-10 md:py-12">
        {/* Разгруженный подвал: короткие подписи в одну строку, приглушённый текст, без «Войти» —
            вход есть в шапке. «Как работает безопасная сделка» убрана: этот блок и так на главной. */}
        <div className="mx-auto max-w-[1200px] px-6 md:px-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <Logo className="text-xl" />
              <p className="mt-2 font-body text-sm text-white/45">Бронирование встреч с безопасной оплатой</p>
              <div className="mt-4 flex flex-col gap-1.5 font-body text-sm text-white/45 sm:flex-row sm:gap-5">
                <a href="tel:+79168614508" className="w-fit transition-colors hover:text-white">+7 (916) 861-45-08</a>
                <a href="mailto:ssuppor7mail@yandex.ru" className="w-fit break-all transition-colors hover:text-white">ssuppor7mail@yandex.ru</a>
              </div>
            </div>

            <div className="flex gap-8 sm:gap-12 md:gap-16">
              <nav aria-label="Навигация в подвале" className="flex flex-col items-start gap-2.5 font-body text-sm text-white/55">
                <Link href="/models" className="transition-colors hover:text-[#d4af37]">Каталог</Link>
                <Link href="/for-models" className="transition-colors hover:text-[#d4af37]">Для моделей</Link>
                <Link href="/help" className="transition-colors hover:text-[#d4af37]">FAQ</Link>
                <Link href="/contacts" className="transition-colors hover:text-[#d4af37]">Поддержка</Link>
              </nav>
              {/* Документы открываются для чтения в браузере: без download и в новой вкладке,
                  сервер отдаёт их с Content-Disposition: inline (см. next.config.js). */}
              <nav aria-label="Юридические документы" className="flex flex-col items-start gap-2.5 font-body text-sm text-white/55">
                <a href="/legal/oferta.pdf" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#d4af37]">Публичная оферта</a>
                <a href="/legal/privacy-policy.pdf" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#d4af37]">Политика конфиденциальности</a>
                <a href="/legal/pd-consent.pdf" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#d4af37]">Согласие на обработку данных</a>
              </nav>
            </div>
          </div>

          {/* Линия — на внутреннем контейнере, а не на блоке с px: раньше она выходила за края контента. */}
          <div className="mt-10 border-t border-white/[0.06] pt-5 font-body text-xs text-white/35">
            © {new Date().getFullYear()} My Muse
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-white/[0.04] py-6">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        {/* Сетка 1fr · auto · 1fr, а не justify-between: боковые колонки равной ширины, поэтому меню
            стоит ровно по центру — на одной оси со строками документов и контактов ниже. */}
        <div className="grid justify-items-center gap-6 text-center md:grid-cols-[1fr_auto_1fr] md:items-end md:justify-items-stretch md:text-left">
          <div>
            <Logo className="text-xl" />
            <p className="font-body text-xs text-white/20 mt-1">
              Премиальная платформа сопровождения
            </p>
          </div>
          <nav className="flex items-center gap-6 font-body text-xs text-white/25">
            <Link href="/models" className="hover:text-[#d4af37] transition-colors">
                {isMassageMode.enabled ? "Мастера" : "Каталог"}
            </Link>
            <Link href="/contacts" className="hover:text-[#d4af37] transition-colors">Поддержка</Link>
            <Link href={privateAreaHref} className="hover:text-[#d4af37] transition-colors">
              {privateAreaLabel}
            </Link>
          </nav>
          <p className="font-body text-xs text-white/15 md:text-right">
            &copy; {new Date().getFullYear()} My Muse
          </p>
        </div>
        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-[11px] text-white/20">
          <a href="/legal/oferta.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition-colors">
            Публичная оферта
          </a>
          <a href="/legal/privacy-policy.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition-colors">
            Политика обработки персональных данных
          </a>
          <a href="/legal/pd-consent.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition-colors">
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
