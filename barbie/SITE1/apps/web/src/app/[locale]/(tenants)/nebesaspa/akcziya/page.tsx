import { getTranslations } from 'next-intl/server';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Акции — НЕБОСВОД · спа-салон эротического массажа в Москве',
  description:
    'Действующие акции и спецпредложения салона эротического массажа НЕБОСВОД: подарки при первом визите и сезонные предложения. Записывайтесь и уточняйте условия у администратора.',
};

// Акции — реальные предложения с nebesaspa.com (раздел «Акция»).
const OFFER_KEYS = ['vysota120', 'pervoeZnakomstvo'];

export default async function Page() {
  const t = await getTranslations('nebesa');
  const tc = await getTranslations('common');
  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <h1 className="h2" style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}>
            {t('akcziya.title')}
          </h1>
          <p style={{ maxWidth: 760, color: '#3a3d44', fontSize: 16, lineHeight: 1.7, marginTop: 18 }}>
            {t('akcziya.intro')}
          </p>

          <div
            style={{
              display: 'grid',
              gap: 20,
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              marginTop: 40,
            }}
          >
            {OFFER_KEYS.map((k) => (
              <article
                key={k}
                style={{
                  background: '#fff',
                  borderRadius: 'var(--r)',
                  padding: 'clamp(22px, 3vw, 32px)',
                  boxShadow: '0 14px 40px rgba(20, 25, 40, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>{t(`akcziya.offers.${k}.tag`)}</span>
                <h2 className="h2" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)' }}>
                  {t(`akcziya.offers.${k}.nm`)}
                </h2>
                <span style={{ fontSize: 14, color: '#2ba3e5', fontWeight: 700 }}>{t(`akcziya.offers.${k}.when`)}</span>
                <p style={{ color: '#3a3d44', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{t(`akcziya.offers.${k}.desc`)}</p>
              </article>
            ))}
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 28 }}>
            {t('ageGate.note')}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              {tc('book')} · +7 912 076-78-14
            </a>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}
