/**
 * Корневая страница CRM-платформы. Phase 0 — заглушка, статус bootstrap'а.
 * После Auth-модуля (Stage 7) → redirect на /login или /dashboard.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <div className="font-mono text-xs tracking-widest text-text-mute">
          N · A · S · 0.0.1
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          NAS · Network Administration System
        </h1>
        <p className="text-text-mute leading-relaxed">
          Платформа сейчас в bootstrap-фазе. API слушает на{' '}
          <a
            href="/api/v1/health"
            className="text-accent underline underline-offset-4 hover:opacity-80"
          >
            /api/v1/health
          </a>
          , Swagger — на <code className="font-mono text-sm">http://localhost:3010/api/docs</code>.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-6 text-left text-sm">
          <Status label="API" hint=":3010" />
          <Status label="WEB" hint=":3011" />
          <Status label="POSTGRES" hint=":5442" />
          <Status label="REDIS" hint=":6389" />
          <Status label="MINIO" hint=":9011 / :9012" />
          <Status label="MAILHOG" hint=":8035 SMTP, :8025 UI" />
        </div>
        <div className="font-mono text-xs text-text-mute pt-6">
          См. <code>SESSION_LOG.md</code> и <code>docs/ARCHITECTURE.md</code> в корне SITE1.
        </div>
      </div>
    </main>
  );
}

function Status({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between rounded border border-border px-3 py-2 bg-surface">
      <span className="font-mono text-xs tracking-wider">{label}</span>
      <span className="font-mono text-xs text-text-mute">{hint}</span>
    </div>
  );
}
