import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Помощь | Secret People',
  description: 'Как пользоваться каталогом и сервисом Secret People.',
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return children;
}
