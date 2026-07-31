import { redirect } from 'next/navigation';

/** Настройки массажного режима перенесены во вкладку «Массажный режим» на /dashboard/settings. */
export default function MassageSettingsRedirectPage() {
  redirect('/dashboard/settings');
}
