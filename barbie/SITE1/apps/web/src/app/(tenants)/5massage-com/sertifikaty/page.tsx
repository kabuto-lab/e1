import { asset } from '@/lib/asset';
import { M5cShell } from '@/components/tenant-sites/m5com/M5cShell';

export const metadata = {
  title: 'Сертификаты — 5·MASSAGE',
  description: 'Подарочные сертификаты на эротический массаж: бумажный, электронный и лимитированная пластиковая карта.',
};

export default function Page() {
  return (
    <M5cShell>
      <main>
        <section className="blk">
          <div className="wrap">
            <div className="eyebrow">Сертификаты</div>
            <h1 className="sec-title">Как выглядят наши сертификаты?</h1>
            <div className="lead">
              <p>
                <span style={{ fontWeight: '400' }}>
                  У хорошего подарка есть 3 составляющие: хорошее наполнение, красивая форма и удобство приобретения. В наших сертификатах собрано все! Для вас доступно множество программ и сразу три вида сертификатов – бумажный, электронный и в виде лимитированной пластиковой карты.
                </span>
              </p>
            </div>
            <div className="cert-row">
              <div className="cert-card">
                <div className="gal">
                  <img src={asset("/tenants/5massage-com/photo_2024-06-18_06-52-26.webp")} alt="" loading="lazy" />
                  <img src={asset("/tenants/5massage-com/photo_2024-06-18_16-50-24.webp")} alt="" loading="lazy" />
                  <img src={asset("/tenants/5massage-com/photo_2024-06-17_23-07-35.webp")} alt="" loading="lazy" />
                </div>
                <div className="body">
                  <h3>Бумажный</h3>
                  <p>Классическая и стильная версия, проверенная годами. Сертификат напечатан на софт-тач материале, благодаря чему его приятно держать в руках. Дизайн оценит любой мужчина! При оформлении покупки вы можете указать пожелания имениннику, которые мы добавим в сертификат.</p>
                </div>
              </div>
              <div className="cert-card">
                <div className="gal">
                  <img src={asset("/tenants/5massage-com/photo_2024-06-19_18-02-39.webp")} alt="" loading="lazy" />
                  <img src={asset("/tenants/5massage-com/photo_2024-06-19_18-02-40.webp")} alt="" loading="lazy" />
                  <img src={asset("/tenants/5massage-com/photo_2024-06-19_18-02-41.webp")} alt="" loading="lazy" />
                </div>
                <div className="body">
                  <h3>Электронный</h3>
                  <p>Такой сертификат придет прямо на ваш email, и вы сможете самостоятельно распечатать его в любой типографии. Мы присылаем двусторонний pdf-файл в высоком разрешении, так что у вас не будет ограничений по размеру сертификата – печатайте хоть на формате А5, хоть на целом холсте!</p>
                </div>
              </div>
              <div className="cert-card">
                <div className="gal">
                  <img src={asset("/tenants/5massage-com/photo_2023-03-09_17-44-28.webp")} alt="" loading="lazy" />
                  <img src={asset("/tenants/5massage-com/photo_2023-03-09_17-44-29.webp")} alt="" loading="lazy" />
                  <img src={asset("/tenants/5massage-com/photo_2023-12-02_13-36-16.webp")} alt="" loading="lazy" />
                </div>
                <div className="body">
                  <h3>Лимитированная карта</h3>
                  <p>Белая, серебренная или золотая  пластиковая карта в стильном конверте точно впечатлит виновника торжества! Чаще всего такой формат выбирают для особых людей, которые ценят красивую подачу. Лимитированная карта доступна в нескольких номиналах: от 5,500₽ до 25,000₽.</p>
                </div>
              </div>
            </div>
            <div className="cta-band" style={{ marginTop: '50px' }}>
              <h2>Получить сертификат</h2>
              <p>Доступны сертификаты на различные номиналы и на конкретные программы. Оформление печатного или электронного варианта.</p>
              <a href="/5massage-com/contacts" className="btn">Оформить сертификат</a>
            </div>
          </div>
        </section>
      </main>
    </M5cShell>
  );
}
