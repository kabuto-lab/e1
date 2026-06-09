import { asset } from '@/lib/asset';
import { PentagonShell } from '@/components/tenant-sites/pentagon/PentagonShell';

export const metadata = {
  title: 'Дополнения — PENTAGON spa salon',
  description:
    'Дополнения к программам массажа — соберите собственную программу мечты в салоне PENTAGON.',
};

export default function Page() {
  return (
    <PentagonShell>
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">PENTAGON</span>
            <h2>Дополнительные услуги</h2>
            <p>
              С дополнениями вы сможете собрать собственную программу мечты! У нас есть как нежные и
              чувственные предложения, так и очень смелые варианты для самых искушённых.
            </p>
          </div>

          <div className="progs">
            <div className="prog">
              <div className="ic">❖</div>
              <h3>Фетиш</h3>
              <p>Воплотите свои самые смелые желания и получите мощнейшую разрядку.</p>
              <div className="meta">
                <span>от 5 000 ₽</span>
              </div>
            </div>

            <div className="prog">
              <div className="ic">❖</div>
              <h3>Ролевые игры</h3>
              <p>Добавьте интригу и сделайте сеанс ещё интереснее.</p>
              <div className="meta">
                <span>от 5 000 ₽</span>
              </div>
            </div>

            <div className="prog">
              <div className="ic">❖</div>
              <h3>Стриптиз</h3>
              <p>Соблазнительное шоу от вашей мастерицы перед программой.</p>
              <div className="meta">
                <span>от 4 000 ₽</span>
              </div>
            </div>

            <div className="prog">
              <div className="ic">❖</div>
              <h3>Паровой коктейль</h3>
              <p>Расслабьтесь и насладитесь атмосферой ароматного дыма.</p>
              <div className="meta">
                <span>от 3 000 ₽</span>
              </div>
            </div>

            <div className="prog">
              <div className="ic">❖</div>
              <h3>Дополнительная мастерица</h3>
              <p>Двойное внимание и вдвое больше удовольствия.</p>
              <div className="meta">
                <span>+50%</span>
              </div>
            </div>

            <div className="prog">
              <div className="ic">❖</div>
              <h3>Караоке и бар</h3>
              <p>Разнообразьте отдых — спойте любимые хиты с напитками.</p>
              <div className="meta">
                <span>от 2 000 ₽</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <a className="btn btn-accent" href={asset("/pentagon/contacts")}>
              Заказать дополнения
            </a>
            <a className="btn btn-light" href="tel:+79120769749" style={{ marginLeft: 12 }}>
              +7 (912) 076-97-49
            </a>
          </div>
        </div>
      </section>
    </PentagonShell>
  );
}
