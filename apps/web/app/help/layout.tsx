import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Помощь | Lovnge',
  description: 'Как пользоваться каталогом и сервисом Lovnge.',
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return children;
}
