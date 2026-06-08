import { EroticmassajShell } from '@/components/tenant-sites/eroticmassaj/EroticmassajShell';

export const metadata = { title: 'Контакты и сертификаты — PODIUM SPA' };

export default function Page() {
  return (
    <EroticmassajShell>
      {/* GIFT CERTIFICATES */}
      <section className="art-hero">
        <div className="container">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/sertificates.webp" alt="сертификаты" style={{ width: '320px', maxWidth: '100%', objectFit: 'cover' }} />
            <div style={{ padding: '32px', flex: 1, minWidth: '260px' }}>
              <span className="tagline">Podium SPA</span>
              <h2 style={{ color: '#fff', margin: '8px 0 12px', fontSize: '30px' }}>Подарочные сертификаты в Podium Spa</h2>
              <p style={{ color: 'var(--muted)', margin: '0 0 20px' }}>Приобретайте сертификат на любую сумму в наш салон онлайн или с доставкой на дом. Прекрасный подарок для близкого человека.</p>
              <a className="btn" href="tel:+79120768078">Заказать сертификат</a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTS */}
      <section style={{ paddingTop: '10px' }}>
        <div className="container">
          <div className="sec-head"><h2>Контакты</h2><div className="line"></div></div>
          <div className="contact-grid">
            <div className="cinfo">
              <div><div className="lbl">Телефон</div><div className="val acc"><a href="tel:+79120768078">+7 912 076-80-78</a></div></div>
              <div><div className="lbl">Адрес</div><div className="val">Москва, ул. Большая Молчановка 18</div></div>
              <div><div className="lbl">Метро</div><div className="val">м. Арбатская · м. Киевская</div></div>
              <div><div className="lbl">Часы работы</div><div className="val">Вс—Чт · 13:00-7:00<br />Пт—Сб · 24 часа</div></div>
              <div><div className="lbl">Мессенджеры</div><div className="val">Whatsapp · Telegram</div></div>
            </div>
            <div className="map-box">Карта проезда<br /><br />Москва, ул. Большая Молчановка 18<br />м. Арбатская · м. Киевская<br /><br />55.7534, 37.5931</div>
          </div>
          <div className="age-note">На сайте представлены фото/видео эротического содержания, а также информация об услугах, оказываемых лицам, достигшим 18 лет.</div>
        </div>
      </section>
    </EroticmassajShell>
  );
}
