import { EtalonShell } from '@/components/tenant-sites/etalon/EtalonShell';

export const metadata = {
  title: 'Вакансии — Etalon',
  description: 'Работа для девушек в Москве: массажистка, хостес, администратор в элитном салоне Etalon.',
};

export default function Page() {
  return (
    <EtalonShell>
      <section className="page-hero">
        <div className="wrap">
          <span className="hero-tag">Карьера</span>
          <h1>Работа для девушек <em>в Москве</em></h1>
          <p>Массажистка, хостес, администратор. Заработай себе на достойную жизнь в элитном салоне с современным интерьером.</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2 className="sec-title">Почему именно <em>мы?</em></h2>
          <div className="promo-grid">
            <div className="promo-card"><span className="tag">01</span><h3>Высокая зарплата</h3><p>150 000 – 250 000 руб. в месяц. Ежедневные выплаты в конце рабочего дня.</p></div>
            <div className="promo-card"><span className="tag">02</span><h3>Официальный салон</h3><p>Элитный салон с современным интерьером и оборудованием в центре Москвы.</p></div>
            <div className="promo-card"><span className="tag">03</span><h3>Бесплатное проживание</h3><p>В центре города, в комфортных условиях и полной безопасности.</p></div>
            <div className="promo-card"><span className="tag">04</span><h3>Свободный график</h3><p>Можно работать в любые дни и время — ты сама выбираешь смены.</p></div>
            <div className="promo-card"><span className="tag">05</span><h3>Деньги — каждый день</h3><p>Ежедневная выплата заработка в конце рабочего дня, без задержек.</p></div>
            <div className="promo-card"><span className="tag">06</span><h3>Дружный коллектив</h3><p>Берём только самых хороших девочек — атмосфера тепла и поддержки.</p></div>
          </div>
          <div className="text-block" style={{ marginTop: '50px', textAlign: 'center' }}>
            <h2>Мы ждём <em>тебя</em></h2>
            <p>Индустрия досуга и отдыха активно развивается, и салон Etalon приглашает в команду девушек, готовых зарабатывать достойно и работать в комфортных условиях. Никакого опыта не требуется — мы всему обучим.</p>
            <a href="/etalonspa/contacts" className="btn" style={{ marginTop: '14px' }}>Откликнуться</a>
          </div>
        </div>
      </section>
    </EtalonShell>
  );
}
