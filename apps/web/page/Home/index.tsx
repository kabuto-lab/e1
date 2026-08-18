import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { About, Catalog, CTA, Hero } from '@/page/Home/ui';
import { Profile } from "@/types/model";

interface IProps {
    initialCatalog: Profile[]
}

export const Home = ({ initialCatalog }: IProps) => {
    return (
        <div className="bg-[#0a0a0a] text-white">
            <Navbar />

            {/* HERO */}
            <Hero />

            {/* ABOUT */}
            <About />

            {/* CATALOG PREVIEW */}
            <Catalog initialCatalog={initialCatalog} />

            {/* CTA */}
            <CTA />

            <div id="contact">
                <Footer />
            </div>
        </div>
    )
};
