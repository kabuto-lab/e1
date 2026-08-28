"use client";

import { Check, User, Users } from "lucide-react"
import Link from "next/link"
import { FC } from "react";
import { ymGoal } from "@/lib/metrika"

const MODEL_ITEMS = ['Бесплатная анкета', 'Новые обращения', 'Чат с клиентами', 'Бронирование', 'Безопасная сделка', 'Конфиденциальность', 'Верификация']
const MANAGER_ITEMS = ['Можно добавить несколько моделей', 'Бесплатное размещение', 'Помощь с оформлением', 'Дополнительный канал привлечения клиентов', 'Бронирования через платформу', 'Безопасная сделка', 'Единое управление анкетами и обращениями'];
const MASSAGE_MODEL_ITEMS = ['Персональный профиль', 'Фотографии и описание', 'Направления массажа', 'Новые обращения','Отзывы', 'Удобное общение'];
const MASSAGE_MANAGER_ITEMS = ['Размещение нескольких мастеров', 'Единое управление профилями', 'Помощь с оформлением', 'Дополнительный канал привлечения', 'Работа с обращениями'];

interface IAudienceCardProps {
    icon: React.ReactNode;
    eyebrow: string;
    title: string;
    items: string[];
    href: string;
    cta: string;
    role: 'model' | 'manager';
}

const AudienceCard = ({ icon, eyebrow, title, items, href, cta, role }: IAudienceCardProps) => (
    <div className="flex w-[50%] flex-col gap-8 rounded-2xl border border-white/[0.06] bg-[#141414] p-8 transition-all duration-300 hover:border-[#d4af37]/25 max-[900px]:w-full">
        {/* Header */}
        <div className="flex items-center justify-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d4af37]/10 text-[#d4af37]">
                {icon}
            </div>
            <div className="flex flex-col gap-1.5 text-left">
                <span className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
                    {eyebrow}
                </span>
                <h4 className="font-display text-2xl font-bold text-white">{title}</h4>
            </div>
        </div>

        <div className="h-px w-full bg-white/[0.06]" />

        {/* Checklist */}
        <div className="flex flex-1 flex-col gap-3">
            {items.map((item, i) => (
                <div className="flex items-center gap-3" key={i}>
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/10">
                        <Check size={12} className="text-[#d4af37]" strokeWidth={3} />
                    </div>
                    <p className="font-body text-[15px] text-white/55 leading-relaxed">{item}</p>
                </div>
            ))}
        </div>

        <Link
            href={href}
            className="site-header-cta-enter mt-auto inline-flex w-full justify-center"
            onClick={() => ymGoal('register_cta_click', { role, section: 'audience_split' })}
        >
            <span className="site-header-cta-enter__label">{cta}</span>
        </Link>
    </div>
)

interface IProps {
    mode: 'main' | 'massage';
}

export const AudienceSplit: FC<IProps> = ({ mode }) => {
    const isMassageMode = mode === 'massage';
    
    return (
        <div className="flex w-full items-stretch gap-6 py-24 max-[900px]:flex-col">
            <AudienceCard
                icon={<User className="h-7 w-7" strokeWidth={1.5} />}
                eyebrow={isMassageMode ? 'Мастерам' : 'Моделям'}
                title={isMassageMode ? 'Для мастеров' : 'Для моделей'}
                items={isMassageMode ? MASSAGE_MODEL_ITEMS : MODEL_ITEMS}
                href="/login?tab=register&role=model"
                cta="Создать анкету"
                role="model"
            />
            <AudienceCard
                icon={<Users className="h-7 w-7" strokeWidth={1.5} />}
                eyebrow={isMassageMode ? 'Студиям' : 'Менеджерам'}
                title={isMassageMode ? 'Для студий и администраторов' : 'Для менеджеров'}
                items={isMassageMode ? MASSAGE_MANAGER_ITEMS : MANAGER_ITEMS}
                href="/login?tab=register&role=manager"
                cta={isMassageMode ? 'Добавить мастеров' : 'Добавить моделей'}
                role="manager"
            />
        </div>
    )
}
