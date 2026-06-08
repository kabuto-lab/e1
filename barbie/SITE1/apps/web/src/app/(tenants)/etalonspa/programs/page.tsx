import { EtalonShell } from '@/components/tenant-sites/etalon/EtalonShell';

export const metadata = {
  title: 'Услуги — Etalon',
  description: 'Прайс-лист программ эротического массажа: стандартные, элитные и VIP-программы.',
};

export default function Page() {
  return (
    <EtalonShell>
      <section className="page-hero">
        <div className="wrap">
          <span className="hero-tag">Прайс-лист</span>
          <h1>Программы <em>эротического массажа</em></h1>
          <p>От лёгкого экспресс-знакомства до эксклюзивных VIP-сеансов. Выберите свою программу наслаждения.</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2 className="sec-title" style={{ marginBottom: '34px' }}>Стандартные <em>программы</em></h2>
          <div className="price-list">
            <div className="price-row"><div className="pr-name">Экспресс Basic<span>Знакомство с миром эротических наслаждений · совместный душ</span></div><div className="pr-dur">30 мин</div><div className="pr-price">4 500 ₽</div></div>
            <div className="price-row"><div className="pr-name">Body Massage<span>Классический способ релаксации, древнейшая техника расслабления</span></div><div className="pr-dur">60 мин</div><div className="pr-price">5 500 ₽</div></div>
            <div className="price-row"><div className="pr-name">Камасутра<span>Наслаждение без границ от мастерства обольстительной массажистки</span></div><div className="pr-dur">60 мин</div><div className="pr-price">7 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Аква-пенный релакс<span>Для тех, кто хочет получить максимум ощущений и нежной пены</span></div><div className="pr-dur">60 мин</div><div className="pr-price">7 500 ₽</div></div>
            <div className="price-row"><div className="pr-name">Искушение<span>Расслабление и наслаждение мастерством обольстительной красотки</span></div><div className="pr-dur">60 мин</div><div className="pr-price">8 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Богиня<span>Атмосфера абсолютного блаженства в компании ослепительной девушки</span></div><div className="pr-dur">60 мин</div><div className="pr-price">9 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Экспресс Lux<span>Премиальная экспресс-программа повышенного комфорта</span></div><div className="pr-dur">60 мин</div><div className="pr-price">10 000 ₽</div></div>
          </div>

          <h2 className="sec-title" style={{ margin: '60px 0 34px' }}>Элитные <em>программы</em></h2>
          <div className="price-list">
            <div className="price-row"><div className="pr-name">Сладкий персик<span>Нежная и страстная программа для истинных ценителей релакса</span></div><div className="pr-dur">75 мин</div><div className="pr-price">10 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Милые подружки<span>Эротический массаж с двумя очаровательными девушками</span></div><div className="pr-dur">90 мин</div><div className="pr-price">10 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Соблазнительные ножки<span>Чувственная программа фут-фетиш для гурманов</span></div><div className="pr-dur">75 мин</div><div className="pr-price">11 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Тайский Боди Массаж<span>Скольжение тела к телу подарит непередаваемые ощущения</span></div><div className="pr-dur">70 мин</div><div className="pr-price">12 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Муладхара<span>Тантрический массаж пробуждения чувственной энергии</span></div><div className="pr-dur">75 мин</div><div className="pr-price">14 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Королевство Сиам<span>Восточное путешествие в мир неги, ароматов и тёплого масла</span></div><div className="pr-dur">90 мин</div><div className="pr-price">15 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Соблазн<span>Программа максимального удовольствия и расслабления</span></div><div className="pr-dur">90 мин</div><div className="pr-price">16 000 ₽</div></div>
          </div>

          <h2 className="sec-title" style={{ margin: '60px 0 34px' }}>VIP <em>программы</em></h2>
          <div className="price-list">
            <div className="price-row"><div className="pr-name">Провокация<span>Дерзкая программа для самых смелых желаний</span></div><div className="pr-dur">120 мин</div><div className="pr-price">23 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Преобладание<span>Доминирование и подчинение в исполнении опытной госпожи</span></div><div className="pr-dur">180 мин</div><div className="pr-price">28 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">VIP Gold<span>Эксклюзивный сеанс: максимум внимания, времени и наслаждения</span></div><div className="pr-dur">180 мин</div><div className="pr-price">30 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Массаж в 4 руки<span>Двойное удовольствие в исполнении двух красавиц</span></div><div className="pr-dur">90 мин</div><div className="pr-price">40 000 ₽</div></div>
            <div className="price-row"><div className="pr-name">Император<span>Высшая VIP-программа без компромиссов и ограничений</span></div><div className="pr-dur">180 мин</div><div className="pr-price">75 000 ₽</div></div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '50px' }}><a href="/etalonspa/contacts" className="btn">Записаться на массаж</a></div>
        </div>
      </section>
    </EtalonShell>
  );
}
