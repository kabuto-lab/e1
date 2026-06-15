import { asset } from '@/lib/asset';
import { EtalonShell } from '@/components/tenant-sites/etalon/EtalonShell';

export const metadata = {
  title: 'Акции — Etalon',
  description: 'Специальные предложения салона Etalon: абонементы, подарки и приятные сюрпризы для гостей.',
};

export default function Page() {
  return (
    <EtalonShell>
      <section className="page-hero">
        <div className="wrap">
          <span className="hero-tag">Специальные предложения</span>
          <h1>Акции <em>салона Etalon</em></h1>
          <p>Дарим больше наслаждения за меньшие деньги. Абонементы, подарки и приятные сюрпризы для наших гостей.</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="promo-grid">
            <div className="promo-card"><span className="tag">Абонемент</span><h3>Массажа много не бывает!</h3><p>Если вы любите находиться в компании красивых девушек и наслаждаться массажем — предлагаем приобрести абонемент на 10 сеансов со скидкой.</p></div>
            <div className="promo-card"><span className="tag">Шоу</span><h3>Шоу должно продолжаться всегда!</h3><p>В наших стенах не бывает скучно! Станьте свидетелем невероятного шоу в исполнении двух красоток.</p></div>
            <div className="promo-card"><span className="tag">Скидка</span><h3>Реферальная система</h3><p>Приводите друзей и получайте скидку! Чем больше друзей — тем приятнее условия.</p></div>
            <div className="promo-card"><span className="tag">Подарок</span><h3>Двойное удовольствие</h3><p>Специально для наших мужчин — массаж в 4 руки в подарок к выбранной программе!</p></div>
            <div className="promo-card"><span className="tag">Каждую среду</span><h3>Welcome Drink</h3><p>Каждому гостю приветственный напиток! Порция домашней настойки от наших красавиц.</p></div>
            <div className="promo-card"><span className="tag">Эксклюзив</span><h3>Индивидуальное поздравление</h3><p>Хотите выделиться и поздравить друга эксклюзивным видео-роликом от наших красоток? Это проще простого!</p></div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '46px' }}><a href={asset("/etalonspa/contacts")} className="btn">Записаться на массаж</a></div>
        </div>
      </section>
    </EtalonShell>
  );
}
