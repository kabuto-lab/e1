'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Clock, Mail, MessageSquare, Phone } from 'lucide-react';
import { ymGoal } from '@/lib/metrika';

/** Действующие каналы поддержки — держим в одном месте, чтобы не расходились с подвалом и главной. */
const SUPPORT_PHONE_DISPLAY = '+7 (916) 861-45-08';
const SUPPORT_PHONE_HREF = 'tel:+79168614508';
const SUPPORT_EMAIL = 'ssuppor7mail@yandex.ru';
const SUPPORT_HOURS = 'Ежедневно с 10:00 до 20:00 (МСК)';

/** Темы обращения — по ТЗ страницы поддержки. */
const SUBJECTS = ['Бронирование', 'Оплата', 'Отмена или спор', 'Профиль модели', 'Другой вопрос'] as const;

const fieldCls =
    'w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-4 py-3 font-body text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/40';
const labelCls = 'mb-2 block font-body text-xs uppercase tracking-wider text-white/35';
const selectCls = `${fieldCls} [&>option]:bg-[#141414] [&>option]:text-white`;

export const Contacts = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [bookingNumber, setBookingNumber] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        try {
            const response = await fetch('/api/contact/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    subject,
                    bookingNumber: bookingNumber.trim() || undefined,
                    message: message.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setSuccess(true);
            ymGoal('contact_form_submit');

            setName('');
            setEmail('');
            setSubject('');
            setBookingNumber('');
            setMessage('');
        } catch {
            setError('Не удалось отправить сообщение. Попробуйте ещё раз или свяжитесь с нами другим способом.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12 md:px-10 md:py-16">
            {/* Блок 1. Заголовок */}
            <header className="max-w-2xl">
                <h1 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">
                    Поддержка My Muse
                </h1>
                <p className="mt-4 font-body text-base leading-relaxed text-white/60">
                    Поможем с бронированием, оплатой и вопросами по работе платформы.
                </p>
            </header>

            {/* Блок 2. Способы связи */}
            <section className="mt-10 md:mt-12" aria-label="Способы связи">
                <div className="grid gap-5 md:grid-cols-3">
                    <a
                        href={SUPPORT_PHONE_HREF}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 transition-colors hover:border-[#d4af37]/35"
                    >
                        <span className="flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-[0.14em] text-[#d4af37]">
                            <Phone className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                            Телефон
                        </span>
                        <span className="mt-3 block font-display text-lg font-semibold text-white">
                            {SUPPORT_PHONE_DISPLAY}
                        </span>
                        <span className="mt-1 block font-body text-xs text-white/40">Позвонить в поддержку</span>
                    </a>

                    <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 transition-colors hover:border-[#d4af37]/35"
                    >
                        <span className="flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-[0.14em] text-[#d4af37]">
                            <Mail className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                            Email
                        </span>
                        <span className="mt-3 block break-all font-display text-lg font-semibold text-white">
                            {SUPPORT_EMAIL}
                        </span>
                        <span className="mt-1 block font-body text-xs text-white/40">Написать письмо</span>
                    </a>

                    <Link
                        href="/cabinet/messages"
                        className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 transition-colors hover:border-[#d4af37]/35"
                    >
                        <span className="flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-[0.14em] text-[#d4af37]">
                            <MessageSquare className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                            Сообщения
                        </span>
                        <span className="mt-3 block font-display text-lg font-semibold text-white">
                            Чат в личном кабинете
                        </span>
                        <span className="mt-1 block font-body text-xs text-white/40">
                            Для авторизованных — переписка внутри платформы
                        </span>
                    </Link>
                </div>

                <p className="mt-5 flex items-center gap-2 font-body text-sm text-white/55">
                    <Clock className="h-4 w-4 text-[#d4af37]/80" strokeWidth={1.8} aria-hidden />
                    Время работы поддержки: {SUPPORT_HOURS}
                </p>
            </section>

            {/* Блок 3. Форма обращения */}
            <section className="mx-auto mt-12 w-full max-w-[720px] md:mt-16" aria-label="Форма обращения">
                <h2 className="text-center font-display text-2xl font-bold text-white md:text-3xl">Напишите нам</h2>
                <p className="mt-3 text-center font-body text-sm leading-relaxed text-white/60">
                    Опишите вопрос. Ответ отправим на указанный email.
                </p>

                <div className="card mt-6 !border-white/[0.06] !bg-[#141414]/80 p-6 backdrop-blur-xl md:p-8">
                    {success && (
                        <div
                            className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-body text-sm text-emerald-200/90"
                            role="status"
                        >
                            Сообщение отправлено. Ответ придёт на указанный email
                        </div>
                    )}

                    {error && (
                        <div
                            className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-body text-sm text-red-200/90"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label htmlFor="contact-name" className={labelCls}>
                                    Как к вам обращаться
                                </label>
                                <input
                                    id="contact-name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    minLength={2}
                                    maxLength={120}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={fieldCls}
                                    placeholder="Например, Анна"
                                />
                            </div>

                            <div>
                                <label htmlFor="contact-email" className={labelCls}>
                                    Email для ответа
                                </label>
                                <input
                                    id="contact-email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={fieldCls}
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label htmlFor="contact-subject" className={labelCls}>
                                    Тема обращения
                                </label>
                                <select
                                    id="contact-subject"
                                    required
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">Выберите тему</option>
                                    {SUBJECTS.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="contact-booking" className={labelCls}>
                                    Номер бронирования <span className="text-white/25">(необязательно)</span>
                                </label>
                                <input
                                    id="contact-booking"
                                    type="text"
                                    maxLength={64}
                                    value={bookingNumber}
                                    onChange={(e) => setBookingNumber(e.target.value)}
                                    className={fieldCls}
                                    placeholder="Например, из письма или кабинета"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="contact-message" className={labelCls}>
                                Сообщение
                            </label>
                            <textarea
                                id="contact-message"
                                required
                                minLength={10}
                                maxLength={5000}
                                rows={6}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className={`${fieldCls} min-h-[140px] resize-y`}
                                placeholder="Расскажите, что произошло и какая помощь нужна."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary mt-2 w-full justify-center disabled:pointer-events-none disabled:opacity-50"
                        >
                            <span className="site-header-cta-enter__label !text-[13px]">
                                {loading ? 'Отправка…' : 'Отправить сообщение'}
                            </span>
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
};
