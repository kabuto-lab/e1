import Logo from "@/components/Logo"
import Link from "next/link"

export const Footer = () => (
    <footer className="flex w-full border-t border-white/[0.04] py-6 px-[20px]">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto w-full">
            <Link href="/">
                <Logo />
            </Link>

            <p>© 2026 My Muse</p>
        </div>
    </footer>
)