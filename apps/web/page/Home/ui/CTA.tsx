"use client";

import { useMassageMode } from "@/lib/useMassageMode"
import Link from "next/link";

export const CTA = () => {
    const isMassage = useMassageMode();

    return (
        <section className="relative py-[35px] md:py-[70px] border-t border-white/[0.04]">
            <div className="max-w-[800px] mx-auto px-6 md:px-10 text-center">
                <h2 className="font-display text-3xl md:text-5xl font-extrabold mb-5">
                    Готовы{' '}
                    <span className="text-gradient-gold">начать</span>?
                </h2>
                <p className="font-body text-white/35 mb-10 text-base md:text-lg max-w-lg mx-auto">
                    {isMassage.enabled
                        ? 'Выберите мастера и забронируйте программу всего за несколько минут.'
                        : 'Создайте аккаунт за 30 секунд и получите доступ к эксклюзивному каталогу'}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    {isMassage.enabled ? (
                        <Link href="/models" className="site-header-cta-enter !px-8 !py-3.5">
                            <span className="site-header-cta-enter__label">Выбрать мастера</span>
                        </Link>
                    ) : (
                        <Link href="/login" className="site-header-cta-enter !px-8 !py-3.5">
                            <span className="site-header-cta-enter__label">Создать аккаунт</span>
                        </Link>
                    )}
                    <Link href="/models" className="btn-secondary btn-hero-frosted-secondary">
                        {isMassage.enabled ? 'Мастера' : 'Модели'}
                    </Link>
                </div>
            </div>
        </section>
    )
};
