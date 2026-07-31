import { redirect } from 'next/navigation';

/** Управление мастерами перенесено на верхний уровень: /dashboard/masters. */
export default function MassageMastersRedirectPage() {
  redirect('/dashboard/masters');
}
