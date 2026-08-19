import { Advantages } from "@/page/For-Models/ui/Advantages"
import { AudienceSplit } from "@/page/For-Models/ui/AudienceSplit"
import { ExampleProfile } from "@/page/For-Models/ui/ExampleProfile"
import { FAQ } from "@/page/For-Models/ui/FAQ"
import { FinalCTA } from "@/page/For-Models/ui/FinalCTA"
import { Footer } from "@/page/For-Models/ui/Footer"
import { Header } from "@/page/For-Models/ui/Header"
import { Hero } from "@/page/For-Models/ui/Hero"
import { HowItWorks } from "@/page/For-Models/ui/HowItWorks"
import { SafeDeal } from "@/page/For-Models/ui/SafeDeal"
import { SocialProof } from "@/page/For-Models/ui/SocialProof"

export default function ForModelsPage() {
    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden">
            <Header />
            <main className="mx-auto max-w-[1400px] px-[20px]">
                <Hero />
                <Advantages />
                <HowItWorks />
                <AudienceSplit />
                <SafeDeal />
                <SocialProof />
                <ExampleProfile />
                <FAQ />
                <FinalCTA />
            </main>
            <Footer />
        </div>
    )
}