import { Check } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export const Hero = () => (
    <div className="w-full">
        <div className="relative left-1/2 right-1/2 -mx-[50vw] flex w-screen min-h-[80vh] flex-col justify-end overflow-hidden max-[610px]:min-h-[52vh]">
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

            <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-[20px] pb-16 md:pb-20 max-[610px]:px-5 max-[610px]:pb-12">
                <div className="w-full">
                    <span className="inline-block font-body text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]/75 border border-[#d4af37]/35 rounded px-3 py-1 mb-4">
                        Для моделей и менеджеров
                    </span>

                    <h1 className="font-display font-extrabold leading-[1.05] max-w-[720px]">
                        <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] text-white drop-shadow-md">
                            Получайте новых  клиентов через
                        </span>
                        <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] text-gradient-gold">
                            My Muse
                        </span>
                    </h1>
                </div>

                <p className="font-body text-[14px] md:text-base text-white/55 mb-7 md:mb-9 max-w-[650px] sm:max-w-sm md:max-w-xl leading-relaxed">
                    Платформа персонального сопровождения 18+ для моделей и менеджеров. Бесплатное размещение анкет, безопасная сделка и комиссия 5% только с состоявшейся сделки.
                </p>

                <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-4 max-[610px]:flex-col">
                        <Link href="/login?tab=register&role=model" className="btn-primary btn-hero-frosted max-[610px]:w-full">
                            <span className="site-header-cta-enter__label !text-[13px]">
                                Разместить анкету
                            </span>
                        </Link>
                        <Link href="/login?tab=register&role=manager" className="btn-secondary btn-hero-frosted-secondary max-[610px]:w-full">
                            Добавить несколько моделей
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Check color="green" size={18} />
                        <p className="font-body text-[14px] md:text-base text-white/55 leading-relaxed">Регистрация и размещение бесплатно</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
)