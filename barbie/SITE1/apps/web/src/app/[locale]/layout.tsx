import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';

/**
 * Локале-layout: оборачивает все публичные tenant-страницы в
 * NextIntlClientProvider (словарь текущей локали → useTranslations в клиентских
 * островах). `<html>`/`<body>` остаются в корневом app/layout.tsx (общие с /admin).
 * generateStaticParams перечисляет локали (ru/en/zh).
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const messages = await getMessages();
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
