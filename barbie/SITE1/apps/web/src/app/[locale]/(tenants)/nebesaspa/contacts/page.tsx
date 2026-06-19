import { getTranslations } from 'next-intl/server';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';
import { NebesaJobsModal } from '@/components/tenant-sites/nebesa/NebesaJobsModal';
import { NEBESA_ROUTE } from '@/components/tenant-sites/nebesa/nebesa-contacts';

export const metadata = {
  title: 'Контакты — НЕБОСВОД · спа-салон эротического массажа в Москве',
  description:
    'Контакты салона эротического массажа НЕБОСВОД: телефон +7 912 076-78-14, адрес ул. Фридриха Энгельса, 19 (м. Бауманская), график работы, Telegram и WhatsApp. По предварительной записи.',
};

const PHONE = '+7 912 076-78-14';
const PHONE_HREF = 'tel:+79120767814';
const TG = 'https://t.me/NebosvodSpa';
const WA = 'https://wa.me/79120767814';
const TG_CHANNEL = 'https://t.me/happy_end_guest_1';
const ROUTE_HREF = NEBESA_ROUTE.href;

/**
 * (tenants)/nebesaspa/contacts — раздел «Контакты» в едином стиле сайта НЕБОСВОД
 * (NebesaShell + nebesa.css). Контент снят с nebesaspa.com/contacts/: телефон,
 * адрес (м. Бауманская), график 24/7, мессенджеры (Telegram/WhatsApp/канал).
 */
export default async function Page() {
  const t = await getTranslations('nebesa');
  const tc = await getTranslations('common');
  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <h1 className="h2" style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}>
            {tc('nav.contacts')}
          </h1>
          <p style={{ maxWidth: 720, color: '#3a3d44', fontSize: 16, lineHeight: 1.7, marginTop: 18 }}>
            {t('contacts.intro')}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 24,
              marginTop: 36,
            }}
          >
            <article className="pcard" style={{ flex: 'unset' }}>
              <div className="pttl">{t('contacts.phoneTitle')}</div>
              <p className="pdesc">{t('contacts.phoneDesc')}</p>
              <div style={{ marginTop: 16 }}>
                <a className="btn btn-blue" href={PHONE_HREF}>
                  {PHONE}
                </a>
              </div>
            </article>

            <article className="pcard" style={{ flex: 'unset' }}>
              <div className="pttl">{t('contacts.addressTitle')}</div>
              <p className="pdesc">
                {t('contacts.addressLine1')}
                <br />
                {t('contacts.addressLine2')}
              </p>
              <div style={{ marginTop: 16 }}>
                <a className="btn btn-blue" href={ROUTE_HREF}>
                  {tc('route')}
                </a>
              </div>
            </article>

            <article className="pcard" style={{ flex: 'unset' }}>
              <div className="pttl">{t('contacts.hoursTitle')}</div>
              <p className="pdesc">
                {tc('hours.monThu')}: {tc('hours.night')}
                <br />
                {tc('hours.friSun')}: {tc('hours.allDay')}
                <br />
                {tc('byAppointment')}
              </p>
            </article>

            <article className="pcard" style={{ flex: 'unset' }}>
              <div className="pttl">{t('contacts.messengersTitle')}</div>
              <p className="pdesc">{t('contacts.messengersDesc')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                <a className="btn btn-blue" href={TG} target="_blank" rel="noopener noreferrer">
                  Telegram
                </a>
                <a className="btn btn-blue" href={WA} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
                <a className="btn btn-blue" href={TG_CHANNEL} target="_blank" rel="noopener noreferrer">
                  {t('contacts.tgChannel')}
                </a>
              </div>
            </article>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 28 }}>
            {t('ageGate.note')}
          </p>

          <div
            style={{
              marginTop: 48,
              textAlign: 'center',
              background: '#fff',
              borderRadius: 'var(--r)',
              padding: 'clamp(24px, 4vw, 44px)',
              boxShadow: '0 14px 40px rgba(20, 25, 40, 0.06)',
            }}
          >
            <h2 className="h2" style={{ fontSize: 'clamp(26px, 3.4vw, 40px)' }}>
              {t('contacts.ctaTitle')}
            </h2>
            <p style={{ color: '#3a3d44', fontSize: 16, lineHeight: 1.7, marginTop: 14 }}>
              {t('contacts.ctaText')}
            </p>
            <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a className="btn btn-blue" href={PHONE_HREF}>
                {tc('call')} · {PHONE}
              </a>
              <NebesaJobsModal />
            </div>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}
