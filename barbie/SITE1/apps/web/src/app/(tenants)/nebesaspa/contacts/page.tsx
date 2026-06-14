import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Контакты — НЕБОСВОД · спа-салон эротического массажа в Москве',
  description:
    'Контакты салона эротического массажа НЕБОСВОД: телефон +7 912 076-78-14, адрес ул. Фридриха Энгельса, 19 (м. Бауманская), график работы, Telegram и WhatsApp. По предварительной записи.',
};

const PHONE = '+7 912 076-78-14';
const PHONE_HREF = 'tel:+79120767814';
const TG = 'https://t.me/NebosvodSpa';
const WA = 'https://wa.clck.bar/79309508627';
const TG_CHANNEL = 'https://t.me/happy_end_guest_1';

/**
 * (tenants)/nebesaspa/contacts — раздел «Контакты» в едином стиле сайта НЕБОСВОД
 * (NebesaShell + nebesa.css). Контент снят с nebesaspa.com/contacts/: телефон,
 * адрес (м. Бауманская), график 24/7, мессенджеры (Telegram/WhatsApp/канал).
 */
export default function Page() {
  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <h1 className="h2" style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}>
            Контакты
          </h1>
          <p style={{ maxWidth: 720, color: '#3a3d44', fontSize: 16, lineHeight: 1.7, marginTop: 18 }}>
            Работаем по предварительной записи. Пишите и звоните в любое время — администратор всегда
            на связи и поможет подобрать девушку и программу под ваше настроение.
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
              <div className="pttl">Телефон</div>
              <p className="pdesc">Звонок и запись круглосуточно.</p>
              <div style={{ marginTop: 16 }}>
                <a className="btn btn-blue" href={PHONE_HREF}>
                  {PHONE}
                </a>
              </div>
            </article>

            <article className="pcard" style={{ flex: 'unset' }}>
              <div className="pttl">Адрес</div>
              <p className="pdesc">
                улица Фридриха Энгельса, 19
                <br />
                м. Бауманская — уютные интерьеры в центре Москвы.
              </p>
            </article>

            <article className="pcard" style={{ flex: 'unset' }}>
              <div className="pttl">График работы</div>
              <p className="pdesc">
                пн – чт: 21:00 – 7:00
                <br />
                пт – вс: круглосуточно
                <br />
                Работаем по предварительной записи.
              </p>
            </article>

            <article className="pcard" style={{ flex: 'unset' }}>
              <div className="pttl">Мессенджеры</div>
              <p className="pdesc">Напишите в удобном вам мессенджере — ответим в любое время.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                <a className="btn btn-blue" href={TG} target="_blank" rel="noopener noreferrer">
                  Telegram
                </a>
                <a className="btn btn-blue" href={WA} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
                <a className="btn btn-blue" href={TG_CHANNEL} target="_blank" rel="noopener noreferrer">
                  Telegram-канал
                </a>
              </div>
            </article>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 28 }}>
            Салон не оказывает услуги интимного характера.
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
              Записаться на сеанс
            </h2>
            <p style={{ color: '#3a3d44', fontSize: 16, lineHeight: 1.7, marginTop: 14 }}>
              Свяжитесь с нами — подберём девушку и программу под ваше настроение.
            </p>
            <div style={{ marginTop: 20 }}>
              <a className="btn btn-blue" href={PHONE_HREF}>
                Позвонить · {PHONE}
              </a>
            </div>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}
