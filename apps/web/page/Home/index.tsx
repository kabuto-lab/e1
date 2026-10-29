'use client';

import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { useMassageMode } from '@/hooks/useMassageMode';
import { About, Catalog, CTA, Hero } from '@/page/Home/ui';
import { HomeFAQ, SafeDeal, Support, Verification } from './ui/TrustContent';
import { Profile } from "@/types/model";

interface IProps {
    initialCatalog: Profile[]
}

export const Home = ({ initialCatalog }: IProps) => {
    const massage = useMassageMode();

    return (
        <div className="bg-[#0a0a0a] text-white">
            <Navbar />
            <Hero />

            {massage.enabled ? (
                <>
                    <About />
                    <Catalog initialCatalog={initialCatalog} />
                </>
            ) : (
                <>
                    {/* Каталог — сразу под первым экраном, «Подтверждённые профили» —
                        сразу за каталогом, «Безопасная сделка» (карточки + шаги, объединено
                        из бывших Protection/DealSteps) следом. */}
                    <Catalog initialCatalog={initialCatalog} />
                    <Verification />
                    <SafeDeal />
                </>
            )}

            {massage.enabled ? null : (
                <>
                    {/* Сначала вопросы и ответы, затем поддержка — для тех, кто ответа не нашёл. */}
                    <HomeFAQ />
                    <Support />
                </>
            )}

            <CTA />

            <div id="contact">
                <Footer variant="home" />
            </div>
        </div>
    )
};
