'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ymGoal } from '@/lib/metrika';
import { MAIN_SECTION_CLASS } from './mainSectionClasses';

/**
 * Основной режим: две карточки регистрации — своя анкета и кабинет менеджера.
 * Кнопки ведут в регистрацию с нужной ролью, цель метрики — как у остальных CTA страницы.
 */
const CARDS = [
    {
        eyebrow: 'Аккаунт модели',
        title: 'Своя анкета',
        text: 'Размещайте анкету, общайтесь с клиентами и получайте оплату через безопасную сделку.',
        cta: 'Создать анкету',
        href: '/login?tab=register&role=model',
        role: 'model' as const,
        image: '/images/models/magnific_generate-a-verification-s_rgJ2WL5xtc.jpg',
        imageAlt: 'Анкета модели в My Muse',
        primary: true,
    },
    {
        eyebrow: 'Единый кабинет менеджера',
        title: 'Несколько моделей',
        text: 'Управляйте анкетами, следите за бронированиями и оплатами в одном кабинете.',
        cta: 'Добавить моделей',
        href: '/login?tab=register&role=manager',
        role: 'manager' as const,
        image: '/images/hero-escort.webp',
        imageAlt: 'Кабинет менеджера My Muse',
        primary: false,
    },
];

export const MainAccounts = () => (
    <section className={`grid gap-6 md:grid-cols-2 md:gap-8 ${MAIN_SECTION_CLASS}`}>
        {CARDS.map(({ eyebrow, title, text, cta, href, role, image, imageAlt, primary }) => (
            <article
                key={title}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414] transition-colors duration-300 hover:border-[#d4af37]/25"
            >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#0f0f0f] sm:aspect-[3/2] md:aspect-[4/3]">
                    <Image
                        src={image}
                        alt={imageAlt}
                        fill
                        sizes="(max-width: 767px) 100vw, (max-width: 1399px) 50vw, 680px"
                        className="object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </div>

                <div className="flex flex-1 flex-col gap-3 p-6 md:p-8">
                    <span className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">{eyebrow}</span>
                    <h3 className="font-display text-2xl font-bold text-white">{title}</h3>
                    <p className="font-body text-base leading-relaxed text-white/55">{text}</p>

                    <Link
                        href={href}
                        onClick={() => ymGoal('register_cta_click', { role, section: 'accounts' })}
                        className={
                            primary
                                ? 'btn-primary mt-4 inline-flex w-fit justify-center max-[610px]:w-full'
                                : 'btn-secondary mt-4 inline-flex w-fit justify-center max-[610px]:w-full'
                        }
                    >
                        <span className="site-header-cta-enter__label !text-[13px]">{cta}</span>
                    </Link>
                </div>
            </article>
        ))}
    </section>
);
