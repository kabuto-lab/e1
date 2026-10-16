import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Вопросы и ответы — My Muse',
  description: 'Как проходит бронирование, когда списываются деньги и что делать, если возникла проблема.',
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return children;
}
