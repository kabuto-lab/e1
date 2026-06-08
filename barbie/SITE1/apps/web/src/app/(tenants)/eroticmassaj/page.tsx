import { EroticmassajShell } from '@/components/tenant-sites/eroticmassaj/EroticmassajShell';

export const metadata = { title: 'Салон эротического массажа PODIUM в Москве' };

export default function Page() {
  return (
    <EroticmassajShell>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <span className="tagline">Салон эротического массажа · класс VIP</span>
          <h1>Podium — салон эротического массажа класса VIP</h1>
          <p className="lead">Более 50 очаровательных и сногсшибательных мастеров эротического массажа Москвы ждут вас в салоне Podium. Каждый день — не менее 15 девушек, широкий выбор программ на любой бюджет.</p>
          <a className="btn" href="#programs">Выбрать программу</a>
          <a className="btn btn-ghost" href="/eroticmassaj/contacts" style={{ marginLeft: '10px' }}>Контакты</a>
        </div>
      </section>

      {/* GIRLS */}
      <section id="girls">
        <div className="container">
          <div className="sec-head"><h2>Девушки салона</h2><p>Фотографии на сайте соответствуют действительности — познакомьтесь с мастерицами «заочно».</p><div className="line"></div></div>
          <div className="grid g4">
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/img_9282.webp" alt="мастер" />
              <div className="body"><h3>Алиса</h3><p>23 года · 170 см · 54 кг · грудь 3</p><span className="dur">Брюнетка</span></div>
            </div>
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/img_9284.webp" alt="мастер" />
              <div className="body"><h3>Вероника</h3><p>25 лет · 168 см · 52 кг · грудь 2</p><span className="dur">Блондинка</span></div>
            </div>
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/img_9291.webp" alt="мастер" />
              <div className="body"><h3>Кристина</h3><p>22 года · 172 см · 55 кг · грудь 3</p><span className="dur">Шатенка</span></div>
            </div>
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/img_9294.webp" alt="мастер" />
              <div className="body"><h3>Милана</h3><p>24 года · 166 см · 50 кг · грудь 2</p><span className="dur">Брюнетка</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* QUIZ CTA */}
      <section style={{ paddingTop: '0' }}>
        <div className="container">
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '36px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ maxWidth: '560px' }}>
              <h2 style={{ margin: '0 0 10px', color: '#fff', fontSize: '26px' }}>Не определились с выбором?</h2>
              <p style={{ margin: '0', color: 'var(--muted)' }}>Отправьте заявку на подбор мастера и получите <b style={{ color: 'var(--accent)' }}>+30 минут</b> на массаж в подарок! Укажите предпочитаемый цвет волос — блондинка или брюнетка — и мы подберём идеальную спутницу.</p>
            </div>
            <a className="btn" href="/eroticmassaj/contacts">Подобрать</a>
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section id="programs">
        <div className="container">
          <div className="sec-head"><h2>Популярные программы</h2><p>Широкий ассортимент позволяет выбрать сеанс на любой бюджет и любые предпочтения.</p><div className="line"></div></div>
          <div className="grid g3">
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/vip-programmy.webp" alt="VIP-программы" />
              <div className="body"><h3>VIP-программы</h3><p>Эксклюзивный сеанс с лучшими мастерицами салона в премиальном формате.</p><div className="price">от 15 000 ₽ <span className="dur">· 90 мин</span></div></div>
            </div>
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/vecherinka-koktejlnaya-1.webp" alt="Lingam" />
              <div className="body"><h3>Lingam-массаж</h3><p>Глубокая релаксация и снятие напряжения по авторской методике.</p><div className="price">от 8 000 ₽ <span className="dur">· 60 мин</span></div></div>
            </div>
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/lesbi.webp" alt="Lesbi-шоу" />
              <div className="body"><h3>Lesbi-программа</h3><p>Чувственный сеанс в четыре руки от двух обаятельных мастериц.</p><div className="price">от 12 000 ₽ <span className="dur">· 75 мин</span></div></div>
            </div>
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/solyarij-1.webp" alt="Солярий" />
              <div className="body"><h3>Соляр и SPA</h3><p>Дополнение к любой программе — релакс-зона и приятная атмосфера.</p><div className="price">от 5 000 ₽ <span className="dur">· 45 мин</span></div></div>
            </div>
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/akcziya2.webp" alt="Классика" />
              <div className="body"><h3>Классический сеанс</h3><p>Базовая программа для тех, кто впервые в нашем салоне.</p><div className="price">от 6 000 ₽ <span className="dur">· 60 мин</span></div></div>
            </div>
            <div className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/pod_vbrmn_banner_long.webp" alt="Выезд" />
              <div className="body"><h3>Массаж на выезд</h3><p>Услуги на выезд без потери качества исполнения — там, где удобно вам.</p><div className="price">по запросу <span className="dur">· 90 мин</span></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head"><h2>Наши преимущества</h2><div className="line"></div></div>
          <div className="features">
            <div className="feat"><span className="num">15+</span><span>Каждый день работает не менее 15 девушек. Всего в штате 100 соблазнительных и профессиональных массажисток.</span></div>
            <div className="feat"><span className="num">100%</span><span>Фотографии на сайте соответствуют действительности — вы всегда можете познакомиться с девушками «заочно».</span></div>
            <div className="feat"><span className="num">∞</span><span>Широкий ассортимент программ позволяет выбрать сеанс на любой бюджет и любые предпочтения.</span></div>
            <div className="feat"><span className="num">24/7</span><span>Салон предоставляет услуги на выезд без потери качества исполнения. Пт—Сб работаем круглосуточно.</span></div>
          </div>
        </div>
      </section>

      {/* STOCKS */}
      <section>
        <div className="container">
          <div className="sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
            <div><h2>Акции</h2><p>Уникальные предложения для вас.</p><div className="line"></div></div>
            <a className="btn btn-ghost" href="/eroticmassaj/stocks">Все акции</a>
          </div>
          <div className="grid g3">
            <a className="promo-card" href="/eroticmassaj/stock-bilet">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/oblozhka-1.webp" alt="" />
              <div className="pbody"><h3>Счастливый билет</h3><p>Беспроигрышная лотерея! Записывайтесь и выигрывайте бесплатные бонусы.</p><span className="dur accent">Подробнее →</span></div>
            </a>
            <a className="promo-card" href="/eroticmassaj/stock-koktejl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/vecherinka-koktejlnaya-1.webp" alt="" />
              <div className="pbody"><h3>Коктейльная вечеринка!</h3><p>Каждый четверг — порция фирменного коктейля в подарок каждому гостю.</p><span className="dur accent">Подробнее →</span></div>
            </a>
            <a className="promo-card" href="/eroticmassaj/stock-women">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/solyarij-1.webp" alt="" />
              <div className="pbody"><h3>Мы рады не только мужчинам</h3><p>Приятный бонус для милых дам — 10 минут в солярии бесплатно.</p><span className="dur accent">Подробнее →</span></div>
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT + INTERIOR */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head"><h2>Салон эротического массажа Podium — лучшее место для отдыха</h2><div className="line"></div></div>
          <div className="prose">
            <p>Чтобы приятно провести время, не нужно ждать подходящего момента. Сделайте это прямо сейчас в стенах салона Podium! Мужчины очень любят компанию наших потрясающих мастериц, и это неудивительно.</p>
            <p>Во-первых, у нас собраны совершенно разные типажи — любой гость найдёт здесь спутницу себе под стать. Во-вторых, все они профессионалки своего дела: обучение и опыт позволяют им находить подход даже к самому избалованному мужчине. В-третьих, они умеют не только работать руками, но и слушать — можете открыться нашим чаровницам, они сохранят все ваши секреты.</p>
            <p>Не отказывайте себе в удовольствии и проведите время так, как давно мечтали! Ну а наши мастерицы составят вам приятную компанию.</p>
          </div>
          <h3 style={{ color: '#fff', margin: '36px 0 18px', fontSize: '24px' }}>Интерьер в салоне</h3>
          <div className="gallery">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/img_9281.webp" alt="интерьер" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/img_9282.webp" alt="интерьер" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/img_9284.webp" alt="интерьер" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/img_9291.webp" alt="интерьер" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/img_9294.webp" alt="интерьер" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/img_9296.webp" alt="интерьер" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/img_9297.webp" alt="интерьер" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/img_9300.webp" alt="интерьер" />
          </div>
        </div>
      </section>

      {/* CERTIFICATES */}
      <section>
        <div className="container">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tenants/eroticmassaj/sertificates.webp" alt="сертификаты" style={{ width: '300px', maxWidth: '100%', objectFit: 'cover' }} />
            <div style={{ padding: '30px', flex: '1', minWidth: '260px' }}>
              <h2 style={{ color: '#fff', margin: '0 0 10px', fontSize: '28px' }}>Подарочные сертификаты</h2>
              <p style={{ color: 'var(--muted)', margin: '0 0 18px' }}>Приобретайте сертификат на любую сумму в наш салон — онлайн или с доставкой на дом. Идеальный подарок для близкого человека.</p>
              <a className="btn" href="/eroticmassaj/contacts">Подробнее</a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTS TEASER */}
      <section style={{ paddingTop: '0' }}>
        <div className="container">
          <div className="sec-head"><h2>Контакты</h2><div className="line"></div></div>
          <div className="contact-grid">
            <div className="cinfo">
              <div><div className="lbl">Телефон</div><div className="val acc"><a href="tel:+79120768078">+7 912 076-80-78</a></div></div>
              <div><div className="lbl">Адрес</div><div className="val">Москва, ул. Большая Молчановка 18 (м. Арбатская, м. Киевская)</div></div>
              <div><div className="lbl">Часы работы</div><div className="val">Вс—Чт · 13:00-7:00 · Пт—Сб · 24 часа</div></div>
              <div><div className="lbl">Мессенджеры</div><div className="val">Whatsapp · Telegram</div></div>
            </div>
            <div className="map-box">Москва, ул. Большая Молчановка 18<br />м. Арбатская · м. Киевская</div>
          </div>
          <div className="age-note">На сайте представлены фото/видео эротического содержания, а также информация об услугах, оказываемых лицам, достигшим 18 лет.</div>
        </div>
      </section>
    </EroticmassajShell>
  );
}
