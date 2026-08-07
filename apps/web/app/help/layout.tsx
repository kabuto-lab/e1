import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Помощь | My Muse',
  description: 'Как пользоваться каталогом и сервисом My Muse.',
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return children;
}
