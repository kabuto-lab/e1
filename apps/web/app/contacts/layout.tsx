import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Поддержка — My Muse',
  description: 'Поможем с бронированием, оплатой и вопросами по работе платформы.',
};

export default function ContactsLayout({ children }: { children: ReactNode }) {
  return children;
}
