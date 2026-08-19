import { ArrowRight } from "lucide-react";

const FlowStep = ({ text, highlighted }: { text: string; highlighted?: boolean }) => (
    <div
        className={`rounded-xl px-6 py-4 text-center font-body text-base font-semibold border ${highlighted
            ? "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]"
            : "border-white/[0.06] bg-[#1a1a1a] text-white"
            }`}
    >
        {text}
    </div>
)

export const SafeDeal = () => {
    return (
        <div
            className="p-16 rounded-2xl border border-[#d4af37]/15 max-[650px]:px-3"
            style={{ background: "radial-gradient(circle at 30% 20%, rgba(212,175,55,0.06), transparent 60%), #101010" }}
        >
            <div className="flex flex-col gap-12">
                <div className="w-full text-center flex flex-col gap-3">
                    <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                        Гарантия платформы
                    </span>

                    <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">
                        Безопасная сделка
                    </h2>
                </div>

                <div className="flex flex-col gap-10">
                    <div className="flex flex-wrap items-center justify-center gap-3 max-[720px]:flex-col">
                        <FlowStep text="Клиент бронирует" />
                        <ArrowRight className="h-5 w-5 shrink-0 text-[#d4af37] max-[720px]:rotate-90" />
                        <FlowStep text="Оплачивает через My Muse" />
                        <ArrowRight className="h-5 w-5 shrink-0 text-[#d4af37] max-[720px]:rotate-90" />
                        <FlowStep text="Заказ выполняется" />
                        <ArrowRight className="h-5 w-5 shrink-0 text-[#d4af37] max-[720px]:rotate-90" />
                        <FlowStep text="Выплата исполнителю / менеджеру" highlighted />
                    </div>

                    <p className="text-center font-body text-base text-white/50">
                        Комиссия платформы — <span className="font-bold text-[#d4af37]">5%</span> только с состоявшейся сделки.
                    </p>
                </div>
            </div>
        </div>
    )
}