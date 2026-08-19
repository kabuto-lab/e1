import { Check } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export const Hero = () => (
    <div className="w-full">
        <div className="relative left-1/2 right-1/2 -mx-[50vw] flex w-screen min-h-[max(100vh,920px)] flex-col justify-end overflow-hidden">
            <Image
                src="/images/for-models-hero.png"
                alt="My Muse"
                fill
                priority
                sizes="100vw"
                className="object-cover object-top max-[1400px]:object-[75%_50%]"
            />

            {/* Затемнение снизу — под текст */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            {/* Виньетка по краям */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]" />
            {/* Лёгкое затемнение сверху — под бейдж */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />

            <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-14 px-[20px] py-24 pb-36 max-[610px]:gap-10 max-[610px]:px-5 max-[610px]:py-14">
                <div className="flex flex-col gap-6">
                    <span className="inline-block w-fit font-body text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]/75 border border-[#d4af37]/35 rounded px-3 py-1">
                        Для моделей и менеджеров
                    </span>

                    <h1 className="font-display font-extrabold leading-[1.05] max-w-[820px] max-[610px]:leading-[1.2]">
                        <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.75rem] lg:text-[4.75rem] text-white drop-shadow-md">
                            Получайте новых клиентов через
                        </span>
                        <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.75rem] lg:text-[4.75rem] text-gradient-gold">
                            My Muse
                        </span>
                    </h1>

                    <p className="font-body text-base md:text-xl text-white/60 max-w-[650px] sm:max-w-sm md:max-w-2xl leading-relaxed">
                        Платформа персонального сопровождения 18+ для моделей и менеджеров. Бесплатное размещение анкет, безопасная сделка и комиссия 5% только с состоявшейся сделки.
                    </p>
                </div>

                <div className="flex flex-col gap-6 max-[610px]:gap-6">
                    <div className="flex flex-wrap items-center gap-5 max-[610px]:flex-col">
                        <Link href="/login?tab=register&role=model" className="btn-primary btn-hero-frosted max-[610px]:w-full">
                            <span className="site-header-cta-enter__label !text-[13px]">
                                Разместить анкету
                            </span>
                        </Link>
                        <Link href="/login?tab=register&role=manager" className="btn-secondary btn-hero-frosted-secondary max-[610px]:w-full">
                            Добавить несколько моделей
                        </Link>
                        <div className="flex items-center gap-3 max-[610px]:mt-2">
                            <Check color="green" size={18} className="shrink-0" />
                            <p className="font-body text-base text-white/60 leading-relaxed">Регистрация и размещение бесплатно</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce max-[610px]:hidden">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
            </div>
        </div>
    </div>
)
