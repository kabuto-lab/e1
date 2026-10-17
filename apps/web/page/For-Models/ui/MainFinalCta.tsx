'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ymGoal } from '@/lib/metrika';
import { MAIN_FULL_BLEED_GUTTER_CLASS, MAIN_SECTION_CLASS } from './mainSectionClasses';

/** Основной режим: финальный призыв — регистрация модели или менеджера и ссылка в каталог. */
export const MainFinalCta = () => (
    <section
        className={`relative w-full overflow-hidden border-t border-white/[0.06] bg-[#0b0b0b] ${MAIN_SECTION_CLASS}`}
    >
        <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.10), transparent 65%)' }}
        />

        <div className={`relative mx-auto flex w-full max-w-[1400px] flex-col items-center gap-6 ${MAIN_FULL_BLEED_GUTTER_CLASS}`}>
            <h2 className="text-center font-display text-3xl font-bold leading-tight text-white md:text-5xl">
                Разместите анкету в My Muse
            </h2>
            <p className="text-center font-body text-base leading-relaxed text-white/55 md:text-lg">
                Больше уверенности. Больше возможностей.
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 max-[610px]:w-full max-[610px]:flex-col">
                <Link
                    href="/login?tab=register&role=model"
                    className="btn-primary btn-hero-frosted justify-center max-[610px]:w-full"
                    onClick={() => ymGoal('register_cta_click', { role: 'model', section: 'final_cta' })}
                >
                    <span className="site-header-cta-enter__label !text-[13px]">Я модель</span>
                </Link>
                {/* Вторая кнопка — тот же .btn-secondary, что «Добавить моделей» в карточке
                    «Единый кабинет менеджера» и в герое страницы. */}
                <Link
                    href="/login?tab=register&role=manager"
                    className="btn-secondary justify-center max-[610px]:w-full"
                    onClick={() => ymGoal('register_cta_click', { role: 'manager', section: 'final_cta' })}
                >
                    <span className="site-header-cta-enter__label !text-[13px]">Я менеджер</span>
                </Link>
            </div>

            <Link
                href="/models"
                className="mt-2 inline-flex items-center gap-2 font-body text-sm font-medium text-[#d4af37] underline-offset-4 hover:underline"
            >
                Посмотреть каталог
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Link>
        </div>
    </section>
);
