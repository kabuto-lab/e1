import { getTranslations } from 'next-intl/server';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Первое знакомство — НЕБОСВОД · спа-салон эротического массажа в Москве',
  description:
    'Первый визит в НЕБОСВОД: при записи на программу от 1,5 часов — массаж горячими апельсинами в подарок. Новый салон у Бауманской. Атмосфера отдыха на высоте.',
};

export default async function Page() {
  const t = await getTranslations('nebesa');
  const tc = await getTranslations('common');
  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <h1 className="h2" style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}>
            {tc('nav.firstMeeting')}
          </h1>
          <p style={{ maxWidth: 760, color: '#3a3d44', fontSize: 17, lineHeight: 1.7, marginTop: 18 }}>
            {t('act.intro')}
          </p>

          <div
            style={{
              marginTop: 40,
              background: '#fff',
              borderRadius: 'var(--r)',
              padding: 'clamp(24px, 4vw, 44px)',
              boxShadow: '0 14px 40px rgba(20, 25, 40, 0.06)',
              color: '#3a3d44',
              fontSize: 16,
              lineHeight: 1.75,
            }}
          >
            <p style={{ margin: 0 }}>
              {t('act.body1')}
            </p>
            <p style={{ marginTop: 16 }}>
              {t('act.body2')}
            </p>
            <p style={{ marginTop: 16 }}>
              {t('act.body3')}
            </p>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 28 }}>
            {t('act.disclaimer')}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              {t('act.bookCta')}
            </a>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}
