import { asset } from '@/lib/asset';
import { SohoShell } from '@/components/tenant-sites/soho/SohoShell';

export const metadata = {
  title: 'Контакты — Soho Spa',
  description: 'Адрес, телефон, режим работы и карта салона Soho Spa в центре Москвы.',
};

export default function Page() {
  return (
    <SohoShell>
      <section className="sec" style={{ marginTop: '70px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Где нас найти</div>
            <h2>Контакты</h2>
            <p>Салон Soho Spa расположен в самом центре Москвы, в шаговой доступности от метро.</p>
          </div>
          <div className="cgrid">
            <ul className="cinfo">
              <li>
                <div className="lbl">Адрес</div>
                <div className="val">Москва, пер. Малый Харитоньевский, 9/13с5</div>
              </li>
              <li>
                <div className="lbl">Метро</div>
                <div className="val">Чистые пруды · Красные Ворота</div>
              </li>
              <li>
                <div className="lbl">Телефон / Мессенджер</div>
                <div className="val"><a href="tel:+79120769790">+7 (912) 076-97-90</a></div>
              </li>
              <li>
                <div className="lbl">Режим работы</div>
                <div className="val">Круглосуточно · 24/7</div>
              </li>
              <li>
                <div className="lbl">Оплата</div>
                <div className="val">Картами Visa · Mastercard · МИР · наличные</div>
              </li>
              <li>
                <div className="lbl">Мы в сети</div>
                <div className="val">Telegram · VK · Instagram</div>
              </li>
              <li>
                <div className="lbl">Рейтинг</div>
                <div className="val">★ 5,0 — Liga Massage</div>
              </li>
            </ul>
            <div className="map">
              <iframe
                src="https://yandex.ru/map-widget/v1/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2C%20%D0%9C%D0%B0%D0%BB%D1%8B%D0%B9%20%D0%A5%D0%B0%D1%80%D0%B8%D1%82%D0%BE%D0%BD%D1%8C%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BF%D0%B5%D1%80%D0%B5%D1%83%D0%BB%D0%BE%D0%BA%209%2F13%D1%815&z=16"
                loading="lazy"
                title="Карта"
              ></iframe>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '44px' }}>
            <a href="tel:+79120769790" className="btn">Позвонить</a>
            <a href={asset("/soho-spa/price")} className="btn btn-ghost" style={{ marginLeft: '10px' }}>Выбрать программу</a>
          </div>
          <p className="seo" style={{ textAlign: 'center', maxWidth: '760px', margin: '40px auto 0' }}>
            На сайте представлены фото и видео эротического содержания, а также информация об услугах, оказываемых лицам, достигшим 18 лет. Услуги массажа без интима.
          </p>
        </div>
      </section>
    </SohoShell>
  );
}
