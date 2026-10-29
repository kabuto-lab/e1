"use client";

import { useMassageMode } from "@/hooks/useMassageMode";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DEFAULT_SLOGAN, MASSAGE_SLOGAN, PROD_IMAGES_ESCORT, PROD_IMAGES_MESSAGE } from "./constants";

const HeroImage = dynamic(
    () => import('@/components/HeroImageSlider').then((m) => ({ default: m.HeroImageSlider })),
    { ssr: false, loading: () => <div className="absolute inset-0 bg-[#0a0a0a]" /> },
);

export const Hero = () => {
    const isMassage = useMassageMode();
    const heroImage = isMassage.enabled ? [PROD_IMAGES_MESSAGE] : [PROD_IMAGES_ESCORT];
    const displaySlogan = isMassage.enabled ? MASSAGE_SLOGAN : DEFAULT_SLOGAN;

    if (!isMassage.enabled) {
        return (
            <section
                id="hero"
                className="relative isolate h-screen w-full overflow-hidden scroll-mt-[var(--site-header-height)]"
            >
                <div className="absolute inset-0 z-0 min-h-0">
                    <HeroImage images={heroImage} className="h-full min-h-0" />
                </div>

                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/45 to-black/10" />

                {/* Боковые отступы — как у секций страницы (max-w-[1200px] + px-6/px-10),
                    чтобы текст героя стоял в одной сетке с контентом ниже. */}
                <div className="absolute inset-x-0 bottom-0 z-20 pb-12 md:pb-16 lg:pb-20">
                    <div className="mx-auto max-w-[1200px] px-6 md:px-10">
                        <h1 className="font-display text-[1.75rem] font-bold leading-[1.12] text-white sm:text-[2.25rem] md:text-[3rem] lg:text-[3.75rem]">
                            Ваши желания. Ваш&nbsp;выбор.<br />
                            <span className="text-gradient-gold">Наша защита.</span>
                        </h1>
                        <p className="mt-5 max-w-[34rem] font-body text-sm leading-relaxed text-white/70 md:mt-6 md:text-lg">
                            Выбирайте девушек из каталога подтверждённых профилей и бронируйте встречи с защитой оплаты.
                        </p>
                        {/* Кнопок и списка пунктов здесь больше нет — каталог идёт сразу следующей секцией. */}
                    </div>
                </div>

                {/* Золотая стрелка-подсказка внизу героя. Центрирование — на внешнем слое, анимация — на
                    внутреннем: animate-bounce задаёт transform в keyframes и затёр бы -translate-x-1/2.
                    На мобилке контент героя заканчивается выше (pb-12) — стрелка ниже, чтобы не лечь на текст. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center md:bottom-8">
                    <div className="animate-bounce motion-reduce:animate-none">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="2" aria-hidden>
                            <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            id="hero"
            className="relative isolate h-screen w-full overflow-hidden scroll-mt-[var(--site-header-height)]"
        >
            <div className="absolute inset-0 z-0 min-h-0">
                <HeroImage images={heroImage} className="h-full min-h-0" />
            </div>

            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

            <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-10 md:px-16 md:pb-16 lg:px-24 lg:pb-20">
                {/* Badge */}
                <div className="mb-4 md:mb-5">
                    <span className="inline-block font-body text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]/75 border border-[#d4af37]/35 rounded px-3 py-1">
                        Премиальный сервис
                    </span>
                </div>

                {/* Title */}
                <h1 className="font-display font-extrabold leading-[1.05] mb-3 md:mb-5">
                    <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] text-white drop-shadow-md">
                        {displaySlogan.line1}
                    </span>
                    <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] text-gradient-gold">
                        {displaySlogan.line2}
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="font-body text-[14px] md:text-base text-white/40 mb-7 md:mb-9 max-w-[16rem] sm:max-w-sm md:max-w-xl leading-relaxed">
                    {displaySlogan.subtitle}
                </p>

                {/* CTA */}
                <div className="flex flex-wrap items-center gap-4">
                    <Link href="/models" className="btn-primary btn-hero-frosted">
                        <span className="site-header-cta-enter__label !text-[13px]">
                            {isMassage.enabled ? 'Выбрать программу' : 'Смотреть каталог'}
                        </span>
                    </Link>
                    <a
                        href="#about"
                        onClick={(e) => { e.preventDefault(); document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' }); }}
                        className="btn-secondary btn-hero-frosted-secondary"
                    >
                        Подробнее
                    </a>
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
            </div>
        </section>
    )
};
