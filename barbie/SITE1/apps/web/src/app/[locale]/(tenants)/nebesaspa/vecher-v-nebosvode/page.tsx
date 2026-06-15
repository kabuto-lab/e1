import { getTranslations } from 'next-intl/server';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Вечер в «Небосводе» — для пары или компании · НЕБОСВОД спа-салон',
  description:
    'Вечер в «Небосводе» — приватное пространство с джакузи, атмосферными комнатами и возможностью объединить комнаты для отдыха вместе. Спа-салон эротического массажа в Москве.',
};

const PARA_KEYS = ['p1', 'p2', 'p3', 'p4'];

export default async function Page() {
  const t = await getTranslations('nebesa');
  const tc = await getTranslations('common');
  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <h1 className="h2" style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}>
            {t('vecher.title')}
          </h1>
          <p style={{ maxWidth: 760, color: '#3a3d44', fontSize: 17, lineHeight: 1.7, marginTop: 18 }}>
            {t('vecher.intro')}
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
            {PARA_KEYS.map((k, i) => (
              <p key={k} style={{ marginTop: i === 0 ? 0 : 16 }}>
                {t(`vecher.${k}`)}
              </p>
            ))}

            <h2 className="h2" style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', marginTop: 28 }}>
              {t('vecher.hoursTitle')}
            </h2>
            <ul style={{ marginTop: 12, paddingLeft: 18 }}>
              <li>{tc('hours.monThu')}: {tc('hours.night')}</li>
              <li>{tc('hours.friSun')}: {tc('hours.allDay')}</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              {t('vecher.bookCta')} · +7 912 076-78-14
            </a>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}
