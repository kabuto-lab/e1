import { EtalonShell } from '@/components/tenant-sites/etalon/EtalonShell';

export const metadata = {
  title: 'Контакты — Etalon',
  description: 'Адрес, телефон и режим работы салона эротического массажа Etalon в центре Москвы. Работаем круглосуточно.',
};

export default function Page() {
  return (
    <EtalonShell>
      <section className="page-hero">
        <div className="wrap">
          <span className="hero-tag">Мы рядом</span>
          <h1>Контакты <em>салона Etalon</em></h1>
          <p>Работаем круглосуточно. Запишитесь на массаж по телефону или приходите по адресу в центре Москвы.</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="contact-grid">
            <div className="contact-info">
              <div className="ci"><div className="ic">📍</div><div><h4>Адрес</h4><p>Москва, ул. Чаплыгина 6</p></div></div>
              <div className="ci"><div className="ic">📞</div><div><h4>Телефон</h4><p><a href="tel:+79120769301">+7 912 076-93-01</a></p></div></div>
              <div className="ci"><div className="ic">🕐</div><div><h4>Режим работы</h4><p>Круглосуточно · 24/7</p></div></div>
              <div className="ci"><div className="ic">✈️</div><div><h4>Telegram</h4><p>Наши девушки теперь в Telegram</p></div></div>
              <div style={{ marginTop: '28px' }}><a href="tel:+79120769301" className="btn">Записаться на массаж</a></div>
            </div>
            <div className="map-box">
              <div className="map-ph">
                <div className="pin">📍</div>
                <strong style={{ color: '#fff', fontFamily: 'var(--display)', fontSize: '24px' }}>Etalon SPA</strong>
                <span>Москва, ул. Чаплыгина 6</span>
                <span style={{ fontSize: '13px' }}>Центр города · удобный подъезд</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </EtalonShell>
  );
}
