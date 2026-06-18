import { Oswald } from 'next/font/google';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

const oswald = Oswald({ subsets: ['latin', 'cyrillic'], weight: ['500', '600', '700'] });

/**
 * /admin/login — страница входа в «терминальной» NAS-эстетике лендинга /nas:
 * mono-шапка, градиентный заголовок (magenta→cyan), статус-чипы инфраструктуры
 * и карточка AdminLoginForm по центру. Единый стиль с корневым лендингом.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-5">
      <div className="w-full max-w-2xl text-center space-y-4">
        <div className="font-mono text-[11px] tracking-widest text-text-mute">N · A · S · 0.0.1</div>

        <h1 className={`${oswald.className} text-2xl font-bold tracking-tight`}>
          NAS · Network Administration System
        </h1>

        <div className="grid grid-cols-2 gap-2 text-left text-sm">
          <Status label="API" hint=":5110" />
          <Status label="WEB" hint=":5111" />
          <Status label="POSTGRES" hint=":5442" />
          <Status label="REDIS" hint=":6389" />
          <Status label="MINIO" hint=":9011 / :9012" />
          <Status label="MAILHOG" hint=":8035 SMTP, :8025 UI" />
        </div>

        <div className="pt-2 flex justify-center">
          <AdminLoginForm />
        </div>

        <div className="font-mono text-[11px] text-text-mute">
          См. <code>SESSION_LOG.md</code> и <code>docs/ARCHITECTURE.md</code> в корне SITE1.
        </div>
      </div>
    </main>
  );
}

function Status({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 bg-surface">
      <span className="font-mono text-xs tracking-wider">{label}</span>
      <span className="font-mono text-xs text-text-mute whitespace-nowrap">{hint}</span>
    </div>
  );
}
