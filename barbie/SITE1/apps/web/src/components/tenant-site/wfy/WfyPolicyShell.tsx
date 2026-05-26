/**
 * WfyPolicyShell — статичная страница политики конфиденциальности для
 * wfy-city-dir тенантов. Placeholder-контент; реальный текст потом будет
 * лежать в cms_pages с slug='policy' и рендериться через EdRenderer.
 *
 * Связано с MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase C.
 */
import Link from 'next/link';

export function WfyPolicyShell({ tenantSlug, tenantName }: { tenantSlug: string; tenantName: string }) {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <Link href={`/${tenantSlug}`} className="text-sm text-white/60 hover:text-white">
            ← На главную
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">Политика конфиденциальности</h1>
        <p className="mt-2 text-sm text-white/50">
          {tenantName} · версия от{' '}
          {new Date().toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <div className="mt-8 space-y-4 text-sm text-white/70">
          <p>
            Заполняя форму на&nbsp;сайте, вы&nbsp;даёте согласие на&nbsp;обработку
            персональных данных согласно ФЗ&nbsp;№152-ФЗ. Данные используются
            исключительно для связи по&nbsp;вопросам трудоустройства.
          </p>
          <p>
            Контактные данные (имя, телефон, email) хранятся до&nbsp;момента
            принятия решения по&nbsp;вашей заявке либо до&nbsp;вашего отзыва согласия.
          </p>
          <p>
            Для отзыва согласия напишите на&nbsp;email указанный в&nbsp;контактах
            тенанта на&nbsp;главной странице.
          </p>
        </div>
      </article>
      <footer className="px-6 py-10">
        <div className="mx-auto max-w-5xl text-center text-xs text-white/40">
          © {new Date().getFullYear()} {tenantName}
        </div>
      </footer>
    </main>
  );
}
