import { asset } from '@/lib/asset';
import { PentagonShell } from '@/components/tenant-sites/pentagon/PentagonShell';

export const metadata = {
  title: 'Выезд — PENTAGON spa salon',
  description: 'Эротический массаж на выезд в Москве — закажите массажистку на дом от салона PENTAGON.',
};

/**
 * (tenants)/pentagon/outcall-massage — внутренняя страница тенанта pentagon
 * в едином стиле с главной (PentagonShell + pentagon.css). Серверный компонент.
 */
export default function Page() {
  const programs = [
    { title: 'Релакс на выезде', desc: 'Полноценный релакс в знакомой домашней обстановке.', price: '15 000 ₽', dur: '60 мин' },
    { title: 'Мечта на выезде', desc: 'Расширенная программа для глубокого расслабления.', price: '23 000 ₽', dur: '90 мин' },
    { title: 'Двойной выезд', desc: 'Программа с двумя мастерами для максимальных ощущений.', price: '38 000 ₽', dur: '120 мин · 2 мастера' },
  ];

  return (
    <PentagonShell>
      <section className="sec" id="outcall">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Выезд по Москве</span>
            <h2>Эротический массаж на выезд</h2>
            <p>Закажи массажистку на дом — окунись в полноценный релакс в знакомой домашней обстановке.</p>
          </div>

          <p>
            Эротический массаж на выезд может позволить себе каждый мужчина! Хотите расслабиться, но не можете
            найти свободное время для похода в салон? К вашим услугам выезд мастера от PENTAGON.
          </p>
          <p>
            Такси оплачивается в обе стороны перед выездом мастера к вам. По желанию гостей привозим с собой
            паровой коктейль и бар.
          </p>

          <div className="progs">
            {programs.map((p) => (
              <div key={p.title} className="prog">
                <div className="ic">❖</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="meta">
                  <span>{p.price}</span>
                  <span>{p.dur}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a className="btn btn-accent" href={asset("/pentagon/contacts")}>Заказать выезд</a>
            <a className="btn btn-light" href="tel:+79120769749">+7 (912) 076-97-49</a>
          </div>
        </div>
      </section>
    </PentagonShell>
  );
}
