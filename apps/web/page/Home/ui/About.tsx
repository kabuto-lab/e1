"use client";

import Logo from "@/components/Logo";
import { useMassageMode } from "@/lib/useMassageMode";
import { FEATURES, MASSAGE_FEATURES } from "./constants";

export const About = () => {
    const isMassage = useMassageMode();

    return (
        <section id="about" className="relative py-[35px] md:py-[70px]">
            <div className="max-w-[1200px] mx-auto px-6 md:px-10">
                <div className="text-center mb-16">
                    <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                        {isMassage.enabled ? 'О нас' : 'О платформе'}
                    </span>
                    {isMassage.enabled ? (
                        <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">Почему выбирают нас</h2>
                    ) : (
                        <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">
                            Почему{' '}
                            <Logo className="text-3xl md:text-5xl" />
                        </h2>
                    )}
                    <p className="font-body text-white/35 max-w-2xl mx-auto text-base md:text-lg">
                        {isMassage.enabled
                            ? 'Мы создали приватное пространство для отдыха, восстановления и новых впечатлений'
                            : 'Мы создали платформу, которая устанавливает новый стандарт качества, безопасности и удобства'}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {(isMassage.enabled ? MASSAGE_FEATURES : FEATURES).map(({ Icon, ...feat }) => (
                        <div
                            key={feat.title}
                            className="group p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03] transition-all duration-300"
                        >
                            <div className="mb-4 text-[#d4af37]" aria-hidden>
                                <Icon
                                    className="h-10 w-10 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.2]"
                                    strokeWidth={1.35}
                                />
                            </div>
                            <h3 className="font-display text-base font-bold mb-2 group-hover:text-[#d4af37] transition-colors">
                                {feat.title}
                            </h3>
                            <p className="font-body text-sm text-white/35 leading-relaxed">
                                {feat.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

    )
};
