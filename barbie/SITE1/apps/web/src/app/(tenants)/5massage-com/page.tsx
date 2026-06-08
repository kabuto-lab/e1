import { M5cShell } from '@/components/tenant-sites/m5com/M5cShell';

export const metadata = {
  title: 'Главная — 5·MASSAGE',
  description: 'Подарочные сертификаты на эротический массаж для мужчин. Четыре салона в разных районах Москвы.',
};

export default function Page() {
  return (
    <M5cShell>
      <section className="hero">
        <div className="hero-bg"><img src="/tenants/5massage-com/sexy_girls_-копия-2-scaled.webp" alt="" /></div>
        <div className="wrap hero-inner">
          <h1>Подарочные сертификаты</h1>
          <div className="sub">на эротический массаж для мужчин</div>
          <ul>
            <li>Четыре салона в разных районах Москвы</li>
            <li>Оформление сертификата на выбор: печатный или электронный</li>
            <li>Доступны сертификаты на различные номиналы и на конкретные программы</li>
          </ul>
          <a href="/5massage-com/sertifikaty" className="btn">Получить сертификат</a>
        </div>
      </section>

      <section className="blk">
        <div className="wrap">
          <div className="eyebrow">Подарок мечты</div>
          <h2 className="sec-title">Сделайте подарок мечты!</h2>
          <div className="lead">
            <p>Сертификат в один из топовых столичных салонов станет отличном презентом на любое событие. Какой мужчина откажется провести время в компании обворожительных девушек, которые еще и обеспечат незабываемый релакс?</p>
            <p>Выбирайте из множества программ! У нас есть базовые предложения, которые подойдут абсолютно любому, а также эксклюзивные услуги премиум-класса для самых ненасытных.</p>
          </div>
        </div>
      </section>

      <section className="blk" style={{ background: 'var(--bg2)' }}>
        <div className="wrap">
          <div className="eyebrow">Наши локации</div>
          <h2 className="sec-title">Наши салоны-партнеры</h2>
          <div className="salon-grid">
            <a className="salon-card" href="/5massage-com/salony">
              <div className="ph"><img src="/tenants/5massage-com/Обложка-3.webp" alt="Soho" /></div>
              <div className="body">
                <h3>Soho</h3>
                <div className="from">Москва, ул. Малый Харитоньевский переулок 9/13 с5 (м. Красне Ворота)</div>
                <span className="min">Сертификаты от 5000 ₽</span>
              </div>
            </a>
            <a className="salon-card" href="/5massage-com/salony">
              <div className="ph"><img src="/tenants/5massage-com/Обложка-1.webp" alt="Barbie" /></div>
              <div className="body">
                <h3>Barbie</h3>
                <div className="from">Москва, Каланчевская 32/58 с1 (м. Проспект Мира)</div>
                <span className="min">Сертификаты от 5001 ₽</span>
              </div>
            </a>
            <a className="salon-card" href="/5massage-com/salony">
              <div className="ph"><img src="/tenants/5massage-com/Обложка-2.webp" alt="Imperium" /></div>
              <div className="body">
                <h3>Imperium</h3>
                <div className="from">Москва, ул. Мясницкая, 41В (м. Красные ворота)</div>
                <span className="min">Сертификаты от 5000 ₽</span>
              </div>
            </a>
            <a className="salon-card" href="/5massage-com/salony">
              <div className="ph"><img src="/tenants/5massage-com/3.webp" alt="Vanilia" /></div>
              <div className="body">
                <h3>Vanilia</h3>
                <div className="from">Москва, Лучников переулок 7/4 с5 (м. Лубянка)</div>
                <span className="min">Сертификаты от 5000 ₽</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="blk">
        <div className="wrap">
          <div className="eyebrow">Программы</div>
          <h2 className="sec-title">Выбрать программу</h2>
          <p className="lead">Базовые предложения и эксклюзивные услуги премиум-класса. Ниже — избранное; полный каталог по салонам на странице «Программы».</p>
          <div className="prog-grid">
            <article className="prog-card">
              <div className="ph"><img src="/tenants/5massage-com/00018-2912855222-sexy-girl-European-appearance-long-dark-hair-curls-gray-eyes-tanned-in-a-red-evening-dress-neckline-large-breasts-thin.webp" alt="Полуночное прикосновение" loading="lazy" /></div>
              <div className="body">
                <h4>Полуночное прикосновение</h4>
                <div className="meta"><span className="price">5 000 <span className="cur">₽</span></span><span className="time">60 мин</span></div>
                <div className="desc">
                  <p><span style={{ fontWeight: 400 }}>Мягкое погружение в атмосферу Soho. Расслабляющий массаж, тепло камней и цитрусовые ароматы снимают напряжение и подготавливают тело к более глубоким ощущениям</span></p>
                  <p>В программу входят:</p>
                  <ul>
                    <li>классический массаж всего тела;</li>
                    <li>стоун-терапия;</li>
                    <li>массаж стоп горячими полотенцами;</li>
                    <li>массаж головы и лица;</li>
                    <li><span style={{ fontWeight: 400 }}>массаж горячими апельсинами</span>.</li>
                  </ul>
                </div>
              </div>
            </article>
            <article className="prog-card">
              <div className="ph"><img src="/tenants/5massage-com/00041-4015617855-Sexy-girl-brunette-brown-eyes-red-evening-dress-cleavage-tanned-big-breasts-candles-in-the-theater-back-view-big-ass.webp" alt="Быстрое желание " loading="lazy" /></div>
              <div className="body">
                <h4>Быстрое желание</h4>
                <div className="meta"><span className="price">5 000 <span className="cur">₽</span></span><span className="time">30 мин</span></div>
                <div className="desc">
                  <p><span style={{ fontWeight: 400 }}>Быстрый, яркий формат для тех, кто хочет концентрированное удовольствие без лишних пауз.</span></p>
                  <p>В программу входит:</p>
                  <ul>
                    <li>совместный душ;</li>
                    <li>нежные прикосновения к девушке;</li>
                    <li>тайский боди-массаж;</li>
                    <li>чувственный массаж Лингама.</li>
                  </ul>
                </div>
              </div>
            </article>
            <article className="prog-card">
              <div className="ph"><img src="/tenants/5massage-com/00053-3221921965-Sexy-girl-blonde-European-appearance-blue-eyes-pink-lipstick-big-breasts-pink-dress-white-bed-in-bed-doll.webp" alt="Прикосновение барби" loading="lazy" /></div>
              <div className="body">
                <h4>Прикосновение барби</h4>
                <div className="meta"><span className="price">5 000 <span className="cur">₽</span></span><span className="time">60 мин</span></div>
                <div className="desc">
                  <p><span style={{ fontWeight: 400 }}>Лёгкое и приятное погружение в атмосферу Barbie. Расслабление, тепло и эстетика прикосновений создают настроение для отдыха и удовольствия.</span></p>
                  <p>Включает в себя:</p>
                  <ul>
                    <li style={{ fontWeight: 400 }} aria-level={1}><span style={{ fontWeight: 400 }}>класс массаж всего тела;</span></li>
                    <li style={{ fontWeight: 400 }} aria-level={1}><span style={{ fontWeight: 400 }}>стоун-терапия;</span></li>
                    <li style={{ fontWeight: 400 }} aria-level={1}><span style={{ fontWeight: 400 }}>массаж стоп с горячими полотенцами;</span></li>
                    <li style={{ fontWeight: 400 }} aria-level={1}><span style={{ fontWeight: 400 }}>массаж головы и лица;</span></li>
                    <li style={{ fontWeight: 400 }} aria-level={1}><span style={{ fontWeight: 400 }}>массаж горячими апельсинами.</span></li>
                  </ul>
                </div>
              </div>
            </article>
            <article className="prog-card">
              <div className="ph"><img src="/tenants/5massage-com/00063-1672962128-Sexy-girl-blonde-European-appearance-soft-blue-eyes-pink-lipstick-big-breasts-pink-dress-white-bed-in-bed-doll.webp" alt="Розовый Экспресс " loading="lazy" /></div>
              <div className="body">
                <h4>Розовый Экспресс</h4>
                <div className="meta"><span className="price">4 500 <span className="cur">₽</span></span><span className="time">30 мин</span></div>
                <div className="desc">
                  <p><span style={{ fontWeight: 400 }}>Быстрый формат с ярким акцентом на телесный контакт. Идеально, если хочется короткого, но насыщенного удовольствия.</span></p>
                  <p>На сеансе вас ждет:</p>
                  <ul>
                    <li>совместный душ;</li>
                    <li>тайский боди-массаж;</li>
                    <li>чувственный массаж Лингама;</li>
                    <li>нежные прикосновения к девушке.</li>
                  </ul>
                </div>
              </div>
            </article>
            <article className="prog-card">
              <div className="ph"><img src="/tenants/5massage-com/00019-2869895181-Greek-goddess-sexy-girl-brown-hair-gray-eyes-white-cape-in-the-water-petals-on-the-water-back-view-hair-collected.webp" alt="Aurelius" loading="lazy" /></div>
              <div className="body">
                <h4>Aurelius</h4>
                <div className="meta"><span className="price">5 000 <span className="cur">₽</span></span><span className="time">60 мин</span></div>
                <div className="desc">
                  <p><span style={{ fontWeight: 400 }}>Глубокий расслабляющий массаж всего тела с мягким погружением в чувственную атмосферу. Тепло камней, аромат цитрусов и проработка каждой зоны позволяют полностью отпустить напряжение и перезагрузить тело.</span></p>
                  <p>Включает в себя:</p>
                  <ul>
                    <li>классический массаж всего тела;</li>
                    <li>стоун-терапия;</li>
                    <li>массаж стоп с горячими полотенцами;</li>
                    <li>массаж головы и лица;</li>
                    <li>массаж горячими апельсинами.</li>
                  </ul>
                </div>
              </div>
            </article>
            <article className="prog-card">
              <div className="ph"><img src="/tenants/5massage-com/DALL·E-2024-04-12-14.26.50-A-majestic-scene-with-a-woman-styled-as-a-Greek-goddess-and-a-man-dressed-as-a-gladiator-by-the-shore-at-sunset.-The-goddess-is-adorned-in-a-flowing-w.webp" alt="Легион " loading="lazy" /></div>
              <div className="body">
                <h4>Легион</h4>
                <div className="meta"><span className="price">5 000 <span className="cur">₽</span></span><span className="time">30 мин</span></div>
                <div className="desc">
                  <p><span style={{ fontWeight: 400 }}>Идеальный первый шаг в мир эротического массажа. Коротко, ярко и чувственно — с акцентом на телесный контакт и удовольствие.</span></p>
                  <p>Включает в себя:</p>
                  <ul>
                    <li>совместный душ;</li>
                    <li>тайский боди массаж;</li>
                    <li>массаж лингама;</li>
                    <li>нежные прикосновения;</li>
                    <li>1 расслабление.</li>
                  </ul>
                </div>
              </div>
            </article>
          </div>
          <div style={{ marginTop: 34 }}><a href="/5massage-com/programmy" className="btn btn-ghost">Все программы</a></div>
        </div>
      </section>

      <section className="blk" style={{ background: 'var(--bg2)' }}>
        <div className="wrap">
          <div className="cta-band">
            <h2>Как выглядят наши сертификаты?</h2>
            <p>Бумажный, электронный и лимитированная пластиковая карта — выбирайте формат подарка.</p>
            <a href="/5massage-com/sertifikaty" className="btn">Смотреть сертификаты</a>
          </div>
        </div>
      </section>
    </M5cShell>
  );
}
