"use client";

import { useAuthOrGuest } from "@/components/AuthProvider";
import Logo from "@/components/Logo";
import Link from "next/link";

export const Header = () => {
    const { user, loading, privateAreaHref, privateAreaLabel } = useAuthOrGuest();

    return (
        <header className="max-w-[1400px] mx-auto flex w-full items-center justify-between py-[16px] px-[20px] h-[70px]">
            <Link href="/" className="-translate-y-px shrink-0 text-xl leading-none" aria-label="На главную">
                <Logo />
            </Link>

            <div className="flex items-center gap-4">
                {loading ? (
                    <div className="h-9 w-[92px] animate-pulse rounded-full bg-white/[0.06]" aria-hidden />
                ) : (
                    <>
                        {!user && <p className="max-[470px]:hidden">Уже есть аккаунт?</p>}

                        <Link href={privateAreaHref} className="site-header-cta-enter inline-flex">
                            <span className="site-header-cta-enter__label">{privateAreaLabel}</span>
                        </Link>
                    </>
                )}
            </div>
        </header>
    )
}