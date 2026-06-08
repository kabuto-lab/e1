import { M5cShell } from '@/components/tenant-sites/m5com/M5cShell';

export const metadata = {
  title: 'Как получить — 5·MASSAGE',
  description: 'Как оформить подарочный сертификат 5·MASSAGE: формат, номинал, пожелания, получение.',
};

export default function Page() {
  return (
    <M5cShell>
      <main>
        <section className="blk">
          <div className="wrap">
            <div className="eyebrow">Как это работает</div>
            <h1 className="sec-title">Как получить сертификат</h1>
            <p className="lead">Удобство приобретения — одна из трёх составляющих хорошего подарка. Оформить сертификат можно за пару минут.</p>
            <div className="steps">
              <div className="step"><div className="n">01</div><h4>Выберите формат</h4><p>Бумажный, электронный или лимитированная пластиковая карта — на выбор.</p></div>
              <div className="step"><div className="n">02</div><h4>Выберите номинал</h4><p>Сертификат на сумму или на конкретную программу. Номиналы от 5 000 ₽ до 25 000 ₽ и выше.</p></div>
              <div className="step"><div className="n">03</div><h4>Укажите пожелания</h4><p>При оформлении можно добавить персональное поздравление имениннику.</p></div>
              <div className="step"><div className="n">04</div><h4>Получите подарок</h4><p>Печатный сертификат — лично, электронный — на email в виде PDF высокого разрешения.</p></div>
            </div>
            <div className="cta-band" style={{ marginTop: '54px' }}>
              <h2>Сделайте подарок мечты</h2>
              <p>Сертификат в один из топовых столичных салонов станет отличным презентом на любое событие.</p>
              <a href="/5massage-com/contacts" className="btn">Связаться с нами</a>
            </div>
          </div>
        </section>
      </main>
    </M5cShell>
  );
}
