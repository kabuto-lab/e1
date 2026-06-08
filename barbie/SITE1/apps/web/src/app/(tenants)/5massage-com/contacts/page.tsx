import { M5cShell } from '@/components/tenant-sites/m5com/M5cShell';

export const metadata = {
  title: 'Контакты — 5·MASSAGE',
  description: 'Свяжитесь с нами: телефон, адреса четырёх салонов-партнёров в Москве и оформление подарочных сертификатов.',
};

export default function Page() {
  return (
    <M5cShell>
      <main>
        <section className="blk">
          <div className="wrap">
            <div className="eyebrow">Контакты</div>
            <h1 className="sec-title">Свяжитесь с нами</h1>
            <p className="lead">Подберём программу и оформим подарочный сертификат в любой из четырёх салонов Москвы.</p>
            <div className="contact-card" style={{ marginTop: '34px', maxWidth: '520px' }}>
              <h3>Общий контакт</h3>
              <div className="row"><b>Телефон</b><span className="accent" style={{ fontFamily: 'Montserrat', fontWeight: '700', fontSize: '18px' }}>+7 (495) 128-30-50</span></div>
              <div className="row"><b>Город</b><span>Москва · 4 салона-партнёра</span></div>
              <div className="row"><b>Сертификаты</b><span>печатные · электронные · лимитированная карта</span></div>
            </div>
            <h2 className="sec-title" style={{ marginTop: '56px', fontSize: '30px' }}>Салоны-партнёры</h2>
            <div className="contact-grid">
              <div className="contact-card">
                <h3 className="accent">Soho</h3>
                <div className="row"><b>Адрес</b><span>Москва, ул. Малый Харитоньевский переулок 9/13 с5 (м. Красне Ворота)</span></div>
                <div className="row"><b>Сертификаты</b><span>от 5000 ₽</span></div>
                <div className="row"><b>Программ</b><span>26 вариантов</span></div>
              </div>
              <div className="contact-card">
                <h3 className="accent">Barbie</h3>
                <div className="row"><b>Адрес</b><span>Москва, Каланчевская 32/58 с1 (м. Проспект Мира)</span></div>
                <div className="row"><b>Сертификаты</b><span>от 5001 ₽</span></div>
                <div className="row"><b>Программ</b><span>27 вариантов</span></div>
              </div>
              <div className="contact-card">
                <h3 className="accent">Imperium</h3>
                <div className="row"><b>Адрес</b><span>Москва, ул. Мясницкая, 41В (м. Красные ворота)</span></div>
                <div className="row"><b>Сертификаты</b><span>от 5000 ₽</span></div>
                <div className="row"><b>Программ</b><span>28 вариантов</span></div>
              </div>
              <div className="contact-card">
                <h3 className="accent">Vanilia</h3>
                <div className="row"><b>Адрес</b><span>Москва, Лучников переулок 7/4 с5 (м. Лубянка)</span></div>
                <div className="row"><b>Сертификаты</b><span>от 5000 ₽</span></div>
                <div className="row"><b>Программ</b><span>28 вариантов</span></div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </M5cShell>
  );
}
