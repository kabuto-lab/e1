import { asset } from '@/lib/asset';
import { RoxyShell } from '@/components/tenant-sites/roxy/RoxyShell';

export const metadata = {
  title: 'Выезд на дом — ROXY Men`s Relax Club',
  description: 'Эротический массаж с выездом на дом, в гостиницу или апартаменты. Любая программа, лучшие мастера, круглосуточно.',
};

/**
 * (tenants)/roxy-spa/massazh-i-vyiezd-na-dom — внутренняя страница тенанта roxy-spa
 * в едином стиле с главной (RoxyShell + roxy.css). Серверный компонент.
 */
export default function Page() {
  return (
    <RoxyShell>
      <section className="rose-bg">
        <div className="wrap">
          <h2 className="sec-title">Выезд на дом</h2>
          <p className="sec-sub">
            Очаровательную массажистку вы можете пригласить к себе домой или в гостиничный номер. Массаж с выездом — новая
            услуга нашего салона. Работаем с доставкой в квартиры, гостиницы и апартаменты.
          </p>

          <div className="adv-grid">
            <div className="adv">
              <h3>Куда угодно по Москве</h3>
              <div className="bar" />
              <p>Квартиры, гостиницы, апартаменты — приедем туда, где вам комфортно.</p>
            </div>
            <div className="adv">
              <h3>Круглосуточно</h3>
              <div className="bar" />
              <p>Работаем 24/7 без праздников и выходных. Звоните в любое время.</p>
            </div>
            <div className="adv">
              <h3>Любая программа</h3>
              <div className="bar" />
              <p>Выберите программу из нашего каталога — мастер приедет с полным набором.</p>
            </div>
            <div className="adv">
              <h3>Конфиденциальность</h3>
              <div className="bar" />
              <p>Полная анонимность и деликатность на всех этапах.</p>
            </div>
            <div className="adv">
              <h3>Быстрый отклик</h3>
              <div className="bar" />
              <p>Администратор свяжется с вами в течение 5 минут для уточнения деталей.</p>
            </div>
            <div className="adv">
              <h3>Лучшие мастера</h3>
              <div className="bar" />
              <p>Те же топовые девушки, что и в салоне — на ваш выбор.</p>
            </div>
          </div>

          <div className="about">
            <h2>Как заказать выезд</h2>
            <p>
              Если вас заинтересовал эротический массаж, добро пожаловать в наш салон, где царит приятная атмосфера и вас
              ждут профессиональные гейши. Очаровательную массажистку вы можете пригласить к себе домой или в гостиничный
              номер.
            </p>
            <p>
              Позвоните по телефону 8 (499) 757-2501, выберите девушку и программу, назовите адрес — администратор свяжется
              с вами в течение 5 минут для уточнения времени визита.
            </p>
            <p style={{ marginTop: '18px' }}>
              <a className="btn-outline" href="tel:+74997572501">
                Заказать выезд
              </a>{' '}
              <a className="btn-outline" href={asset("/roxy-spa/programmyi")}>
                Программы
              </a>
            </p>
          </div>

          <p className="sec-sub" style={{ marginTop: '28px' }}>
            Салон не оказывает услуг интимного характера. Посещая наш салон, вы соглашаетесь с правилами нашего заведения.
          </p>
        </div>
      </section>
    </RoxyShell>
  );
}
