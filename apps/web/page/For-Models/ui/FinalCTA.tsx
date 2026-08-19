import Link from "next/link";

export const FinalCTA = () => (
    <div className="flex flex-col gap-12 py-24 items-center">
        <div className="flex flex-col gap-7 items-center">
            <h1 className="font-display font-extrabold leading-[1.05] text-center">
                <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] text-white drop-shadow-md">
                    Подключитесь к
                </span>
                <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] text-gradient-gold">
                    My Muse
                </span>
            </h1>

            <p className="font-body text-center text-base md:text-lg text-white/50 mb-7 md:mb-9 max-w-[650px] leading-relaxed">
                Разместите одну анкету или добавьте сразу несколько моделей. Размещение бесплатно, комиссия взимается только с состоявшейся сделки.
            </p>
        </div>


        <div className="flex flex-col gap-5 w-full">
            <div className="flex items-center justify-center gap-4 max-[610px]:flex-col">
                <Link href="/login?tab=register&role=model" className="btn-primary btn-hero-frosted max-[610px]:w-full">
                    <span className="site-header-cta-enter__label !text-[13px]">
                        Я модель
                    </span>
                </Link>
                <Link href="/login?tab=register&role=manager" className="btn-secondary btn-hero-frosted-secondary max-[610px]:w-full">
                    Я менеджер
                </Link>
            </div>
        </div>
    </div>
)
