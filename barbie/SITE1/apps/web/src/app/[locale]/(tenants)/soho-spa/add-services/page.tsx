import { asset } from '@/lib/asset';
import { SohoShell } from '@/components/tenant-sites/soho/SohoShell';

export const metadata = {
  title: 'Дополнения — Soho Spa',
  description: 'Дополнительные услуги Soho Spa: бар, джакузи, консумация и дополнения к программам.',
};

export default function Page() {
  return (
    <SohoShell>
      <section className="sec" style={{ marginTop: '70px', paddingBottom: '30px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Соберите программу мечты</div>
            <h2>Дополнительные услуги</h2>
            <p>
              С дополнениями вы соберёте собственную программу мечты! Есть нежные и чувственные
              предложения, а также смелые варианты для самых искушённых.
            </p>
          </div>

          <div className="grid g3" style={{ marginBottom: '46px' }}>
            <div className="pcard">
              <div className="pname">Бар</div>
              <div className="pdur">Авторские коктейли и напитки</div>
              <div className="pprice">от 500 <small>₽</small></div>
            </div>
            <div className="pcard">
              <div className="pname">Джакузи</div>
              <div className="pdur">В каждой комнате салона</div>
              <div className="pprice">от 3 000 <small>₽</small></div>
            </div>
            <div className="pcard">
              <div className="pname">Консумация</div>
              <div className="pdur">Девушки составят компанию</div>
              <div className="pprice">от 5 000 <small>₽</small></div>
            </div>
          </div>

          <h3 style={{ textTransform: 'uppercase', marginBottom: '18px' }}>Дополнения к программам</h3>
          <div className="grid g2">
            <div className="prow">
              <div className="pl">Фетиш</div>
              <div className="pr">2 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">
                Клубничка + Веточка сакуры + Поцелуи по телу<small>3 в 1</small>
              </div>
              <div className="pr">2 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">Массаж простаты</div>
              <div className="pr">3 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">Страпон</div>
              <div className="pr">5 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">Контроль окончания</div>
              <div className="pr">1 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">Пип-шоу</div>
              <div className="pr">2 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">
                Яйцо тенге + Высший пилотаж<small>2 в 1</small>
              </div>
              <div className="pr">2 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">Второй релакс</div>
              <div className="pr">2 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">Поцелуи по телу</div>
              <div className="pr">от 1 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">
                Аква пенный массаж в джакузи<small>+ 20 минут в подарок</small>
              </div>
              <div className="pr">3 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">
                Сливки<small>слизываете сливки с тела массажистки / 5 000 ₽ — две массажистки</small>
              </div>
              <div className="pr">от 3 000 ₽</div>
            </div>
            <div className="prow">
              <div className="pl">Игрушки</div>
              <div className="pr">5 000 ₽</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '44px' }}>
            <a href={asset("/soho-spa/price")} className="btn btn-ghost">К программам</a>
            <a href={asset("/soho-spa/contacts")} className="btn" style={{ marginLeft: '10px' }}>Записаться</a>
          </div>
        </div>
      </section>
    </SohoShell>
  );
}
