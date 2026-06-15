import { ImperiumShell } from '@/components/tenant-sites/imperiumspa/ImperiumShell';

export const metadata = {
  title: 'Контакты салона эротического массажа Imperium',
  description: 'Телефон, адрес, метро и часы работы салона эротического массажа IMPERIUM в центре Москвы.',
};

export default function Page() {
  return (
    <ImperiumShell active="contacts">
      <div className="pagehead">
        <div className="wrap">
          <h1>Контакты</h1>
          <div className="crumb">Главная / Контакты</div>
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="cinfo" style={{ marginBottom: '30px' }}>
            <div className="cbox">
              <div className="lbl">Телефон</div>
              <div className="val"><a href="tel:+79120769173" className="accent">+7 (912) 076-91-73</a></div>
            </div>
            <div className="cbox">
              <div className="lbl">Адрес</div>
              <div className="val">г. Москва, ул. Мясницкая, 41В</div>
            </div>
            <div className="cbox">
              <div className="lbl">Метро</div>
              <div className="val">м. Красные ворота, м. Чистые пруды</div>
            </div>
            <div className="cbox">
              <div className="lbl">Часы работы</div>
              <div className="val">ПН-СР: 13:00-07:00 · ЧТ-ВС: круглосуточно</div>
            </div>
          </div>
          <div className="prose" style={{ marginBottom: '30px' }}>
            <p>Для записи в наш салон эротического массажа достаточно позвонить по указанному телефону. Администраторы IMPERIUM ответят на все интересующие вас вопросы и помогут с выбором программы и дополнений.</p>
            <p>Мы ценим ваше доверие и сделаем всё возможное, чтобы вы не разочаровались.</p>
          </div>
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--line)', aspectRatio: '16/7', background: 'var(--bg2)' }}>
            <iframe
              src="https://yandex.ru/map-widget/v1/?ll=37.642608%2C55.768056&z=16&mode=search&text=Мясницкая%2041"
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0, filter: 'grayscale(.3) invert(.9) hue-rotate(180deg)' }}
            ></iframe>
          </div>
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <a href="tel:+79120769173" className="btn">Позвонить и записаться</a>
          </div>
        </div>
      </section>
    </ImperiumShell>
  );
}
