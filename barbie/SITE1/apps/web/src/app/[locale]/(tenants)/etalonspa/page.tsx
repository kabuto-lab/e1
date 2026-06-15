import { asset } from '@/lib/asset';
import { EtalonShell } from '@/components/tenant-sites/etalon/EtalonShell';

export const metadata = {
  title: 'Главная — Etalon',
  description: 'Салон эротического массажа Etalon для мужчин в Москве — чувственные программы, очаровательные мастера, полная конфиденциальность, 24/7.',
};

export default function Page() {
  return (
    <EtalonShell>
      {/* HERO */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="hero-tag">Эротический массаж · Москва · 24/7</span>
            <h1>Салон <em>Etalon</em> — мир чувственных наслаждений</h1>
            <p>Где не существует запретов, и все ваши желания становятся реальностью. Профессиональные массажистки, приглушённый свет и полная конфиденциальность.</p>
            <div className="btn-row">
              <a href={asset("/etalonspa/programs")} className="btn">Записаться на массаж</a>
              <a href={asset("/etalonspa/staff")} className="btn btn-ghost">Подобрать девушку</a>
            </div>
          </div>
          <div className="hero-img">
            <img src={asset("/tenants/etalonspa/woman_croppedd.webp")} alt="Etalon" />
          </div>
        </div>
      </section>

      {/* PROMO BANNERS */}
      <section>
        <div className="wrap">
          <p className="sec-tag">Специальные предложения</p>
          <h2 className="sec-title">Акции <em>салона</em></h2>
          <div className="banners">
            <div className="banner">
              <img src={asset("/tenants/etalonspa/wine-woman.webp")} alt="Welcome Drink" />
              <div className="b-in"><h3>Welcome Drink</h3><p>Каждую среду приветственный напиток для долгожданных мужчин! Порция домашней настойки от наших красавиц при посещении салона на любую программу.</p></div>
            </div>
            <div className="banner">
              <img src={asset("/tenants/etalonspa/vip.webp")} alt="Сочная классика" />
              <div className="b-in"><h3>Сочная классика</h3><p>Скидка 45% при покупке абонемента на 10 сеансов классического массажа! Проведите время с пользой и заботой о себе.</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section style={{ background: 'var(--bg-2)' }}>
        <div className="wrap">
          <p className="sec-tag">Прайс-лист</p>
          <h2 className="sec-title">Популярные <em>программы</em></h2>
          <div className="prog-grid">
            <div className="prog-card"><h3>Искушение</h3><div className="dur">60 минут</div><p>Программа для тех, кто хочет ощутить расслабление и насладиться мастерством обольстительной массажистки.</p><div className="price">8 000 ₽</div></div>
            <div className="prog-card"><h3>Тайский Боди Массаж</h3><div className="dur">70 минут</div><p>Классическая техника телесного массажа: скольжение тела к телу подарит непередаваемые ощущения.</p><div className="price">12 000 ₽</div></div>
            <div className="prog-card"><h3>Королевство Сиам</h3><div className="dur">90 минут</div><p>Восточное путешествие в мир неги: ароматы, тёплое масло и чувственные прикосновения двух рук.</p><div className="price">15 000 ₽</div></div>
            <div className="prog-card"><h3>Сладкий персик</h3><div className="dur">75 минут</div><p>Нежная и страстная программа для истинных ценителей чувственного релакса.</p><div className="price">10 000 ₽</div></div>
            <div className="prog-card"><h3>Богиня</h3><div className="dur">60 минут</div><p>Окунитесь в атмосферу абсолютного блаженства в компании ослепительной красотки.</p><div className="price">9 000 ₽</div></div>
            <div className="prog-card"><h3>VIP Gold</h3><div className="dur">180 минут</div><p>Эксклюзивная VIP-программа: максимум внимания, времени и наслаждения без границ.</p><div className="price">30 000 ₽</div></div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}><a href={asset("/etalonspa/programs")} className="btn">Все программы</a></div>
        </div>
      </section>

      {/* MASTERS */}
      <section>
        <div className="wrap">
          <p className="sec-tag">Очаровательные</p>
          <h2 className="sec-title">Наши <em>мастера</em></h2>
          <div className="masters">
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/photo_2026-01-28_14-23-42-270x400.webp")} alt="Лана" /></div><div className="m-in"><h3>Лана, 21</h3><div className="params">Рост 165 · Вес 50 · Грудь 1</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/img_0302-1-270x400.webp")} alt="Даниэлла" /></div><div className="m-in"><h3>Даниэлла, 23</h3><div className="params">Рост 166 · Вес 51 · Грудь 1.5</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/590ded8f-3f7d-4916-926e-219517bd2055-270x400.webp")} alt="Кортни" /></div><div className="m-in"><h3>Кортни, 25</h3><div className="params">Рост 167 · Вес 56 · Грудь 3</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/photo_2026-01-20_19-05-06-270x400.webp")} alt="Агния" /></div><div className="m-in"><h3>Агния, 25</h3><div className="params">Рост 165 · Вес 48 · Грудь 3</div></div></div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}><a href={asset("/etalonspa/staff")} className="btn btn-ghost">Все мастера</a></div>
        </div>
      </section>

      {/* ABOUT */}
      <section style={{ background: 'var(--bg-2)' }}>
        <div className="wrap about">
          <img src={asset("/tenants/etalonspa/pik1-e1612159485725.webp")} alt="О салоне" />
          <div>
            <h2>О салоне эротического массажа <em>Etalon</em></h2>
            <p>Как далеко вы готовы зайти в своих эротических фантазиях? Мы рады пригласить вас на сеанс эротического массажа, где не существует запретов и все ваши мечты станут реальностью.</p>
            <p>Круглосуточный график работы салона Etalon позволит вам в удобное время получить неподдельное удовольствие и массу положительных эмоций.</p>
            <p>В нашем салоне массажистки обладают не только прекрасными внешними данными, но и в совершенстве владеют восточными и западными техниками.</p>
            <a href={asset("/etalonspa/interior")} className="btn btn-ghost" style={{ marginTop: '10px' }}>Наш интерьер</a>
          </div>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section>
        <div className="wrap">
          <p className="sec-tag">Почему Etalon</p>
          <h2 className="sec-title">Наши <em>преимущества</em></h2>
          <div className="adv-grid">
            <div className="adv"><div className="ic">🕯️</div><h4>Атмосфера</h4><p>Приглушённый свет, расслабляющая музыка и возбуждающие ароматы.</p></div>
            <div className="adv"><div className="ic">💃</div><h4>Профессионалы</h4><p>Массажистки с приятными внешними данными и безупречной техникой.</p></div>
            <div className="adv"><div className="ic">✨</div><h4>Выбор программ</h4><p>Широкий выбор эротических программ и тематических мероприятий.</p></div>
            <div className="adv"><div className="ic">🔒</div><h4>Конфиденциальность</h4><p>Полная анонимность и конфиденциальность вашего пребывания.</p></div>
          </div>
        </div>
      </section>

      {/* CONTACT STRIP */}
      <section>
        <div className="wrap">
          <div className="contact-strip">
            <h2>Записаться на массаж</h2>
            <p>Москва, ул. Чаплыгина 6 · работаем круглосуточно</p>
            <p style={{ color: '#fff', fontSize: '24px', fontWeight: 600, margin: '18px 0' }}>+7 912 076-93-01</p>
            <a href={asset("/etalonspa/contacts")} className="btn">Контакты и карта</a>
          </div>
        </div>
      </section>
    </EtalonShell>
  );
}
