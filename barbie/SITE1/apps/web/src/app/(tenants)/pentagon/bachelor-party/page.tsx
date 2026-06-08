import { PentagonShell } from '@/components/tenant-sites/pentagon/PentagonShell';

export const metadata = {
  title: 'Мальчишник — PENTAGON spa salon',
  description:
    'Незабываемый мальчишник в салоне PENTAGON — шоу, бар, сауна. Организуем под ключ под ваш бюджет.',
};

export default function Page() {
  return (
    <PentagonShell>
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">PENTAGON</span>
            <h2>Мальчишник</h2>
            <p>
              Танцующие красотки в клубах ароматного дыма, откровенный массаж, бар и атмосфера
              азарта на протяжении всего вечера.
            </p>
          </div>

          <p>
            Мы всё организуем под ключ! Фиксированной суммы нет — мы подстраиваемся под ваш бюджет и
            наполняем отдых услугами, которые вы хотите видеть.
          </p>

          <div className="progs">
            <div className="prog">
              <div className="ic">❖</div>
              <h3>Шоу-программа</h3>
              <p>Танцующие красотки и эротические шоу для всей компании.</p>
            </div>
            <div className="prog">
              <div className="ic">❖</div>
              <h3>Бар и алкоголь</h3>
              <p>Море напитков и праздничная атмосфера весь вечер.</p>
            </div>
            <div className="prog">
              <div className="ic">❖</div>
              <h3>Сауна и хаммам</h3>
              <p>Дополнительно отдохните в сауне или хаммаме.</p>
            </div>
            <div className="prog">
              <div className="ic">❖</div>
              <h3>Караоке</h3>
              <p>Спойте любимые хиты в компании друзей.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Прайс</span>
            <h2>Программы мальчишника</h2>
            <p>Подберём наполнение под вашу компанию и бюджет.</p>
          </div>

          <div className="progs">
            <div className="prog">
              <div className="ic">❖</div>
              <h3>STANDART</h3>
              <p>Базовая программа праздника для дружной компании.</p>
              <div className="price">
                <b>50 000 ₽</b>
                <span>180 мин</span>
              </div>
            </div>
            <div className="prog">
              <div className="ic">❖</div>
              <h3>VIP</h3>
              <p>Расширенное шоу, бар и приватная атмосфера весь вечер.</p>
              <div className="price">
                <b>80 000 ₽</b>
                <span>180 мин</span>
              </div>
            </div>
            <div className="prog">
              <div className="ic">❖</div>
              <h3>PREMIUM</h3>
              <p>Максимальный формат: всё включено и больше времени.</p>
              <div className="price">
                <b>114 000 ₽</b>
                <span>240 мин</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Контакты</span>
            <h2>Организовать мальчишник</h2>
            <p>Свяжитесь с нами — подберём программу и согласуем дату.</p>
          </div>
          <p style={{ textAlign: 'center' }}>
            <a className="btn btn-accent" href="tel:+79120769749">
              +7 (912) 076-97-49
            </a>{' '}
            <a className="btn btn-light" href="/pentagon/contacts">
              Контакты
            </a>
          </p>
        </div>
      </section>
    </PentagonShell>
  );
}
