import { ImperiumShell } from '@/components/tenant-sites/imperiumspa/ImperiumShell';

export const metadata = {
  title: 'Дополнительные услуги — Imperium',
  description: 'Дополнения к программам Imperium SPA: настойки, сауна, джакузи, кальян и смелые предложения для самых искушённых.',
};

export default function Page() {
  return (
    <ImperiumShell active="add-services">
      <div className="pagehead">
        <div className="wrap">
          <h1>Дополнительные услуги</h1>
          <div className="crumb">Главная / Доп. услуги</div>
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="prose" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p>С дополнениями вы сможете собрать собственную программу мечты! У нас есть как нежные и чувственные предложения, так и очень смелые варианты для самых искушённых.</p>
          </div>
          <div className="grid g4">
            <div className="pcard"><div className="pb"><h3>Сет настоек</h3><div className="meta"><span className="price">500 ₽</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Сауна</h3><div className="meta"><span className="price">3 000 ₽</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Джакузи</h3><div className="meta"><span className="price">3 000 ₽</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Кальян</h3><div className="meta"><span className="price">3 000 ₽</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Консумация</h3><div className="meta"><span className="price">7 000 ₽</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Клубничка</h3><div className="meta"><span className="dur">по запросу</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Веточка сакуры</h3><div className="meta"><span className="dur">по запросу</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Поцелуи по телу</h3><div className="meta"><span className="dur">по запросу</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Массаж простаты</h3><div className="meta"><span className="dur">по запросу</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Контроль окончания</h3><div className="meta"><span className="dur">по запросу</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Пип-шоу</h3><div className="meta"><span className="dur">по запросу</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Яйцо тенге</h3><div className="meta"><span className="dur">по запросу</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Фетиш</h3><div className="meta"><span className="dur">по запросу</span><span className="dur">дополнение</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Высший пилотаж</h3><div className="meta"><span className="dur">по запросу</span><span className="dur">дополнение</span></div></div></div>
          </div>
          <div className="prose" style={{ marginTop: '46px' }}>
            <p><b className="accent">Сет настоек.</b> Настойки собственного приготовления: чёрная смородина, клубника, малина, вишня-шоколад, брусника, вишня, облепиха. Выбирайте и пробуйте!</p>
            <p><b className="accent">Сауна.</b> Подготовиться к программе можно в нашей сауне — а девушки с радостью составят вам компанию. Дарим +20 минут в подарок!</p>
          </div>
        </div>
      </section>
    </ImperiumShell>
  );
}
