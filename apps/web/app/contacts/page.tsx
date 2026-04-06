'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export default function ContactsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as { message?: string | string[] }));
        const msgRaw = errorData.message;
        const msg =
          typeof msgRaw === 'string'
            ? msgRaw
            : Array.isArray(msgRaw)
              ? msgRaw.join('; ')
              : `HTTP ${response.status}`;
        throw new Error(msg);
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить сообщение');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <SiteHeader variant="page" segment={{ crumbs: [{ label: 'Контакты' }] }} />

      <main className="mx-auto max-w-[560px] px-6 py-16 md:py-24">
        <p className="font-body text-white/40 text-center text-sm md:text-base mb-10 leading-relaxed">
          Оставьте сообщение — мы передадим его администратору на{' '}
          <span className="text-[#d4af37]/90">index.g0@gmail.com</span>. Ответ придёт на указанный вами email.
        </p>

        <div className="card !bg-[#141414]/80 backdrop-blur-xl !border-white/[0.06] p-8 md:p-10 hover:!translate-y-0">
          {success && (
            <div
              className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-body text-sm text-emerald-200/90"
              role="status"
            >
              Сообщение отправлено. Спасибо!
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
            <div>
              <label htmlFor="contact-name" className="block font-body text-xs text-white/35 uppercase tracking-wider mb-2">
                Имя
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
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-4 py-3 font-body text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/40"
                placeholder="Как к вам обращаться"
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="block font-body text-xs text-white/35 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-4 py-3 font-body text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/40"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="block font-body text-xs text-white/35 uppercase tracking-wider mb-2">
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
                className="w-full resize-y min-h-[140px] rounded-lg bg-white/[0.04] border border-white/[0.08] px-4 py-3 font-body text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/40"
                placeholder="Текст обращения..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              <span className="site-header-cta-enter__label !text-[13px]">
                {loading ? 'Отправка…' : 'Отправить'}
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
