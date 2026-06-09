import { asset } from '@/lib/asset';
import { SohoShell } from '@/components/tenant-sites/soho/SohoShell';

export const metadata = {
  title: 'Программы — Soho Spa',
  description: 'Программы эротического массажа Soho Spa: стандартные, VIP и Deluxe, цены и категории.',
};

export default function Page() {
  return (
    <SohoShell>
      <section className="sec" style={{ marginTop: '70px', paddingBottom: '30px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Прайс-лист</div>
            <h2>Программы массажа</h2>
            <p>
              Проработанные программы эротического массажа для глубокого расслабления и восстановления.
              Профессиональные мастера, уютная атмосфера и приятные бонусы.
            </p>
          </div>

          <h3 style={{ textTransform: 'uppercase', marginBottom: '18px' }}>Стандартные программы</h3>
          <div className="grid g4" style={{ marginBottom: '46px' }}>
            <div className="pcard"><div className="pname">Экспресс Люкс</div><div className="pdur">30 мин</div><div className="pprice">4 500 <small>₽</small></div></div>
            <div className="pcard"><div className="pname">Базовая</div><div className="pdur">60 мин</div><div className="pprice">5 000 <small>₽</small></div></div>
            <div className="pcard"><div className="pname">Повелитель</div><div className="pdur">60 мин</div><div className="pprice">5 500 <small>₽</small></div></div>
            <div className="pcard"><div className="pname">Соблазн</div><div className="pdur">60 мин</div><div className="pprice">7 000 <small>₽</small></div></div>
          </div>

          <h3 style={{ textTransform: 'uppercase', marginBottom: '18px' }}>VIP и Deluxe программы</h3>
          <div className="grid g4" style={{ marginBottom: '46px' }}>
            <div className="pcard"><div className="pname">For women</div><div className="pdur">60 мин</div><div className="pprice">9 000 <small>₽</small></div></div>
            <div className="pcard"><div className="pname">Расширенная</div><div className="pdur">90 мин</div><div className="pprice">13 000 <small>₽</small></div></div>
            <div className="pcard"><div className="pname">VIP</div><div className="pdur">90 мин</div><div className="pprice">17 000 <small>₽</small></div></div>
            <div className="pcard"><div className="pname">Deluxe</div><div className="pdur">120 мин</div><div className="pprice">24 000 <small>₽</small></div></div>
          </div>

          <h3 style={{ textTransform: 'uppercase', marginBottom: '18px' }}>Категории программ</h3>
          <div className="grid g2">
            <div className="prow"><div className="pl">Массаж для пар<small>Сделайте отношения ярче и страстнее</small></div><div className="pr">от 13 000 ₽</div></div>
            <div className="prow"><div className="pl">Массаж для девушек<small>Новые эмоции и эксперименты</small></div><div className="pr">от 9 000 ₽</div></div>
            <div className="prow"><div className="pl">Урологический массаж<small>Программа здоровья</small></div><div className="pr">от 10 000 ₽</div></div>
            <div className="prow"><div className="pl">Услуги госпожи<small>Фетиш и доминирование</small></div><div className="pr">от 12 000 ₽</div></div>
            <div className="prow"><div className="pl">Программы для компаний<small>Мальчишник и праздники</small></div><div className="pr">от 25 000 ₽</div></div>
            <div className="prow"><div className="pl">Подружки Lux<small>Две мастерицы</small></div><div className="pr">от 45 000 ₽</div></div>
            <div className="prow"><div className="pl">Эксклюзивные программы<small>Индивидуальный сценарий</small></div><div className="pr">от 80 000 ₽</div></div>
            <div className="prow"><div className="pl">Премиум вечер<small>Самый полный формат</small></div><div className="pr">от 114 000 ₽</div></div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '44px' }}>
            <a href="/soho-spa/add-services" className="btn btn-ghost">Дополнения к программам</a>
            <a href="/soho-spa/contacts" className="btn" style={{ marginLeft: '10px' }}>Записаться</a>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="split">
            <img src={asset("/tenants/soho-spa/so9vn-e1672831462166.webp")} alt="Подарочный сертификат" />
            <div>
              <div className="kicker">Подарок</div>
              <h2 style={{ fontSize: '32px', textTransform: 'uppercase' }}>Сделайте подарок мечты</h2>
              <p>
                Подарочный сертификат Soho Spa — оригинальный и желанный презент. Номинал на любую
                программу из прайса.
              </p>
              <a href="/soho-spa/contacts" className="btn" style={{ marginTop: '18px' }}>Заказать сертификат</a>
            </div>
          </div>
        </div>
      </section>
    </SohoShell>
  );
}
