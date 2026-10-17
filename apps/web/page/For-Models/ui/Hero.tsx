"use client";

import { FC } from "react";
import Link from "next/link"
import Image from "next/image"
import { Check } from "lucide-react"
import { ymGoal } from "@/lib/metrika"
import { MAIN_FULL_BLEED_GUTTER_CLASS } from './mainSectionClasses';

/** Основной режим: фото страницы «Для моделей». */
const MAIN_HERO_IMAGE = '/images/for-models-hero.png';

/**
 * Позиция фото в кадре. По горизонтали 68% — держим фигуру (она справа в кадре),
 * по вертикали top — кадр опущен вниз: верх фото (голова) не срезается на широких экранах.
 */
const MAIN_HERO_IMAGE_POSITION = 'object-[68%_top]';

/**
 * Телефон: герой во всю высоту экрана, поэтому снимок обрезается по высоте и в кадр
 * попадает только ~26% его ширины. Окно сдвигаем правее (72%), чтобы фигура и лицо
 * оказались в центре, а не у левого края.
 */
const MAIN_HERO_IMAGE_POSITION_MOBILE = 'max-[610px]:object-[72%_top]';

interface IProps {
    mode: 'main' | 'massage';
}

export const Hero: FC<IProps> = ({ mode }) => {
    const isMassageMode = mode === 'massage';

    /* Основной режим — макет «Для моделей и менеджеров»: текст на затемнённой левой части фото. */
    if (!isMassageMode) {
        return (
            /* Во всю ширину окна без w-screen: секция — прямой ребёнок <main> (он без отступов),
               поэтому внутренний контейнер встаёт на одну вертикаль с секциями ниже и страница
               не переполняется по ширине на полосу прокрутки. */
            <section className="relative w-full overflow-hidden">
                {/* До 610px герой занимает всю видимую высоту: 100svh минус шапка страницы
                    (она в потоке, 70px) — вместе они дают ровно один экран, поэтому кнопки
                    остаются выше сгиба, а следующая секция начинается за ним. Текст прижат
                    к нижнему краю: верх кадра остаётся фотографии. */}
                <div className="relative flex min-h-[min(760px,calc(100svh-70px))] items-center overflow-hidden max-[610px]:min-h-[calc(100svh-70px)] max-[610px]:items-end">
                    <Image
                        src={MAIN_HERO_IMAGE}
                        alt="Модель My Muse"
                        fill
                        priority
                        quality={90}
                        sizes="100vw"
                        className={`object-cover ${MAIN_HERO_IMAGE_POSITION} ${MAIN_HERO_IMAGE_POSITION_MOBILE}`}
                    />

                    {/* До lg текст занимает почти всю ширину кадра, поэтому затемняем фото по вертикали:
                        иначе конец строк уходил бы на светлую часть снимка. На телефоне текст стоит
                        у нижнего края — градиент разворачиваем снизу вверх, верх кадра с фигурой светлее.
                        От lg текст живёт в левой половине, и хватает горизонтального градиента. */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/10 max-[1023px]:bg-gradient-to-b max-[1023px]:from-black/95 max-[1023px]:via-black/80 max-[1023px]:to-black/55 max-[610px]:bg-gradient-to-t max-[610px]:from-black/90 max-[610px]:via-black/45 max-[610px]:to-black/25" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

                    <p className="pointer-events-none absolute right-8 top-10 hidden text-right font-body text-[10px] font-semibold uppercase leading-[1.8] tracking-[0.24em] text-white/60 lg:block">
                        Уверенность
                        <br />
                        в каждой
                        <br />
                        встрече
                    </p>

                    <div className={`relative mx-auto w-full max-w-[1400px] pb-14 pt-20 sm:py-16 md:py-24 ${MAIN_FULL_BLEED_GUTTER_CLASS}`}>
                        <div className="max-w-[700px]">
                            <span className="inline-block font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]/75 border border-[#d4af37]/35 rounded px-3 py-1 md:text-[11px]">
                                Для моделей и менеджеров
                            </span>

                            <h1 className="mt-6 font-display text-[1.75rem] font-extrabold leading-[1.12] text-white drop-shadow-md sm:text-[2.25rem] md:text-[3rem] lg:text-[3.5rem]">
                                Договорённость о встрече ещё не гарантирует оплату
                            </h1>

                            <p className="mt-5 max-w-[600px] font-body text-sm leading-relaxed text-white/70 md:text-lg">
                                Клиент может обещать оплату, а после встречи отказаться платить. В My Muse сумма
                                резервируется на его карте заранее — при бронировании.
                            </p>

                            <div className="mt-7 flex flex-wrap items-center gap-4 max-[610px]:w-full max-[610px]:flex-col">
                                <Link
                                    href="/login?tab=register&role=model"
                                    className="btn-primary btn-hero-frosted justify-center max-[610px]:w-full"
                                    onClick={() => ymGoal('register_cta_click', { role: 'model', section: 'hero' })}
                                >
                                    <span className="site-header-cta-enter__label !text-[13px]">
                                        Разместить анкету
                                    </span>
                                </Link>
                                {/* Вторая кнопка — тот же .btn-secondary, что «Добавить моделей»
                                    в карточке «Единый кабинет менеджера» на этой же странице. */}
                                <Link
                                    href="/login?tab=register&role=manager"
                                    className="btn-secondary justify-center max-[610px]:w-full"
                                    onClick={() => ymGoal('register_cta_click', { role: 'manager', section: 'hero' })}
                                >
                                    <span className="site-header-cta-enter__label !text-[13px]">
                                        Добавить моделей
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const heroImage = '/images/for-models-hero-massage.png';
    const badgeLabel = 'Для массажных мастеров и студий';
    const subTitle = 'Бесплатное размещение профиля, удобное общение и новые обращения от пользователей.';
    const buttonText = 'Добавить несколько мастеров';

    return (
        <div className="w-full">
            <div className="relative left-1/2 right-1/2 -mx-[50vw] flex w-screen min-h-[max(100vh,920px)] flex-col justify-end overflow-hidden">
                <Image
                    src={heroImage}
                    alt="My Muse"
                    fill
                    priority
                    quality={90}
                    sizes="(max-width: 768px) 180vw, 100vw"
                    className="object-cover object-top max-[1400px]:object-[75%_50%]"
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />

                <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-14 px-[20px] py-24 pb-36 max-[610px]:gap-10 max-[610px]:px-5 max-[610px]:py-14">
                    <div className="flex flex-col gap-6">
                        <span className="inline-block w-fit font-body text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]/75 border border-[#d4af37]/35 rounded px-3 py-1">
                            {badgeLabel}
                        </span>

                        <h1 className="font-display font-extrabold leading-[1.05] max-w-[865px] max-[610px]:leading-[1.2]">
                            <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.75rem] lg:text-[4.75rem] text-white drop-shadow-md">
                                Бесплатно получайте новых клиентов через
                            </span>
                            <span className="block text-[1.65rem] sm:text-[2.5rem] md:text-[3.75rem] lg:text-[4.75rem] text-gradient-gold">
                                My Muse
                            </span>
                        </h1>

                        <p className="font-body text-base md:text-xl text-white/60 max-w-[650px] sm:max-w-sm md:max-w-2xl leading-relaxed">
                            {subTitle}
                        </p>
                    </div>

                    <div className="flex flex-col gap-6 max-[610px]:gap-6">
                        <div className="flex flex-wrap items-center gap-5 max-[610px]:flex-col">
                            <Link
                                href="/login?tab=register&role=model"
                                className="btn-primary btn-hero-frosted max-[610px]:w-full"
                                onClick={() => ymGoal('register_cta_click', { role: 'model', section: 'hero' })}
                            >
                                <span className="site-header-cta-enter__label !text-[13px]">
                                    Разместить анкету
                                </span>
                            </Link>
                            <Link
                                href="/login?tab=register&role=manager"
                                className="btn-secondary btn-hero-frosted-secondary max-[610px]:w-full"
                                onClick={() => ymGoal('register_cta_click', { role: 'manager', section: 'hero' })}
                            >
                                {buttonText}
                            </Link>
                            <div className="flex items-center gap-3 max-[610px]:mt-2">
                                <Check color="green" size={18} className="shrink-0" />
                                <p className="font-body text-base text-white/60 leading-relaxed">Регистрация и размещение бесплатно</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce max-[610px]:hidden">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="2">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                </div>
            </div>
        </div>
    )
}
