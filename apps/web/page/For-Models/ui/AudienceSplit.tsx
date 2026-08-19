import { Check } from "lucide-react"
import Link from "next/link"

const MODEL_ITEMS = ['Бесплатная анкета', 'Новые обращения', 'Чат с клиентами', 'Бронирование', 'Безопасная сделка', 'Конфиденциальность', 'Верификация']
const MANAGER_ITEMS = ['Можно добавить несколько моделей', 'Бесплатное размещение', 'Помощь с оформлением', 'Дополнительный канал привлечения клиентов', 'Бронирования через платформу', 'Безопасная сделка', 'Единое управление анкетами и обращениями'];

export const AudienceSplit = () => {
    return (
        <div className="flex w-full items-center gap-8 py-24 max-[900px]:flex-col">
            <div className="w-[50%] p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03] transition-all duration-300 flex flex-col gap-6 max-[900px]:w-full">
                <div className="flex flex-col gap-3">
                    <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                        Моделям
                    </span>

                    <h4 className="font-display text-2xl">Для моделей</h4>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                        {MODEL_ITEMS.map((item, i) => (
                            <div className="flex items-center gap-2" key={i}>
                                <Check size={18} color="#d4af37" />
                                <p className="font-body text-lg text-white/40 leading-relaxed">{item}</p>
                            </div>
                        ))}
                    </div>


                    <Link href="/login?tab=register&role=model" className="site-header-cta-enter inline-flex max-w-[200px]">
                        <span className="site-header-cta-enter__label">Создать анкету</span>
                    </Link>
                </div>
            </div>

            <div className="w-[50%] p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03] transition-all duration-300 flex flex-col gap-6 max-[900px]:w-full">
                <div className="flex flex-col gap-3">
                    <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                        Менеджерам
                    </span>

                    <h4 className="font-display text-2xl">Для менеджеров</h4>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                        {MANAGER_ITEMS.map((item, i) => (
                            <div className="flex items-center gap-2" key={i}>
                                <Check size={18} color="#d4af37" />
                                <p className="font-body text-lg text-white/40 leading-relaxed">{item}</p>
                            </div>
                        ))}
                    </div>

                    <Link href="/login?tab=register&role=manager" className="site-header-cta-enter inline-flex max-w-[200px]">
                        <span className="site-header-cta-enter__label">Добавить моделей</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}