import { ImperiumShell } from '@/components/tenant-sites/imperiumspa/ImperiumShell';

export const metadata = {
  title: 'Эротический массаж на выезд — Imperium',
  description: 'Эротический массаж на выезд от салона «Империум» — программы от 10 000 ₽, лучшие массажистки по указанному адресу.',
};

export default function Page() {
  return (
    <ImperiumShell active="visit">
      <div className="pagehead"><div className="wrap"><h1>Эротический массаж на выезд</h1><div className="crumb">Главная / Выезд · от 10 000 ₽</div></div></div>
      <section>
        <div className="wrap">
          <div className="prose" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p>Эротический массаж с посещением на дому — отличный способ побаловать себя как в рабочие дни, так и в выходные. Салон «Империум» предлагает лучших массажисток, которые готовы приехать по указанному адресу и доставить вас на самый пик блаженства.</p>
            <p><b className="accent">В пределах ТТК</b> стоимость программы составит от 10 000 рублей. <b className="accent">За пределами ТТК</b> — от 20 000 рублей или 2 часов массажа.</p>
          </div>
          <div className="sec-head"><h2>Программы на выезд</h2></div>
          <div className="grid g4">
            <div className="pcard"><div className="pb"><h3>Тёплое начало</h3><p className="desc">Выезд массажистки по указанному адресу в любое удобное время.</p><div className="meta"><span className="price">от 10 000 ₽</span><span className="dur">60 мин</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Совместное желание</h3><p className="desc">Выезд массажистки по указанному адресу в любое удобное время.</p><div className="meta"><span className="price">от 14 000 ₽</span><span className="dur">90 мин</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Личное соединение</h3><p className="desc">Выезд массажистки по указанному адресу в любое удобное время.</p><div className="meta"><span className="price">от 18 000 ₽</span><span className="dur">90 мин</span></div></div></div>
            <div className="pcard"><div className="pb"><h3>Фирменное прикосновение</h3><p className="desc">Выезд массажистки по указанному адресу в любое удобное время.</p><div className="meta"><span className="price">от 24 000 ₽</span><span className="dur">120 мин</span></div></div></div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '36px' }}><a href="tel:+79120769173" className="btn">Заказать выезд · +7 (912) 076-91-73</a></div>
        </div>
      </section>
    </ImperiumShell>
  );
}
