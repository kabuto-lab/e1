import { ImperiumShell } from '@/components/tenant-sites/imperiumspa/ImperiumShell';

export const metadata = {
  title: 'Акции салона эротического массажа Imperium',
  description: 'Акции и специальные предложения салона эротического массажа Imperium в Москве.',
};

export default function Page() {
  return (
    <ImperiumShell active="stocks">
      <div className="pagehead">
        <div className="wrap">
          <h1>Акции</h1>
          <div className="crumb">Главная / Акции</div>
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="prose" style={{ textAlign: 'center', marginBottom: '46px' }}>
            <p>В салоне эротического массажа Imperium мы подготовили для вас акции, которые сделают вашу программу более яркой и насыщенной.</p>
          </div>
          <div className="grid g3">
            <div className="feat"><div className="ic">⏳</div><h3>+20 минут в подарок</h3><p>При заказе сауны дарим дополнительные 20 минут программы — больше времени для наслаждения.</p></div>
            <div className="feat"><div className="ic">🍷</div><h3>Сет настоек 500 ₽</h3><p>Авторские настойки собственного приготовления на выбор по специальной цене.</p></div>
            <div className="feat"><div className="ic">🔥</div><h3>Горячий Империум</h3><p>Специальное сезонное предложение на флагманские deluxe-программы салона.</p></div>
            <div className="feat"><div className="ic">💍</div><h3>Программы для пар</h3><p>Приходите вдвоём и получите особые условия на совместные сценарии.</p></div>
            <div className="feat"><div className="ic">★</div><h3>Постоянным гостям</h3><p>Индивидуальные бонусы и приятные дополнения для наших верных гостей.</p></div>
            <div className="feat"><div className="ic">📹</div><h3>Девушки в Telegram</h3><p>Наши девушки теперь в Telegram — следите за обновлениями и анонсами.</p></div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <a href="/imperiumspa/contacts" className="btn">Узнать детали акций</a>
          </div>
        </div>
      </section>
    </ImperiumShell>
  );
}
