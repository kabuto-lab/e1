import { Footer } from "@/components/Footer";
import { serverFetchMassageMode } from "@/lib/api-server";
import { Advantages, AudienceSplit, ExampleProfile, FAQ, FinalCTA, Header, Hero, HowItWorks, SafeDeal, SocialProof } from "@/page/For-Models/ui";

export default async function ForModelsPage() {
    const { landingMode } = await serverFetchMassageMode();

    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden">
            <Header />
            <main className="mx-auto max-w-[1400px] px-[20px]">
                <Hero mode={landingMode} />
                <Advantages mode={landingMode} />
                <HowItWorks mode={landingMode} />
                <AudienceSplit mode={landingMode} />
                <SafeDeal />
                <SocialProof />
                <ExampleProfile mode={landingMode} />
                <FAQ mode={landingMode} />
                <FinalCTA mode={landingMode} />
            </main>
            <Footer />
        </div>
    )
}