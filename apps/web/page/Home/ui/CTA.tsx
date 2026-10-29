'use client';

import { useMassageMode } from '@/hooks/useMassageMode';
import Link from 'next/link';

export const CTA = () => {
    const isMassage = useMassageMode();

    return (
        <section className="relative border-t border-white/[0.06] py-12 md:py-16">
            <div className="mx-auto max-w-[800px] px-6 text-center md:px-10">
                <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">
                    {isMassage.enabled ? 'Готовы начать?' : 'Выберите модель и время встречи'}
                </h2>
                <p className="mx-auto mb-8 mt-4 max-w-2xl font-body text-base leading-relaxed text-white/60 md:text-lg">
                    {isMassage.enabled
                        ? 'Выберите мастера и забронируйте программу всего за несколько минут.'
                        : 'Каталог открыт без регистрации. Создайте аккаунт, когда захотите управлять бронированием онлайн.'}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    {isMassage.enabled ? (
                        <>
                            <Link href="/models" className="site-header-cta-enter !px-8 !py-3.5">
                                <span className="site-header-cta-enter__label">Выбрать мастера</span>
                            </Link>
                            <Link href="/models" className="btn-secondary btn-hero-frosted-secondary">Мастера</Link>
                        </>
                    ) : (
                        <>
                            <Link href="/models" className="site-header-cta-enter !px-8 !py-3.5">
                                <span className="site-header-cta-enter__label">Открыть каталог</span>
                            </Link>
                            {/* Тот же .btn-secondary, что у кнопок в карточках и в финальном CTA страницы «Для моделей». */}
                            <Link href="/login?tab=register" className="btn-secondary">
                                <span className="site-header-cta-enter__label !text-[13px]">Создать аккаунт</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};
