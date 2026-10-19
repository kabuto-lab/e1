import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { serverFetchMassageMode } from "@/lib/api-server";
import {
    Advantages,
    AudienceSplit,
    ExampleProfile,
    FAQ,
    FinalCTA,
    Hero,
    HowItWorks,
    MainAccounts,
    MainFaq,
    MainFinalCta,
    MainPayout,
    MainTerms,
    SafeDeal,
    SocialProof,
} from "@/page/For-Models/ui";

export default async function ForModelsPage() {
    const { landingMode } = await serverFetchMassageMode();
    const isMassageMode = landingMode === 'massage';

    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden">
            {/* Та же шапка, что на главной: закреплена сверху, прозрачная над героем и с фоном при прокрутке. */}
            <Header variant="home" />
            <main className={isMassageMode ? 'mx-auto w-full max-w-[1400px] px-[20px]' : 'w-full'}>
                {isMassageMode ? (
                    <>
                        <Hero mode={landingMode} />
                        <Advantages mode={landingMode} />
                        <HowItWorks mode={landingMode} />
                        <AudienceSplit mode={landingMode} />
                        <SafeDeal />
                        <SocialProof />
                        <ExampleProfile mode={landingMode} />
                        <FAQ mode={landingMode} />
                        <FinalCTA mode={landingMode} />
                    </>
                ) : (
                    /* Основной режим — макет «Для моделей и менеджеров»: оплата, условия, карточки, вопросы, финальный CTA.
                       Герой и финальный CTA — во всю ширину окна, поэтому они лежат вне контейнера с отступами,
                       а контентные секции — внутри него (раньше полноэкранные блоки выходили за окно через
                       w-screen: из-за полосы прокрутки текст героя смещался на пол-скроллбара). */
                    <>
                        <Hero mode={landingMode} />
                        <div className="mx-auto w-full max-w-[1400px] px-[20px]">
                            <MainPayout />
                            <MainTerms />
                            <MainAccounts />
                            <MainFaq />
                        </div>
                        <MainFinalCta />
                    </>
                )}
            </main>
            <Footer />
        </div>
    )
}
