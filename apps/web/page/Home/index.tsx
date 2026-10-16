'use client';

import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { useMassageMode } from '@/hooks/useMassageMode';
import { About, Catalog, CTA, Hero } from '@/page/Home/ui';
import { DealSteps, HomeFAQ, Protection, Support, Verification } from './ui/TrustContent';
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
                <About />
            ) : (
                <>
                    <DealSteps />
                    <Protection />
                    <Verification />
                </>
            )}

            <Catalog initialCatalog={initialCatalog} />

            {massage.enabled ? null : (
                <>
                    <Support />
                    <HomeFAQ />
                </>
            )}

            <CTA />

            <div id="contact">
                <Footer variant="home" />
            </div>
        </div>
    )
};
